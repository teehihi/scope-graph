import os
import datetime
import logging
from collections import defaultdict
from sqlalchemy.orm import Session
from app.db.models import Repository, IndexedFile, IndexedSymbol, DependencyEdge
from app.indexing.scanner import scan_workspace
from app.indexing.parser import PythonASTParser, CodeParseResult

logger = logging.getLogger(__name__)

def module_to_file_path(module_name: str, file_map: dict[str, str]) -> str | None:
    """
    Attempts to match a Python module import (e.g. 'app.services.user_service')
    to an indexed file relative path (e.g. 'app/services/user_service.py').
    """
    cleaned = module_name.strip()
    if not cleaned:
        return None

    # Try exact match with .py
    candidate1 = cleaned.replace(".", "/") + ".py"
    if candidate1 in file_map:
        return candidate1

    # Try __init__.py package match
    candidate2 = cleaned.replace(".", "/") + "/__init__.py"
    if candidate2 in file_map:
        return candidate2

    # Check suffix matches
    suffix_matches = [path for path in file_map if path.endswith("/" + candidate1)]
    if len(suffix_matches) == 1:
        return suffix_matches[0]

    return None

class IndexingEngine:
    def __init__(self, db: Session):
        self.db = db

    def index_repository(self, repository_id: str) -> Repository:
        repo = self.db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            raise ValueError(f"Repository {repository_id} not found")

        workspace_path = repo.workspace_path
        if not workspace_path or not os.path.exists(workspace_path):
            repo.status = "error"
            repo.error_message = f"Workspace directory does not exist: {workspace_path}"
            self.db.commit()
            return repo

        repo.status = "indexing"
        self.db.commit()

        try:
            # 1. Clear previous index for this repository if re-indexing
            self.db.query(DependencyEdge).filter(DependencyEdge.repository_id == repository_id).delete()
            self.db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == repository_id).delete()
            self.db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).delete()
            self.db.commit()

            # 2. Scan workspace
            scanned_files = scan_workspace(workspace_path)
            if not scanned_files:
                repo.status = "ready"
                repo.indexed_at = datetime.datetime.utcnow()
                repo.stats = {
                    "file_count": 0,
                    "symbol_count": 0,
                    "edge_count": 0,
                    "languages": {},
                }
                self.db.commit()
                return repo

            # 3. Create file records
            file_records: dict[str, IndexedFile] = {}
            languages_count: dict[str, int] = {}

            for sf in scanned_files:
                f_record = IndexedFile(
                    repository_id=repository_id,
                    path=sf.rel_path,
                    language=sf.language,
                    size_bytes=sf.size_bytes,
                    sha256=sf.sha256,
                )
                self.db.add(f_record)
                file_records[sf.rel_path] = f_record
                languages_count[sf.language] = languages_count.get(sf.language, 0) + 1

            self.db.flush()

            # 4. Parse code and extract symbols and preliminary edges
            symbol_records_by_file: dict[tuple[str, str], IndexedSymbol] = {}
            exported_instances: dict[str, dict[str, str]] = {}
            raw_edges: list[tuple[IndexedFile, Any]] = []
            parse_errors: list[str] = []

            for sf in scanned_files:
                file_rec = file_records[sf.rel_path]
                if sf.language == "python":
                    try:
                        with open(sf.abs_path, "r", encoding="utf-8", errors="replace") as f:
                            code = f.read()
                        res = PythonASTParser.parse_code(sf.rel_path, code)
                        if res.errors:
                            parse_errors.extend(res.errors)

                        exported_instances[sf.rel_path] = res.exported_instances
                        # Insert symbols
                        for sym in res.symbols:
                            sym_rec = IndexedSymbol(
                                repository_id=repository_id,
                                file_id=file_rec.id,
                                name=sym.name,
                                symbol_type=sym.symbol_type,
                                line_start=sym.line_start,
                                line_end=sym.line_end,
                                signature=sym.signature,
                                docstring=sym.docstring,
                                metadata_json=sym.metadata,
                            )
                            self.db.add(sym_rec)
                            symbol_records_by_file[(sf.rel_path, sym.name)] = sym_rec

                        # Collect edges
                        for edge in res.edges:
                            raw_edges.append((file_rec, edge))

                    except Exception as e:
                        parse_errors.append(f"Failed parsing {sf.rel_path}: {str(e)}")

            self.db.flush()

            # 5. Resolve and persist dependency edges
            file_lookup = {f_path: f_rec.id for f_path, f_rec in file_records.items()}
            created_edges_count = 0

            imports_by_file: dict[str, dict[str, set[tuple[str, str | None]]]] = defaultdict(
                lambda: defaultdict(set)
            )
            for source_file_rec, raw_edge in raw_edges:
                if raw_edge.edge_type != "imports":
                    continue
                module = raw_edge.target_file_or_module
                level = raw_edge.metadata.get("level", 0)
                if level:
                    package = source_file_rec.path.removesuffix(".py").split("/")[:-1]
                    module = ".".join([*package[:len(package) - level + 1], *module.split(".")])
                target_path = module_to_file_path(module, file_lookup)
                imported_name = raw_edge.target_symbol if raw_edge.metadata.get("import_type") == "from" else None
                if imported_name:
                    child_path = module_to_file_path(f"{module}.{imported_name}", file_lookup)
                    if child_path and (not target_path or
                                       (target_path, imported_name) not in symbol_records_by_file):
                        target_path = child_path
                        imported_name = None
                if not target_path:
                    continue
                alias = raw_edge.metadata.get("alias", raw_edge.target_symbol)
                if not alias:
                    continue
                imports_by_file[source_file_rec.path][alias].add((target_path, imported_name))

            def resolve_call(source_path: str, call_name: str) -> IndexedSymbol | None:
                # A local definition has precedence over imported names. Unknown or
                # ambiguous names must not become cross-file dependency edges.
                local = symbol_records_by_file.get((source_path, call_name))
                if local:
                    return local
                parts = call_name.split(".")
                imports = imports_by_file[source_path].get(parts[0], set())
                if len(imports) != 1:
                    return None
                target_path, imported_name = next(iter(imports))
                if len(parts) == 1 and imported_name:
                    return symbol_records_by_file.get((target_path, imported_name))
                if len(parts) == 2:
                    member = parts[1]
                    if imported_name:
                        class_name = exported_instances.get(target_path, {}).get(imported_name, imported_name)
                        return symbol_records_by_file.get((target_path, f"{class_name}.{member}"))
                    return symbol_records_by_file.get((target_path, member))
                return None

            for source_file_rec, raw_edge in raw_edges:
                target_file_id = None
                target_symbol_id = None
                source_symbol_id = None

                # Locate source symbol if available
                if raw_edge.source_symbol:
                    source_symbol = symbol_records_by_file.get((source_file_rec.path, raw_edge.source_symbol))
                    source_symbol_id = source_symbol.id if source_symbol else None

                if raw_edge.edge_type == "imports":
                    # Map imported module to target file
                    alias = raw_edge.metadata.get("alias", raw_edge.target_symbol)
                    targets = imports_by_file[source_file_rec.path].get(alias, set())
                    target_path = next(iter(targets))[0] if len(targets) == 1 else None
                    if target_path and target_path != source_file_rec.path:
                        target_file_id = file_lookup[target_path]
                        target_symbol = symbol_records_by_file.get((target_path, raw_edge.target_symbol))
                        target_symbol_id = target_symbol.id if target_symbol else None

                elif raw_edge.edge_type == "calls":
                    # Locate target symbol and its defining file
                    t_sym = resolve_call(source_file_rec.path, raw_edge.target_symbol or "")
                    if t_sym:
                        target_symbol_id = t_sym.id
                        target_file_id = t_sym.file_id

                if target_file_id and target_file_id != source_file_rec.id:
                    edge_rec = DependencyEdge(
                        repository_id=repository_id,
                        source_file_id=source_file_rec.id,
                        target_file_id=target_file_id,
                        source_symbol_id=source_symbol_id,
                        target_symbol_id=target_symbol_id,
                        edge_type=raw_edge.edge_type,
                        metadata_json=raw_edge.metadata,
                    )
                    self.db.add(edge_rec)
                    created_edges_count += 1

            self.db.commit()

            # 6. Update repository stats
            symbol_count = self.db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == repository_id).count()
            edge_count = self.db.query(DependencyEdge).filter(DependencyEdge.repository_id == repository_id).count()
            endpoint_count = self.db.query(IndexedSymbol).filter(
                IndexedSymbol.repository_id == repository_id,
                IndexedSymbol.symbol_type == "endpoint"
            ).count()
            model_count = self.db.query(IndexedSymbol).filter(
                IndexedSymbol.repository_id == repository_id,
                IndexedSymbol.symbol_type == "model"
            ).count()
            test_count = self.db.query(IndexedSymbol).filter(
                IndexedSymbol.repository_id == repository_id,
                IndexedSymbol.symbol_type == "test"
            ).count()

            repo.status = "ready"
            repo.indexed_at = datetime.datetime.now(datetime.timezone.utc)
            repo.error_message = "\n".join(parse_errors) if parse_errors else None
            repo.stats = {
                "file_count": len(file_records),
                "symbol_count": symbol_count,
                "edge_count": edge_count,
                "endpoint_count": endpoint_count,
                "model_count": model_count,
                "test_count": test_count,
                "languages": languages_count,
            }
            self.db.commit()
            self.db.refresh(repo)
            return repo

        except Exception as e:
            logger.exception("Indexing failed for repository %s", repository_id)
            self.db.rollback()
            repo.status = "error"
            repo.error_message = f"Indexing failed: {str(e)}"
            self.db.commit()
            return repo
