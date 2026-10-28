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

def safe_extract_zip(
    zip_path: str,
    extract_to: str,
    max_extracted_mb: int | None = None,
    max_file_count: int | None = None,
) -> list[str]:
    """
    Safely extracts a ZIP archive into `extract_to`.
    Prevents Zip-Slip vulnerability, enforces max file count, and max extraction size.
    """
    dest_path = Path(extract_to).resolve()
    dest_path.mkdir(parents=True, exist_ok=True)

    extracted_files: list[str] = []
    total_size = 0
    total_files = 0

    limit_mb = max_extracted_mb if max_extracted_mb is not None else settings.MAX_EXTRACTED_SIZE_MB
    limit_files = max_file_count if max_file_count is not None else settings.MAX_FILE_COUNT

    max_bytes = limit_mb * 1024 * 1024

    # Heavy non-code file extensions that can be safely skipped in code intelligence
    skip_extensions = {
        ".pt", ".pth", ".onnx", ".bin", ".weights", ".h5", ".pkl",
        ".mp4", ".avi", ".mov", ".mkv", ".mp3", ".wav",
        ".zip", ".tar", ".gz", ".7z", ".rar", ".iso"
    }

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

            # Ignore hazardous filenames or Mac metadata
            base_name = target_path.name
            if base_name.startswith("._") or "__MACOSX" in str(target_path):
                continue

            # Skip huge binary assets (models, videos, heavy archives) to save quota
            ext = target_path.suffix.lower()
            if ext in skip_extensions or member.file_size > 20 * 1024 * 1024:
                continue

            total_files += 1
            if total_files > limit_files:
                # Stop extracting further files when limit reached
                break

            total_size += member.file_size
            if total_size > max_bytes:
                break

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
