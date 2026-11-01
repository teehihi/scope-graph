"""Repository keyword extraction for ASR language bias and requirement refinement."""

import re
from sqlalchemy.orm import Session
from app.db.models import IndexedFile, IndexedSymbol


def get_repo_keywords(db: Session, repository_id: str, limit: int = 50) -> list[str]:
    """
    Extracts high-signal terminology, symbol names, endpoints, and file stems
    from the indexed repository to guide voice transcription and refinement.
    """
    keywords: set[str] = set()

    # 1. Fetch prominent symbols
    symbols = (
        db.query(IndexedSymbol.name)
        .filter(IndexedSymbol.repository_id == repository_id)
        .limit(100)
        .all()
    )
    for (sym_name,) in symbols:
        keywords.add(sym_name)
        parts = re.split(r"[_\-.]", sym_name)
        for p in parts:
            if len(p) >= 3 and not p.isdigit():
                keywords.add(p.lower())

    # 2. Fetch file paths
    files = (
        db.query(IndexedFile.path)
        .filter(IndexedFile.repository_id == repository_id)
        .limit(50)
        .all()
    )
    for (fpath,) in files:
        stem = fpath.rsplit("/", 1)[-1].split(".", 1)[0]
        keywords.add(stem)
        parts = re.split(r"[_\-.]", stem)
        for p in parts:
            if len(p) >= 3 and not p.isdigit():
                keywords.add(p.lower())

    # Remove generic stop words
    stop = {"the", "and", "for", "with", "from", "import", "class", "def", "self", "none", "true", "false", "test"}
    cleaned = [k for k in sorted(keywords, key=lambda x: (-len(x), x)) if k.lower() not in stop]
    return cleaned[:limit]
