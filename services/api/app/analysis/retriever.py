"""Deterministic, repository-scoped context retrieval for impact analysis."""

import json
import re
import time
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import IndexedFile, IndexedSymbol
from app.graph.engine import GraphEngine, determine_layer


_STOP_WORDS = {
    "and", "are", "before", "for", "from", "into", "must", "only", "require",
    "should", "that", "the", "their", "then", "this", "with",
}


@dataclass
class RetrievalResult:
    items: list[dict[str, Any]]
    seed_paths: list[str]
    candidate_count: int
    latency_seconds: float


class HybridRetriever:
    """Ranks indexed evidence, then adds one-hop graph neighbors of text matches."""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _terms(query: str, search_keywords: list[str] | None) -> list[str]:
        terms: set[str] = set()
        for text in [query, *(search_keywords or [])]:
            for token in re.findall(r"[a-z][a-z0-9_]*", text.lower()):
                for part in (token, *token.split("_")):
                    if len(part) >= 3 and part not in _STOP_WORDS:
                        terms.add(part)
        return sorted(terms)

    def retrieve(
        self,
        repository_id: str,
        query: str,
        search_keywords: list[str] | None = None,
        affected_layers: list[str] | None = None,
        top_k: int = 8,
        context_token_budget: int = 3000,
    ) -> RetrievalResult:
        start = time.perf_counter()
        terms = self._terms(query, search_keywords)
        if not terms or top_k <= 0 or context_token_budget <= 0:
            return RetrievalResult([], [], 0, time.perf_counter() - start)

        files = self.db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()
        symbols = self.db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == repository_id).all()
        symbols_by_file: dict[str, list[IndexedSymbol]] = {}
        for symbol in symbols:
            symbols_by_file.setdefault(symbol.file_id, []).append(symbol)

        candidates: dict[str, dict[str, Any]] = {}
        text_matched: set[str] = set()
        requested_layers = set(affected_layers or [])
        for file in files:
            file_symbols = sorted(symbols_by_file.get(file.id, []), key=lambda s: (s.line_start or 0, s.name))
            path_lower = file.path.lower()
            score = 0
            reasons: list[str] = []
            for term in terms:
                if term in path_lower:
                    score += 5
                    reasons.append(f"path:{term}")
                for symbol in file_symbols:
                    if term in symbol.name.lower():
                        score += 8
                        reasons.append(f"symbol:{symbol.name}")
                    elif term in (symbol.signature or "").lower() or term in (symbol.docstring or "").lower():
                        score += 2
                        reasons.append(f"symbol_detail:{term}")
                    if term in json.dumps(symbol.metadata_json or {}, sort_keys=True).lower():
                        score += 3
                        reasons.append(f"symbol_metadata:{term}")
            if score <= 0:
                continue
            layer = determine_layer(file.path, file_symbols)
            if layer in requested_layers:
                score += 2
                reasons.append(f"layer:{layer}")
            text_matched.add(file.path)
            candidates[file.path] = {
                "file_id": file.id, "path": file.path, "language": file.language,
                "symbols": [
                    {"name": s.name, "type": s.symbol_type, "line": s.line_start,
                     "docstring": (s.docstring or "")[:100]}
                    for s in file_symbols
                ],
                "score": score, "reasons": list(dict.fromkeys(reasons)),
            }

        if text_matched:
            graph = GraphEngine(self.db).build_repository_graph(repository_id)
            path_to_node = {data["path"]: node for node, data in graph.nodes(data=True)}
            file_by_path = {file.path: file for file in files}
            for seed_path in sorted(text_matched):
                seed_node = path_to_node.get(seed_path)
                if seed_node is None:
                    continue
                for direction, neighbors in (
                    ("upstream", graph.successors(seed_node)),
                    ("downstream", graph.predecessors(seed_node)),
                ):
                    for node in sorted(neighbors, key=lambda n: graph.nodes[n]["path"]):
                        neighbor_path = graph.nodes[node]["path"]
                        if neighbor_path in text_matched:
                            continue
                        file = file_by_path[neighbor_path]
                        candidate = candidates.get(neighbor_path)
                        if candidate is None:
                            file_symbols = sorted(symbols_by_file.get(file.id, []),
                                                  key=lambda s: (s.line_start or 0, s.name))
                            candidate = {
                                "file_id": file.id, "path": file.path, "language": file.language,
                                "symbols": [
                                    {"name": s.name, "type": s.symbol_type, "line": s.line_start,
                                     "docstring": (s.docstring or "")[:100]}
                                    for s in file_symbols
                                ],
                                "score": 0, "reasons": [],
                            }
                            candidates[neighbor_path] = candidate
                        reason = f"graph_neighbor:{seed_path}:{direction}"
                        if reason not in candidate["reasons"]:
                            # Multiple edges or cycles must not outrank a direct text match.
                            candidate["score"] = 2
                            candidate["reasons"].append(reason)

        ranked = sorted(candidates.values(), key=lambda item: (-item["score"], item["path"]))
        selected: list[dict[str, Any]] = []
        remaining = context_token_budget
        for candidate in ranked:
            if len(selected) >= top_k:
                break
            estimated_tokens = max(1, (len(json.dumps({**candidate, "estimated_tokens": 0}, sort_keys=True)) + 3) // 4)
            while True:
                actual_estimate = (len(json.dumps({**candidate, "estimated_tokens": estimated_tokens}, sort_keys=True)) + 3) // 4
                if actual_estimate <= estimated_tokens:
                    break
                estimated_tokens = actual_estimate
            estimated_tokens += 1  # Allow for JSON list punctuation around each item.
            if estimated_tokens > remaining:
                continue
            selected.append({**candidate, "estimated_tokens": estimated_tokens})
            remaining -= estimated_tokens

        seed_paths = [item["path"] for item in selected if item["path"] in text_matched]
        return RetrievalResult(selected, seed_paths, len(candidates), time.perf_counter() - start)
