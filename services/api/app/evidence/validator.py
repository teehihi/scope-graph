import logging
from pathlib import Path
from typing import Any
from sqlalchemy.orm import Session
from app.db.models import IndexedFile, IndexedSymbol

logger = logging.getLogger(__name__)


def _is_safe_relative_path(path: str) -> bool:
    parts = path.split("/")
    return (
        bool(path)
        and all(part not in ("", ".", "..") for part in parts)
        and ":" not in parts[0]
        and "\x00" not in path
    )


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
        self.existence_verified = is_verified_fact
        # An indexed file/symbol proves existence, not the model's impact reasoning.
        self.impact_supported = False
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
            "existence_verified": self.existence_verified,
            "impact_supported": self.impact_supported,
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
        if not self.workspace_root:
            return None
        root = Path(self.workspace_root).resolve()
        abs_path = (root / rel_path).resolve()
        try:
            abs_path.relative_to(root)
        except ValueError:
            return None
        if not abs_path.is_file():
            return None

        try:
            with abs_path.open("r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            if line_start is not None and 1 <= line_start <= len(lines):
                end = line_end if (line_end and line_start <= line_end <= len(lines)) else min(line_start + 15, len(lines))
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
        db_files = [
            f for f in self.db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()
            if _is_safe_relative_path(f.path.replace("\\", "/"))
        ]
        db_symbols = self.db.query(IndexedSymbol).filter(IndexedSymbol.repository_id == repository_id).all()

        symbols_by_file_and_name: dict[tuple[str, str], list[IndexedSymbol]] = {}
        for s in db_symbols:
            symbols_by_file_and_name.setdefault((s.file_id, s.name), []).append(s)

        raw_items = raw_impact_data.get("affected_items", [])
        verified_items: list[dict[str, Any]] = []
        rejected_hallucinations: list[dict[str, Any]] = []

        for item in raw_items:
            claimed_path = item.get("file_path")
            candidate_symbol = item.get("symbol")

            if not isinstance(claimed_path, str):
                candidate_path = ""
            else:
                candidate_path = claimed_path.strip().replace("\\", "/")

            if not _is_safe_relative_path(candidate_path):
                rejected_hallucinations.append({
                    "claimed_path": claimed_path,
                    "claimed_symbol": candidate_symbol,
                    "reason": "Invalid or empty file path"
                })
                continue

            matches = [f for f in db_files if f.path.replace("\\", "/") == candidate_path]
            if not matches:
                matches = [f for f in db_files if f.path.replace("\\", "/").endswith("/" + candidate_path)]
            if len(matches) != 1:
                rejected_hallucinations.append({
                    "claimed_path": claimed_path,
                    "claimed_symbol": candidate_symbol,
                    "reason": "Ambiguous file path" if matches else "File does not exist in indexed repository"
                })
                continue

            matched_file = matches[0]
            candidate_path = matched_file.path
            line_start = None
            line_end = None
            symbol_type = None

            if candidate_symbol is not None:
                symbol_matches = (
                    symbols_by_file_and_name.get((matched_file.id, candidate_symbol), [])
                    if isinstance(candidate_symbol, str) and candidate_symbol else []
                )
                if len(symbol_matches) != 1:
                    rejected_hallucinations.append({
                        "claimed_path": claimed_path,
                        "claimed_symbol": candidate_symbol,
                        "reason": "Symbol is missing or ambiguous in the claimed file"
                    })
                    continue
                sym_rec = symbol_matches[0]
                line_start = sym_rec.line_start
                line_end = sym_rec.line_end
                symbol_type = sym_rec.symbol_type

            snippet = self._extract_source_snippet(candidate_path, line_start, line_end)

            val_item = ValidatedImpactItem(
                file_path=candidate_path,
                symbol=candidate_symbol,
                impact_type=item.get("impact_type", "indirect"),
                category=item.get("category", "backend"),
                reason=item.get("reason", "Identified by impact reasoning engine"),
                confidence=float(item.get("confidence", 0.7)),
                is_verified_fact=True,
                evidence_snippet=snippet,
                line_start=line_start,
                line_end=line_end,
                symbol_type=symbol_type,
            )
            verified_items.append(val_item.to_dict())

        total_claims = len(verified_items) + len(rejected_hallucinations)
        grounding_score = (len(verified_items) / total_claims) if total_claims > 0 else 0.0

        return {
            "affected_items": verified_items,
            "risks": raw_impact_data.get("risks", []),
            "suggested_tests": raw_impact_data.get("suggested_tests", []),
            "assumptions": raw_impact_data.get("assumptions", []),
            "rejected_hallucinations": rejected_hallucinations,
            "validation_metrics": {
                "total_claims": total_claims,
                "verified_claims": len(verified_items),
                "existence_verified_claims": len(verified_items),
                "impact_supported_claims": 0,
                "rejected_hallucinations": len(rejected_hallucinations),
                "grounding_ratio": round(grounding_score, 2),
            }
        }
