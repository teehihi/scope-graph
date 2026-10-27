import os
import logging
from typing import Any
from sqlalchemy.orm import Session
from app.db.models import IndexedFile, IndexedSymbol, DependencyEdge

logger = logging.getLogger(__name__)

class ValidatedImpactItem:
    def __init__(
        self,
        file_path: str,
        symbol: str | None,
        impact_type: str,
        category: str,
        reason: str,
        confidence: float,
        is_verified_fact: bool,
        evidence_snippet: str | None = None,
        line_start: int | None = None,
        line_end: int | None = None,
        symbol_type: str | None = None,
    ):
        self.file_path = file_path
        self.symbol = symbol
        self.impact_type = impact_type
        self.category = category
        self.reason = reason
        self.confidence = confidence
        self.is_verified_fact = is_verified_fact
        self.evidence_snippet = evidence_snippet
        self.line_start = line_start
        self.line_end = line_end
        self.symbol_type = symbol_type

    def to_dict(self) -> dict[str, Any]:
        return {
            "file_path": self.file_path,
            "symbol": self.symbol,
            "impact_type": self.impact_type,
            "category": self.category,
            "reason": self.reason,
            "confidence": self.confidence,
            "is_verified_fact": self.is_verified_fact,
            "evidence_snippet": self.evidence_snippet,
            "line_start": self.line_start,
            "line_end": self.line_end,
            "symbol_type": self.symbol_type,
        }

class EvidenceValidator:
    def __init__(self, db: Session, workspace_root: str):
        self.db = db
        self.workspace_root = workspace_root

    def _extract_source_snippet(self, rel_path: str, line_start: int | None, line_end: int | None) -> str | None:
        if not self.workspace_root or not os.path.exists(self.workspace_root):
            return None
        abs_path = os.path.join(self.workspace_root, rel_path)
        if not os.path.exists(abs_path):
            return None

        try:
            with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            if line_start is not None and 1 <= line_start <= len(lines):
                end = line_end if (line_end and line_end <= len(lines)) else min(line_start + 15, len(lines))
                # Return snippet with line numbers
                snippet_lines = []
                for idx in range(line_start - 1, end):
                    snippet_lines.append(f"{idx + 1:4d} | {lines[idx].rstrip()}")
                return "\n".join(snippet_lines)
            else:
                # Return top preview
                preview = lines[:20]
                return "\n".join(f"{idx + 1:4d} | {line.rstrip()}" for idx, line in enumerate(preview))
        except Exception as e:
            logger.warning("Failed to extract snippet for %s: %s", rel_path, e)
            return None

    def validate_ai_claims(self, repository_id: str, raw_impact_data: dict[str, Any]) -> dict[str, Any]:
        """
        Validates every claim returned by Meta AI against the repository index.
        Disallows hallucinations, verifies symbols and files, attaches source snippets.
        """
        db_files = {f.path: f for f in self.db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()}
        db_symbols = self.db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == repository_id).all()

        # Map by (file_path, symbol_name) and by symbol_name
        symbols_by_file_and_name: dict[tuple[str, str], IndexedSymbol] = {}
        symbols_by_name: dict[str, list[IndexedSymbol]] = {}
        for s in db_symbols:
            f_rec = next((f for f in db_files.values() if f.id == s.file_id), None)
            if f_rec:
                symbols_by_file_and_name[(f_rec.path, s.name)] = s
            symbols_by_name.setdefault(s.name, []).append(s)

        raw_items = raw_impact_data.get("affected_items", [])
        verified_items: list[dict[str, Any]] = []
        rejected_hallucinations: list[dict[str, Any]] = []

        for item in raw_items:
            candidate_path = item.get("file_path", "").strip()
            candidate_symbol = item.get("symbol")

            # Check if file exists in index
            matched_file = db_files.get(candidate_path)
            if not matched_file:
                # Attempt suffix match in case model omitted leading path
                for path, f_rec in db_files.items():
                    if path.endswith(candidate_path) or candidate_path.endswith(path):
                        matched_file = f_rec
                        candidate_path = path
                        break

            if not matched_file:
                rejected_hallucinations.append({
                    "claimed_path": candidate_path,
                    "claimed_symbol": candidate_symbol,
                    "reason": "File does not exist in indexed repository"
                })
                continue

            # Check if symbol exists
            is_verified = False
            line_start = None
            line_end = None
            symbol_type = None

            if candidate_symbol:
                key = (candidate_path, candidate_symbol)
                if key in symbols_by_file_and_name:
                    sym_rec = symbols_by_file_and_name[key]
                    is_verified = True
                    line_start = sym_rec.line_start
                    line_end = sym_rec.line_end
                    symbol_type = sym_rec.symbol_type
                elif candidate_symbol in symbols_by_name:
                    sym_rec = symbols_by_name[candidate_symbol][0]
                    is_verified = True
                    line_start = sym_rec.line_start
                    line_end = sym_rec.line_end
                    symbol_type = sym_rec.symbol_type
            else:
                # File itself exists
                is_verified = True

            snippet = self._extract_source_snippet(candidate_path, line_start, line_end)

            val_item = ValidatedImpactItem(
                file_path=candidate_path,
                symbol=candidate_symbol,
                impact_type=item.get("impact_type", "indirect"),
                category=item.get("category", "backend"),
                reason=item.get("reason", "Identified by impact reasoning engine"),
                confidence=float(item.get("confidence", 0.7)),
                is_verified_fact=is_verified,
                evidence_snippet=snippet,
                line_start=line_start,
                line_end=line_end,
                symbol_type=symbol_type,
            )
            verified_items.append(val_item.to_dict())

        total_claims = len(verified_items) + len(rejected_hallucinations)
        grounding_score = (len(verified_items) / total_claims) if total_claims > 0 else 1.0

        return {
            "affected_items": verified_items,
            "risks": raw_impact_data.get("risks", []),
            "suggested_tests": raw_impact_data.get("suggested_tests", []),
            "assumptions": raw_impact_data.get("assumptions", []),
            "rejected_hallucinations": rejected_hallucinations,
            "validation_metrics": {
                "total_claims": total_claims,
                "verified_claims": len(verified_items),
                "rejected_hallucinations": len(rejected_hallucinations),
                "grounding_ratio": round(grounding_score, 2),
            }
        }
