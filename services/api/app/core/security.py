import os
import zipfile
import re
from pathlib import Path
from fastapi import HTTPException
from app.core.config import settings

def sanitize_filename(filename: str) -> str:
    """Removes path traversals and suspicious characters."""
    clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', os.path.basename(filename))
    return clean or "archive.zip"

def safe_extract_zip(zip_path: str, extract_to: str) -> list[str]:
    """
    Safely extracts a ZIP archive into `extract_to`.
    Prevents Zip-Slip vulnerability, enforces max file count, and max extraction size.
    """
    dest_path = Path(extract_to).resolve()
    dest_path.mkdir(parents=True, exist_ok=True)

    extracted_files: list[str] = []
    total_size = 0
    total_files = 0

    max_bytes = settings.MAX_EXTRACTED_SIZE_MB * 1024 * 1024
    max_files = settings.MAX_FILE_COUNT

    with zipfile.ZipFile(zip_path, 'r') as zf:
        for member in zf.infolist():
            # Security: Zip-Slip prevention
            # Resolve the target path and check that it stays within dest_path
            target_path = (dest_path / member.filename).resolve()
            if not str(target_path).startswith(str(dest_path)):
                raise HTTPException(status_code=400, detail=f"Malicious archive member detected: {member.filename}")

            if member.is_dir():
                target_path.mkdir(parents=True, exist_ok=True)
                continue

            total_files += 1
            if total_files > max_files:
                raise HTTPException(status_code=400, detail=f"Archive exceeds maximum file count ({max_files})")

            total_size += member.file_size
            if total_size > max_bytes:
                raise HTTPException(status_code=400, detail=f"Extracted archive size exceeds limit of {settings.MAX_EXTRACTED_SIZE_MB}MB")

            # Ignore hazardous filenames
            base_name = target_path.name
            if base_name.startswith("._") or "__MACOSX" in str(target_path):
                continue

            target_path.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as source, open(target_path, "wb") as target:
                # Copy in chunks
                while True:
                    chunk = source.read(65536)
                    if not chunk:
                        break
                    target.write(chunk)

            # Store path relative to dest_path
            rel = str(target_path.relative_to(dest_path))
            extracted_files.append(rel)

    return extracted_files
