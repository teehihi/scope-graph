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
        reads_by_source: dict[str, list[DependencyEdge]] = defaultdict(list)
        for edge in edges:
            if edge.source_file_id in files and edge.target_file_id in files:
                if edge.edge_type == "calls":
                    calls_by_source[files[edge.source_file_id].path].append(edge)
                elif edge.edge_type == "reads" and symbols.get(edge.target_symbol_id, None):
                    reads_by_source[files[edge.source_file_id].path].append(edge)

        supported: list[dict[str, Any]] = []
        potential: list[dict[str, Any]] = []

        def matching(value: str) -> bool:
            lower = value.lower()
            return any(term in lower for term in terms)

        def term_hits(value: str) -> int:
            lower = value.lower()
            return sum(term in lower for term in terms)

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
            if item["impact_type"] != "direct" or item["file_path"].startswith("tests/") or item.get("symbol_type") == "test":
                continue
            symbol = item.get("symbol") or ""
            snippet = item.get("evidence_snippet") or ""
            if symbol and snippet and matching(symbol) and matching(item.get("reason", "")):
                supported.append(support(item, "Requirement terms match an indexed source symbol and cited reason", []))
            else:
                potential.append(potential_item(item, "Direct change target is not established by indexed source evidence"))

        reclassified_direct: set[str] = set()
        for item in items:
            if (item["impact_type"] == "indirect" and item.get("symbol_type") in {"function", "method", "endpoint"}
                    and not item["file_path"].startswith("tests/")
                    and item.get("evidence_snippet") and term_hits(item.get("symbol") or "") >= 2
                    and not any(candidate["file_path"] == item["file_path"] for candidate in supported)):
                corrected = {**item, "original_impact_type": "indirect", "impact_type": "direct"}
                supported.append(support(corrected, "Indexed function matches multiple requirement terms", []))
                reclassified_direct.add(item["file_path"])

        repo = self.db.query(Repository).filter_by(id=repository_id).first()
        validator = EvidenceValidator(self.db, repo.workspace_path if repo else "")
        promoted_settings: list[str] = []
        if "configur" in requirement.lower() or "setting" in requirement.lower():
            ranked_attributes = sorted(
                ((term_hits(symbol.name), symbol) for symbol in symbols.values()
                 if symbol.symbol_type == "attribute"),
                key=lambda pair: (-pair[0], files[pair[1].file_id].path, pair[1].name),
            )
            if (ranked_attributes and ranked_attributes[0][0] >= 2
                    and (len(ranked_attributes) == 1 or ranked_attributes[0][0] > ranked_attributes[1][0])):
                symbol = ranked_attributes[0][1]
                path = files[symbol.file_id].path
                if not any(item["file_path"] == path for item in supported):
                    candidate = validator.validate_ai_claims(repository_id, {"affected_items": [{
                        "file_path": path, "symbol": symbol.name, "impact_type": "direct",
                        "category": "config", "reason": requirement, "confidence": 0.0,
                    }]})["affected_items"]
                    if candidate and candidate[0].get("evidence_snippet"):
                        supported.append(support(candidate[0],
                                                 "Unique indexed setting matches multiple requirement terms", []))
                        promoted_settings.append(path)

        direct_paths = {item["file_path"] for item in supported}
        direct_symbols_by_path: dict[str, set[str]] = defaultdict(set)
        for item in supported:
            if item.get("symbol"):
                direct_symbols_by_path[item["file_path"]].add(item["symbol"])

        def supported_call(path: str) -> tuple[DependencyEdge, str] | None:
            for edge in calls_by_source.get(path, []):
                target = files[edge.target_file_id].path
                target_symbol = symbols.get(edge.target_symbol_id)
                if target in direct_paths and target_symbol and any(
                    target_symbol.name == name or target_symbol.name.startswith(name + ".")
                    for name in direct_symbols_by_path[target]
                ):
                    return edge, target
            return None

        def supported_read(path: str) -> tuple[DependencyEdge, str] | None:
            for edge in reads_by_source.get(path, []):
                target = files[edge.target_file_id].path
                target_symbol = symbols.get(edge.target_symbol_id)
                if (target in direct_paths and target_symbol and target_symbol.symbol_type == "attribute"
                        and target_symbol.name in direct_symbols_by_path[target]):
                    return edge, target
            return None

        for item in items:
            is_test_direct = item["impact_type"] == "direct" and (
                item["file_path"].startswith("tests/") or item.get("symbol_type") == "test"
            )
            if item["impact_type"] == "direct" and not is_test_direct:
                continue
            if item["impact_type"] == "indirect" and item["file_path"] in reclassified_direct:
                continue
            call = supported_call(item["file_path"]) or supported_read(item["file_path"])
            if call and item.get("evidence_snippet") and (
                matching(item.get("reason", "")) or term_hits(item.get("symbol") or "") >= 2
            ):
                edge, target = call
                corrected = ({**item, "original_impact_type": "direct", "impact_type": "indirect"}
                             if is_test_direct else item)
                explanation = (f"Indexed source reads supported setting in {target}" if edge.edge_type == "reads" else
                               f"Indexed call reaches supported direct target {target}")
                supported.append(support(corrected, explanation,
                                         [target, item["file_path"]]))
            else:
                explanation = ("Test was claimed direct but no supported downstream call was found" if is_test_direct else
                               "No requirement-specific call to a supported direct target was established")
                potential.append(potential_item(item, explanation))

        promoted = []
        for path in dict.fromkeys(review_paths):
            if path in direct_paths or any(item["file_path"] == path for item in supported):
                continue
            call = supported_call(path) or supported_read(path)
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
                "reason": f"{'Reads' if edge.edge_type == 'reads' else 'Calls'} {target_symbol.name} in {target}",
                "confidence": 0.0,
            }]})["affected_items"]
            if not candidate or not candidate[0].get("evidence_snippet"):
                continue
            relation = "read" if edge.edge_type == "reads" else "call"
            supported.append(support(candidate[0], f"Completeness review found an indexed {relation} to {target}",
                                     [target, path]))
            promoted.append(path)

        promoted_tests = []
        for path in sorted(calls_by_source):
            if not path.startswith("tests/") or any(item["file_path"] == path for item in supported):
                continue
            call = supported_call(path)
            if not call:
                continue
            edge, target = call
            source_symbol = symbols.get(edge.source_symbol_id)
            if not source_symbol or source_symbol.symbol_type != "test" or term_hits(source_symbol.name) < 2:
                continue
            candidate = validator.validate_ai_claims(repository_id, {"affected_items": [{
                "file_path": path, "symbol": source_symbol.name, "impact_type": "indirect",
                "category": "test", "reason": f"Test calls a supported target in {target}", "confidence": 0.0,
            }]})["affected_items"]
            if not candidate or not candidate[0].get("evidence_snippet"):
                continue
            supported.append(support(candidate[0], f"Indexed regression test calls supported target {target}",
                                     [target, path]))
            promoted_tests.append(path)

        promoted_reads: list[str] = []
        for path in sorted(reads_by_source):
            if any(item["file_path"] == path for item in supported):
                continue
            read = supported_read(path)
            if not read:
                continue
            edge, target = read
            source_symbol = symbols.get(edge.source_symbol_id)
            target_symbol = symbols.get(edge.target_symbol_id)
            if not source_symbol or not target_symbol:
                continue
            candidate = validator.validate_ai_claims(repository_id, {"affected_items": [{
                "file_path": path, "symbol": source_symbol.name, "impact_type": "indirect",
                "category": "module", "reason": f"Reads {target_symbol.name} in {target}", "confidence": 0.0,
            }]})["affected_items"]
            if candidate and candidate[0].get("evidence_snippet"):
                supported.append(support(candidate[0], f"Indexed source reads supported setting {target_symbol.name}",
                                         [target, path]))
                promoted_reads.append(path)

        supported = list({(item["file_path"], item["impact_type"]): item for item in supported}.values())
        supported_pairs = {(item["file_path"], item["impact_type"]) for item in supported}
        potential = [item for item in potential if (item["file_path"], item["impact_type"]) not in supported_pairs]
        metrics = {**existence_validated["validation_metrics"],
                   "impact_supported_claims": len(supported),
                   "potential_claims": len(potential), "duplicate_claims": duplicates,
                   "promoted_suggestions": len(promoted), "promoted_graph_tests": len(promoted_tests),
                   "promoted_index_settings": len(promoted_settings), "promoted_setting_reads": len(promoted_reads)}
        return {"affected_items": supported, "potential_claims": potential,
                "promoted_suggestions": promoted, "promoted_graph_tests": promoted_tests,
                "promoted_index_settings": promoted_settings, "promoted_setting_reads": promoted_reads,
                "validation_metrics": metrics}
