import ast
import os
from typing import Any

class ParsedSymbol:
    def __init__(
        self,
        name: str,
        symbol_type: str,
        line_start: int,
        line_end: int,
        signature: str | None = None,
        docstring: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        self.name = name
        self.symbol_type = symbol_type
        self.line_start = line_start
        self.line_end = line_end
        self.signature = signature
        self.docstring = docstring
        self.metadata = metadata or {}

class ParsedEdge:
    def __init__(
        self,
        target_file_or_module: str,
        edge_type: str,
        source_symbol: str | None = None,
        target_symbol: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        self.target_file_or_module = target_file_or_module
        self.edge_type = edge_type
        self.source_symbol = source_symbol
        self.target_symbol = target_symbol
        self.metadata = metadata or {}

class CodeParseResult:
    def __init__(self, file_path: str, language: str = "python"):
        self.file_path = file_path
        self.language = language
        self.symbols: list[ParsedSymbol] = []
        self.edges: list[ParsedEdge] = []
        self.errors: list[str] = []
        self.exported_instances: dict[str, str] = {}

class PythonASTParser:
    """
    Robust Python AST Parser that extracts symbols, imports, endpoints,
    database models, and function call dependencies.
    """

    @staticmethod
    def parse_code(file_path: str, code: str) -> CodeParseResult:
        result = CodeParseResult(file_path=file_path, language="python")
        try:
            tree = ast.parse(code, filename=file_path)
        except Exception as e:
            result.errors.append(f"Syntax error or parse failure: {str(e)}")
            return result

        current_class = None

        for node in tree.body:
            # Imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    result.edges.append(
                        ParsedEdge(
                            target_file_or_module=alias.name,
                            edge_type="imports",
                            target_symbol=alias.asname or alias.name,
                            metadata={"import_type": "standard", "alias": alias.asname or alias.name.split(".")[0]}
                        )
                    )
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for alias in node.names:
                    result.edges.append(
                        ParsedEdge(
                            target_file_or_module=module,
                            edge_type="imports",
                            target_symbol=alias.name,
                            metadata={"import_type": "from", "level": node.level,
                                      "alias": alias.asname or alias.name}
                        )
                    )

        local_classes = {node.name for node in tree.body if isinstance(node, ast.ClassDef)}
        for node in tree.body:
            if isinstance(node, (ast.Assign, ast.AnnAssign)):
                value = node.value
                targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                if isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id in local_classes:
                    for target in targets:
                        if isinstance(target, ast.Name):
                            result.exported_instances[target.id] = value.func.id

        # Walk body sequentially for hierarchical context
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                doc = ast.get_docstring(node)
                is_db_model = any(
                    isinstance(b, ast.Name) and b.id in ("Base", "Model", "DeclarativeBase")
                    for b in node.bases
                )
                sym_type = "model" if is_db_model else "class"
                cls_sym = ParsedSymbol(
                    name=node.name,
                    symbol_type=sym_type,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                    docstring=doc,
                    metadata={"bases": [ast.unparse(b) for b in node.bases]}
                )
                result.symbols.append(cls_sym)

                for item in node.body:
                    if isinstance(item, (ast.Assign, ast.AnnAssign)):
                        targets = item.targets if isinstance(item, ast.Assign) else [item.target]
                        for target in targets:
                            if isinstance(target, ast.Name):
                                result.symbols.append(ParsedSymbol(
                                    name=f"{node.name}.{target.id}", symbol_type="attribute",
                                    line_start=item.lineno, line_end=getattr(item, "end_lineno", item.lineno),
                                    metadata={"class": node.name},
                                ))

                # Inspect methods
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        method_doc = ast.get_docstring(item)
                        method_sym = ParsedSymbol(
                            name=f"{node.name}.{item.name}",
                            symbol_type="method",
                            line_start=item.lineno,
                            line_end=getattr(item, "end_lineno", item.lineno),
                            signature=f"def {item.name}({ast.unparse(item.args)})",
                            docstring=method_doc,
                            metadata={"class": node.name}
                        )
                        result.symbols.append(method_sym)

                        # Check for calls inside method
                        called_attributes = {
                            id(subnode.func) for subnode in ast.walk(item)
                            if isinstance(subnode, ast.Call) and isinstance(subnode.func, ast.Attribute)
                        }
                        for subnode in ast.walk(item):
                            if isinstance(subnode, ast.Call):
                                call_name = None
                                if isinstance(subnode.func, ast.Name):
                                    call_name = subnode.func.id
                                elif isinstance(subnode.func, ast.Attribute):
                                    call_name = ast.unparse(subnode.func)
                                if call_name:
                                    result.edges.append(
                                        ParsedEdge(
                                            target_file_or_module="",
                                            edge_type="calls",
                                            source_symbol=f"{node.name}.{item.name}",
                                            target_symbol=call_name,
                                        )
                                    )
                            elif (isinstance(subnode, ast.Attribute) and isinstance(subnode.ctx, ast.Load)
                                  and id(subnode) not in called_attributes):
                                result.edges.append(ParsedEdge(
                                    target_file_or_module="", edge_type="reads",
                                    source_symbol=f"{node.name}.{item.name}",
                                    target_symbol=ast.unparse(subnode),
                                ))

            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                doc = ast.get_docstring(node)
                # Check decorators for API endpoints
                is_endpoint = False
                http_method = None
                route_path = None
                for dec in node.decorator_list:
                    dec_str = ast.unparse(dec)
                    for method in ("get", "post", "put", "patch", "delete"):
                        if f".{method}" in dec_str.lower():
                            is_endpoint = True
                            http_method = method.upper()
                            # Try to extract route path from call args
                            if isinstance(dec, ast.Call) and dec.args:
                                if isinstance(dec.args[0], ast.Constant) and isinstance(dec.args[0].value, str):
                                    route_path = dec.args[0].value
                            break

                is_test = node.name.startswith("test_")
                if is_endpoint:
                    sym_type = "endpoint"
                elif is_test:
                    sym_type = "test"
                else:
                    sym_type = "function"

                fn_sym = ParsedSymbol(
                    name=node.name,
                    symbol_type=sym_type,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                    signature=f"def {node.name}({ast.unparse(node.args)})",
                    docstring=doc,
                    metadata={
                        "is_endpoint": is_endpoint,
                        "http_method": http_method,
                        "route_path": route_path,
                        "is_test": is_test,
                    }
                )
                result.symbols.append(fn_sym)

                # Calls inside function
                called_attributes = {
                    id(subnode.func) for subnode in ast.walk(node)
                    if isinstance(subnode, ast.Call) and isinstance(subnode.func, ast.Attribute)
                }
                for subnode in ast.walk(node):
                    if isinstance(subnode, ast.Call):
                        call_name = None
                        if isinstance(subnode.func, ast.Name):
                            call_name = subnode.func.id
                        elif isinstance(subnode.func, ast.Attribute):
                            call_name = ast.unparse(subnode.func)
                        if call_name:
                            result.edges.append(
                                ParsedEdge(
                                    target_file_or_module="",
                                    edge_type="calls",
                                    source_symbol=node.name,
                                    target_symbol=call_name,
                                )
                            )
                    elif (isinstance(subnode, ast.Attribute) and isinstance(subnode.ctx, ast.Load)
                          and id(subnode) not in called_attributes):
                        result.edges.append(ParsedEdge(
                            target_file_or_module="", edge_type="reads",
                            source_symbol=node.name, target_symbol=ast.unparse(subnode),
                        ))

        return result
