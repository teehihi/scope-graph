import re
from typing import Any
from app.indexing.parser import ParsedSymbol, ParsedEdge, CodeParseResult

class TypeScriptASTParser:
    """
    Lightweight, high-precision parser for TypeScript & JavaScript files (.js, .jsx, .ts, .tsx).
    Extracts functions, classes, React components, methods, export/imports, and calls
    without requiring external Node.js / heavy tree-sitter dependencies.
    """

    @staticmethod
    def parse_code(file_path: str, code: str) -> CodeParseResult:
        lang = "typescript" if file_path.endswith((".ts", ".tsx")) else "javascript"
        result = CodeParseResult(file_path=file_path, language=lang)

        lines = code.splitlines()

        # 1. Extract Imports
        # Handles:
        # import Default, { a, b as c } from 'module'
        # import * as Name from 'module'
        # import Default from 'module'
        # import { a, b } from 'module'
        # const x = require('module')
        import_stmt_regex = re.compile(r'''import\s+(.+?)\s+from\s+['"]([^'"]+)['"]''')
        require_stmt_regex = re.compile(r'''(?:const|let|var)\s+(.+?)\s*=\s*require\(['"]([^'"]+)['"]\)''')

        for line_num, line in enumerate(lines, 1):
            line_str = line.strip()
            if not line_str or line_str.startswith("//") or line_str.startswith("/*"):
                continue

            for match in import_stmt_regex.finditer(line):
                clause, target_module = match.groups()
                clause = clause.strip()
                # Check for * as alias
                star_m = re.search(r'\*\s+as\s+([$\w]+)', clause)
                if star_m:
                    star_alias = star_m.group(1)
                    result.edges.append(
                        ParsedEdge(
                            target_file_or_module=target_module,
                            edge_type="imports",
                            target_symbol=star_alias,
                            metadata={"import_type": "star", "alias": star_alias, "line": line_num}
                        )
                    )
                # Check for named { ... }
                named_m = re.search(r'\{([^}]+)\}', clause)
                if named_m:
                    for item in named_m.group(1).split(","):
                        item = item.strip()
                        if not item:
                            continue
                        if " as " in item:
                            orig, alias = item.split(" as ")
                            orig = orig.strip()
                            alias = alias.strip()
                        else:
                            orig = item
                            alias = item
                        result.edges.append(
                            ParsedEdge(
                                target_file_or_module=target_module,
                                edge_type="imports",
                                target_symbol=orig,
                                metadata={"import_type": "named", "alias": alias, "line": line_num}
                            )
                        )
                # Check for default import: clause before comma or solitary identifier
                default_clause = re.sub(r'\{[^}]+\}', '', clause)
                default_clause = re.sub(r'\*\s+as\s+[$\w]+', '', default_clause).strip().strip(',')
                if default_clause:
                    for def_item in default_clause.split(','):
                        def_item = def_item.strip()
                        if def_item and re.match(r'^[$\w]+$', def_item):
                            result.edges.append(
                                ParsedEdge(
                                    target_file_or_module=target_module,
                                    edge_type="imports",
                                    target_symbol=def_item,
                                    metadata={"import_type": "default", "alias": def_item, "line": line_num}
                                )
                            )

            for match in require_stmt_regex.finditer(line):
                clause, target_module = match.groups()
                clause = clause.strip()
                if clause.startswith('{') and clause.endswith('}'):
                    for item in clause[1:-1].split(','):
                        item = item.strip()
                        if not item:
                            continue
                        orig = item.split(':')[0].strip() if ':' in item else item
                        alias = item.split(':')[1].strip() if ':' in item else item
                        result.edges.append(
                            ParsedEdge(
                                target_file_or_module=target_module,
                                edge_type="imports",
                                target_symbol=orig,
                                metadata={"import_type": "named", "alias": alias, "line": line_num}
                            )
                        )
                elif re.match(r'^[$\w]+$', clause):
                    result.edges.append(
                        ParsedEdge(
                            target_file_or_module=target_module,
                            edge_type="imports",
                            target_symbol=clause,
                            metadata={"import_type": "default", "alias": clause, "line": line_num}
                        )
                    )

        # 2. Extract Symbols (Classes, Functions, Components)
        # Function declarations: function name(args)
        func_regex = re.compile(r'^(?:export\s+)?(?:async\s+)?function\s+([$\w]+)\s*\(([^)]*)\)')
        # Arrow function / function expression assigned to const: const MyComponent: React.FC = (...) => ...
        const_func_regex = re.compile(r'^(?:export\s+)?(?:const|let|var)\s+([$\w]+)(?:\s*:\s*[^=]+)?\s*=\s*(?:async\s*)?(?:\([^)]*\)|[$\w]+)\s*=>')
        # Class declaration: class UserService extends BaseService
        class_regex = re.compile(r'^(?:export\s+)?(?:abstract\s+)?class\s+([$\w]+)(?:\s+extends\s+([$\w]+))?')
        # Interface / Type declaration: interface UserProps / type UserId = string
        type_regex = re.compile(r'^(?:export\s+)?(?:interface|type)\s+([$\w]+)')

        for line_num, line in enumerate(lines, 1):
            line_str = line.strip()
            if not line_str or line_str.startswith("//") or line_str.startswith("/*") or line_str.startswith("*"):
                continue

            # Class
            m_cls = class_regex.match(line_str)
            if m_cls:
                cls_name = m_cls.group(1)
                super_cls = m_cls.group(2)
                result.symbols.append(
                    ParsedSymbol(
                        name=cls_name,
                        symbol_type="class",
                        line_start=line_num,
                        line_end=line_num,
                        signature=line_str[:120],
                        metadata={"super_class": super_cls} if super_cls else {}
                    )
                )
                continue

            # Function
            m_fn = func_regex.match(line_str)
            if m_fn:
                fn_name = m_fn.group(1)
                is_component = fn_name[0].isupper() and file_path.endswith((".jsx", ".tsx"))
                sym_type = "component" if is_component else "function"
                result.symbols.append(
                    ParsedSymbol(
                        name=fn_name,
                        symbol_type=sym_type,
                        line_start=line_num,
                        line_end=line_num,
                        signature=line_str[:120]
                    )
                )
                continue

            # Arrow / Const Function
            m_afn = const_func_regex.match(line_str)
            if m_afn:
                fn_name = m_afn.group(1)
                is_component = fn_name[0].isupper() and (file_path.endswith((".jsx", ".tsx")) or "FC" in line_str or "Component" in line_str)
                sym_type = "component" if is_component else "function"
                result.symbols.append(
                    ParsedSymbol(
                        name=fn_name,
                        symbol_type=sym_type,
                        line_start=line_num,
                        line_end=line_num,
                        signature=line_str[:120]
                    )
                )
                continue

            # Type / Interface
            m_type = type_regex.match(line_str)
            if m_type:
                t_name = m_type.group(1)
                result.symbols.append(
                    ParsedSymbol(
                        name=t_name,
                        symbol_type="type",
                        line_start=line_num,
                        line_end=line_num,
                        signature=line_str[:120]
                    )
                )
                continue

        # 3. Extract Calls (Function invocations: foo.bar() or baz())
        call_regex = re.compile(r'([$\w]+(?:\.[$\w]+)+)\s*\(')
        for line_num, line in enumerate(lines, 1):
            line_str = line.strip()
            if not line_str or line_str.startswith("//") or line_str.startswith("import ") or line_str.startswith("export "):
                continue

            for match in call_regex.finditer(line):
                call_target = match.group(1)
                if call_target in ("console.log", "console.error", "console.warn", "Promise.resolve", "Object.assign"):
                    continue
                result.edges.append(
                    ParsedEdge(
                        target_file_or_module="",
                        edge_type="calls",
                        target_symbol=call_target,
                        metadata={"line": line_num}
                    )
                )

        return result
