"""Deterministic, repository-scoped context retrieval for impact analysis."""

import json
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import IndexedFile, IndexedSymbol, Repository
from app.ai.schemas import StructuredVisualIntent
from app.graph.engine import GraphEngine, determine_layer


_STOP_WORDS = {
    "add", "and", "are", "before", "change", "changes", "changing", "for", "from",
    "into", "modify", "must", "new", "only", "require", "should", "that", "the",
    "their", "then", "this", "update", "with",
}
_GENERIC_VISUAL_TERMS = {"button", "control", "field", "image", "page", "screen", "unknown", "visible"}


@dataclass
class RetrievalResult:
    items: list[dict[str, Any]]
    seed_paths: list[str]
    candidate_count: int
    latency_seconds: float
    visual_metadata: dict[str, Any] = field(default_factory=dict)


class HybridRetriever:
    """Ranks indexed evidence, then adds one-hop graph neighbors of text matches."""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _source_snippets(root: str | None, path: str, symbols: list[IndexedSymbol],
                         terms: list[str]) -> list[dict[str, Any]]:
        if not root or not symbols:
            return []
        workspace = Path(root).resolve()
        source = (workspace / path).resolve()
        try:
            source.relative_to(workspace)
        except ValueError:
            return []
        if not source.is_file():
            return []
        try:
            lines = source.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            return []
        snippets = []
        for symbol in symbols:
            if len(snippets) >= 3:
                break
            if not any(term in symbol.name.lower() or term in (symbol.signature or "").lower()
                       for term in terms):
                continue
            start = symbol.line_start or 0
            if start < 1 or start > len(lines):
                continue
            end = min(len(lines), symbol.line_end or start, start + 5)
            excerpt = []
            for index in range(start - 1, end):
                line = lines[index][:180]
                if re.search(r"\b(?:SECRET|API_KEY|PASSWORD)\w*\s*(?::[^=]+)?=\s*['\"]", line, re.I):
                    line = re.sub(r"=\s*(['\"]).*?\1", "= [REDACTED]", line)
                excerpt.append(f"{index + 1}: {line}")
            snippets.append({"symbol": symbol.name, "line_start": start,
                             "line_end": end, "text": "\n".join(excerpt)})
        return snippets

    @staticmethod
    def _terms(query: str, search_keywords: list[str] | None) -> list[str]:
        terms: set[str] = set()
        for text in [query, *(search_keywords or [])]:
            for token in re.findall(r"[a-z][a-z0-9_]*", text.lower()):
                for part in (token, *token.split("_")):
                    if len(part) >= 3 and part not in _STOP_WORDS:
                        terms.add(part)
                        if part.endswith("ing") and len(part) >= 7:
                            terms.add(part[:-3])
                        if part == "expiry":
                            terms.add("expire")
        return sorted(terms)

    @staticmethod
    def _visual_hints(query: str, visual_intent: StructuredVisualIntent | None) -> tuple[list[str], dict[str, Any]]:
        if visual_intent is None:
            return [], {}
        if not isinstance(visual_intent, StructuredVisualIntent):
            raise TypeError("visual_intent must be a StructuredVisualIntent")
        concept_text = [visual_intent.screen_type, *visual_intent.visible_elements,
                        *visual_intent.user_actions, *visual_intent.functional_concepts]
        # Visible OCR text and model paraphrases are not search instructions. Ignore path-like guesses.
        safe_concepts = [text for text in concept_text if not re.search(r"[/\\]|\.[a-z0-9]{1,5}\b", text, re.I)]
        visual_terms = set(HybridRetriever._terms(" ".join(safe_concepts), None)) - _GENERIC_VISUAL_TERMS
        requirement_terms = set(HybridRetriever._terms(query, None)) - _GENERIC_VISUAL_TERMS
        metadata: dict[str, Any] = {
            "status": "empty", "hint_terms": [], "uncertainties": list(visual_intent.uncertainties),
            "visual_candidates": 0, "visual_only_selected": 0,
        }
        if not visual_terms:
            return [], metadata
        if not requirement_terms or not visual_terms.intersection(requirement_terms):
            metadata["status"] = "unanchored"
            return [], metadata
        hints = sorted(visual_terms - requirement_terms)[:8]
        metadata["status"] = "active" if hints else "no_new_hints"
        metadata["hint_terms"] = hints
        return hints, metadata

    def retrieve(
        self,
        repository_id: str,
        query: str,
        search_keywords: list[str] | None = None,
        affected_layers: list[str] | None = None,
        top_k: int = 8,
        context_token_budget: int = 3000,
        visual_intent: StructuredVisualIntent | None = None,
    ) -> RetrievalResult:
        start = time.perf_counter()
        terms = self._terms(query, search_keywords)
        visual_terms, visual_metadata = self._visual_hints(query, visual_intent)
        if not terms or top_k <= 0 or context_token_budget <= 0:
            return RetrievalResult([], [], 0, time.perf_counter() - start, visual_metadata)

        files = self.db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()
        repo = self.db.query(Repository).filter(Repository.id == repository_id).first()
        workspace_root = repo.workspace_path if repo else None
        symbols = self.db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == repository_id).all()
        symbols_by_file: dict[str, list[IndexedSymbol]] = {}
        for symbol in symbols:
            symbols_by_file.setdefault(symbol.file_id, []).append(symbol)

        candidates: dict[str, dict[str, Any]] = {}
        text_matched: set[str] = set()
        visual_matched: set[str] = set()
        requested_layers = set(affected_layers or [])
        for file in files:
            file_symbols = sorted(symbols_by_file.get(file.id, []), key=lambda s: (s.line_start or 0, s.name))
            path_lower = file.path.lower()
            score = 0
            reasons: list[str] = []
            for term in terms:
                term_score = 0
                if term in path_lower:
                    term_score = max(term_score, 5)
                    reasons.append(f"path:{term}")
                for symbol in file_symbols:
                    if term in symbol.name.lower():
                        term_score = max(term_score, 5 if symbol.symbol_type == "attribute" else 8)
                        reasons.append(f"symbol:{symbol.name}")
                    elif term in (symbol.signature or "").lower() or term in (symbol.docstring or "").lower():
                        term_score = max(term_score, 2)
                        reasons.append(f"symbol_detail:{term}")
                    if term in json.dumps(symbol.metadata_json or {}, sort_keys=True).lower():
                        term_score = max(term_score, 3)
                        reasons.append(f"symbol_metadata:{term}")
                score += term_score
            text_score = score
            visual_score = 0
            for term in visual_terms:
                term_score = 0
                if term in path_lower:
                    term_score = max(term_score, 2)
                    reasons.append(f"visual_path:{term}")
                for symbol in file_symbols:
                    if term in symbol.name.lower():
                        term_score = max(term_score, 3)
                        reasons.append(f"visual_symbol:{symbol.name}")
                    elif term in (symbol.signature or "").lower() or term in (symbol.docstring or "").lower():
                        term_score = max(term_score, 1)
                        reasons.append(f"visual_symbol_detail:{term}")
                visual_score += term_score
            if text_score <= 0 and visual_score <= 0:
                continue
            layer = determine_layer(file.path, file_symbols)
            if text_score > 0 and layer in requested_layers:
                text_score += 2
                reasons.append(f"layer:{layer}")
            if score > 0:
                text_matched.add(file.path)
            if visual_score > 0:
                visual_matched.add(file.path)
            score = text_score * 100 + visual_score if visual_terms else text_score
            candidates[file.path] = {
                "file_id": file.id, "path": file.path, "language": file.language,
                "symbols": [
                    {"name": s.name, "type": s.symbol_type, "line": s.line_start,
                     "signature": (s.signature or "")[:160], "docstring": (s.docstring or "")[:100]}
                    for s in file_symbols
                ],
                "source_snippets": self._source_snippets(workspace_root, file.path, file_symbols, terms + visual_terms),
                "score": score, "reasons": list(dict.fromkeys(reasons)),
            }

        seed_matched = text_matched | visual_matched
        if seed_matched:
            graph = GraphEngine(self.db).build_repository_graph(repository_id)
            path_to_node = {data["path"]: node for node, data in graph.nodes(data=True)}
            file_by_path = {file.path: file for file in files}
            for seed_path in sorted(seed_matched):
                seed_node = path_to_node.get(seed_path)
                if seed_node is None:
                    continue
                for direction, neighbors in (
                    ("upstream", graph.successors(seed_node)),
                    ("downstream", graph.predecessors(seed_node)),
                ):
                    for node in sorted(neighbors, key=lambda n: graph.nodes[n]["path"]):
                        neighbor_path = graph.nodes[node]["path"]
                        if neighbor_path in seed_matched:
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
                                     "signature": (s.signature or "")[:160],
                                     "docstring": (s.docstring or "")[:100]}
                                    for s in file_symbols
                                ],
                                "source_snippets": self._source_snippets(workspace_root, file.path, file_symbols, terms + visual_terms),
                                "score": 0, "reasons": [],
                            }
                            candidates[neighbor_path] = candidate
                        reason = f"graph_neighbor:{seed_path}:{direction}"
                        if reason not in candidate["reasons"]:
                            # Graph context stays below direct text or visual matches.
                            candidate["score"] = max(
                                candidate["score"], 2 if seed_path in text_matched else 1
                            )
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

        seed_paths = [item["path"] for item in selected if item["path"] in seed_matched]
        if visual_metadata:
            visual_metadata["visual_candidates"] = len(visual_matched)
            visual_metadata["visual_only_selected"] = sum(
                item["path"] in visual_matched and item["path"] not in text_matched for item in selected
            )
            if visual_metadata["status"] == "active" and not visual_matched:
                visual_metadata["status"] = "no_index_match"
        return RetrievalResult(selected, seed_paths, len(candidates), time.perf_counter() - start, visual_metadata)
