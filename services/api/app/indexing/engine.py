import os
import datetime
import logging
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
    for indexed_path in file_map:
        if indexed_path.endswith(candidate1) or candidate1.endswith(indexed_path):
            return indexed_path

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
            symbol_records_by_name: dict[str, IndexedSymbol] = {}
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
                            symbol_records_by_name[sym.name] = sym_rec

                        # Collect edges
                        for edge in res.edges:
                            raw_edges.append((file_rec, edge))

                    except Exception as e:
                        parse_errors.append(f"Failed parsing {sf.rel_path}: {str(e)}")

            self.db.flush()

            # 5. Resolve and persist dependency edges
            file_lookup = {f_path: f_rec.id for f_path, f_rec in file_records.items()}
            created_edges_count = 0

            for source_file_rec, raw_edge in raw_edges:
                target_file_id = None
                target_symbol_id = None
                source_symbol_id = None

                # Locate source symbol if available
                if raw_edge.source_symbol and raw_edge.source_symbol in symbol_records_by_name:
                    source_symbol_id = symbol_records_by_name[raw_edge.source_symbol].id

                if raw_edge.edge_type == "imports":
                    # Map imported module to target file
                    target_path = module_to_file_path(raw_edge.target_file_or_module, file_lookup)
                    if target_path and target_path != source_file_rec.path:
                        target_file_id = file_lookup[target_path]
                        if raw_edge.target_symbol and raw_edge.target_symbol in symbol_records_by_name:
                            target_symbol_id = symbol_records_by_name[raw_edge.target_symbol].id

                elif raw_edge.edge_type == "calls":
                    # Locate target symbol and its defining file
                    if raw_edge.target_symbol in symbol_records_by_name:
                        t_sym = symbol_records_by_name[raw_edge.target_symbol]
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
