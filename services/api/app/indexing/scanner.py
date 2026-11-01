import os
import hashlib
from pathlib import Path
from app.core.config import settings

IGNORED_DIRS = {
    ".git", "__pycache__", "node_modules", ".venv", "venv", "env",
    ".idea", ".vscode", "dist", "build", "coverage", ".pytest_cache"
}

IGNORED_EXTENSIONS = {
    ".pyc", ".pyo", ".pyd", ".so", ".dll", ".dylib", ".exe",
    ".zip", ".tar", ".gz", ".rar", ".7z", ".png", ".jpg", ".jpeg",
    ".gif", ".ico", ".svg", ".pdf", ".woff", ".woff2", ".ttf", ".eot",
    ".key", ".pem", ".crt", ".der", ".p12", ".pfx",
}

IGNORED_FILENAMES = {
    ".env", ".env.local", ".env.production", ".env.development", ".env.test",
    ".env.example", ".env.sample", ".env.stage", ".env.staging",
    "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
}

def is_sensitive_path(rel_path: str) -> bool:
    """Detect if relative path points to secrets, env files, or certificates."""
    normalized = rel_path.replace("\\", "/").lower()
    parts = normalized.split("/")
    filename = parts[-1]
    
    if filename in IGNORED_FILENAMES:
        return True
    if filename.startswith(".env.") or filename.endswith(".env"):
        return True
    
    ext = os.path.splitext(filename)[1]
    if ext in {".key", ".pem", ".crt", ".der", ".p12", ".pfx"}:
        return True
        
    for p in parts:
        if p in {".ssh", ".gnupg", ".aws", ".azure", ".kube", "secrets"}:
            return True
            
    return False

class ScannedFile:
    def __init__(self, rel_path: str, abs_path: str, size_bytes: int, sha256: str, language: str):
        self.rel_path = rel_path
        self.abs_path = abs_path
        self.size_bytes = size_bytes
        self.sha256 = sha256
        self.language = language

def get_file_language(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".py":
        return "python"
    elif ext in (".ts", ".tsx"):
        return "typescript"
    elif ext in (".js", ".jsx"):
        return "javascript"
    elif ext in (".json", ".yaml", ".yml"):
        return "config"
    elif ext in (".sql",):
        return "sql"
    elif ext in (".md", ".txt"):
        return "markdown"
    return "other"

def calculate_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def scan_workspace(root_dir: str) -> list[ScannedFile]:
    root_path = Path(root_dir).resolve()
    scanned: list[ScannedFile] = []
    file_count = 0
    max_files = settings.MAX_FILE_COUNT
    max_file_size = settings.MAX_FILE_SIZE_KB * 1024

    for dirpath, dirnames, filenames in os.walk(root_path):
        # Prune ignored directories in place
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS and not d.startswith(".")]

        for filename in filenames:
            if filename.startswith(".") or filename in IGNORED_FILENAMES:
                continue
            ext = os.path.splitext(filename)[1].lower()
            if ext in IGNORED_EXTENSIONS:
                continue

            full_path = os.path.join(dirpath, filename)
            # Prevent symlink escapes outside root_path
            try:
                resolved_file = Path(full_path).resolve()
                if not resolved_file.is_relative_to(root_path):
                    continue
            except (ValueError, OSError):
                continue
            try:
                stat = os.stat(full_path)
            except OSError:
                continue

            if stat.st_size > max_file_size:
                continue

            file_count += 1
            if file_count > max_files:
                break

            rel_path = Path(full_path).relative_to(root_path).as_posix()
            if is_sensitive_path(rel_path):
                continue
            lang = get_file_language(rel_path)
            sha = calculate_sha256(full_path)

            scanned.append(
                ScannedFile(
                    rel_path=rel_path,
                    abs_path=full_path,
                    size_bytes=stat.st_size,
                    sha256=sha,
                    language=lang,
                )
            )

        if file_count > max_files:
            break

    return scanned
