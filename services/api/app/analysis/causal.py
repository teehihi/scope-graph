"""Conservative, source-aware classification of indexed impact claims."""

from collections import defaultdict
from typing import Any

from sqlalchemy.orm import Session

from app.analysis.retriever import HybridRetriever
from app.db.models import DependencyEdge, IndexedFile, IndexedSymbol, Repository
from app.evidence.validator import EvidenceValidator


class CausalImpactVerifier:
    """Verify static support; keep uncertain conclusions visible as potential."""

    def __init__(self, db: Session):
        self.db = db

    def classify(
        self, repository_id: str, requirement: str, existence_validated: dict[str, Any],
        review_paths: list[str] | tuple[str, ...] = (),
    ) -> dict[str, Any]:
        terms = set(HybridRetriever._terms(requirement, None))
        files = {file.id: file for file in self.db.query(IndexedFile).filter_by(repository_id=repository_id)}
        symbols = {symbol.id: symbol for symbol in self.db.query(IndexedSymbol).filter_by(repository_id=repository_id)}
        edges = self.db.query(DependencyEdge).filter_by(repository_id=repository_id).all()
        calls_by_source: dict[str, list[DependencyEdge]] = defaultdict(list)
        for edge in edges:
            if edge.edge_type == "calls" and edge.source_file_id in files and edge.target_file_id in files:
                calls_by_source[files[edge.source_file_id].path].append(edge)

        supported: list[dict[str, Any]] = []
        potential: list[dict[str, Any]] = []

        def matching(value: str) -> bool:
            lower = value.lower()
            return any(term in lower for term in terms)

        def support(item: dict[str, Any], explanation: str, dependency_path: list[str]) -> dict[str, Any]:
            return {**item, "impact_supported": True, "evidence_status": "supported",
                    "support_reason": explanation, "dependency_path": dependency_path}

        def potential_item(item: dict[str, Any], explanation: str) -> dict[str, Any]:
            return {**item, "impact_supported": False, "evidence_status": "potential",
                    "impact_status": "potential", "support_reason": explanation}

        items = existence_validated["affected_items"]
        best_by_pair: dict[tuple[str, str], dict[str, Any]] = {}
        for item in items:
            key = (item["file_path"], item["impact_type"])
            current = best_by_pair.get(key)
            quality = (int(bool(item.get("evidence_snippet")))
                       + int(bool(item.get("symbol")))
                       + 2 * int(matching(item.get("symbol") or "")))
            current_quality = (int(bool(current.get("evidence_snippet")))
                               + int(bool(current.get("symbol")))
                               + 2 * int(matching(current.get("symbol") or ""))) if current else -1
            if quality > current_quality:
                best_by_pair[key] = item
        duplicates = len(items) - len(best_by_pair)
        items = list(best_by_pair.values())
        for item in items:
            if item["impact_type"] != "direct":
                continue
            symbol = item.get("symbol") or ""
            snippet = item.get("evidence_snippet") or ""
            is_test = item["file_path"].startswith("tests/") or item.get("symbol_type") == "test"
            if symbol and snippet and not is_test and matching(symbol) and matching(item.get("reason", "")):
                supported.append(support(item, "Requirement terms match an indexed source symbol and cited reason", []))
            else:
                potential.append(potential_item(item, "Direct change target is not established by indexed source evidence"))

        direct_paths = {item["file_path"] for item in supported}

        def supported_call(path: str) -> tuple[DependencyEdge, str] | None:
            for edge in calls_by_source.get(path, []):
                target = files[edge.target_file_id].path
                if target in direct_paths and edge.target_symbol_id in symbols:
                    return edge, target
            return None

        for item in items:
            if item["impact_type"] == "direct":
                continue
            call = supported_call(item["file_path"])
            if call and item.get("evidence_snippet") and matching(item.get("reason", "")):
                _, target = call
                supported.append(support(item, f"Indexed call reaches supported direct target {target}",
                                         [target, item["file_path"]]))
            else:
                potential.append(potential_item(item, "No requirement-specific call to a supported direct target was established"))

        promoted = []
        repo = self.db.query(Repository).filter_by(id=repository_id).first()
        validator = EvidenceValidator(self.db, repo.workspace_path if repo else "")
        for path in dict.fromkeys(review_paths):
            if path in direct_paths or any(item["file_path"] == path for item in supported):
                continue
            call = supported_call(path)
            if not call:
                continue
            edge, target = call
            source_symbol = symbols.get(edge.source_symbol_id)
            target_symbol = symbols[edge.target_symbol_id]
            if not source_symbol:
                continue
            candidate = validator.validate_ai_claims(repository_id, {"affected_items": [{
                "file_path": path, "symbol": source_symbol.name, "impact_type": "indirect",
                "category": "test" if path.startswith("tests/") else "module",
                "reason": f"Calls {target_symbol.name} in {target}", "confidence": 0.0,
            }]})["affected_items"]
            if not candidate or not candidate[0].get("evidence_snippet"):
                continue
            supported.append(support(candidate[0], f"Completeness review found an indexed call to {target}",
                                     [target, path]))
            promoted.append(path)

        metrics = {**existence_validated["validation_metrics"],
                   "impact_supported_claims": len(supported),
                   "potential_claims": len(potential), "duplicate_claims": duplicates,
                   "promoted_suggestions": len(promoted)}
        return {"affected_items": supported, "potential_claims": potential,
                "promoted_suggestions": promoted, "validation_metrics": metrics}
