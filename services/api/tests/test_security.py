import os
import zipfile
import pytest
from fastapi import HTTPException
from app.core.security import sanitize_filename, safe_extract_zip

def test_sanitize_filename():
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("safe_file.zip") == "safe_file.zip"
    assert sanitize_filename("archive with spaces!@#$.zip") == "archive_with_spaces____.zip"

def test_zip_slip_prevention(tmp_path):
    dest_dir = tmp_path / "dest"
    dest_dir.mkdir()

    zip_file = tmp_path / "malicious.zip"
    with zipfile.ZipFile(zip_file, "w") as zf:
        # Malicious traversal path
        zf.writestr("../../evil.txt", "malicious payload")

    with pytest.raises(HTTPException) as exc_info:
        safe_extract_zip(str(zip_file), str(dest_dir))
    assert exc_info.value.status_code == 400
    assert "Malicious archive member detected" in exc_info.value.detail
