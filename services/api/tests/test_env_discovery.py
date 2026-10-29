"""The documented backend working directory must find the repository .env."""

from pathlib import Path

from app.core import config


def test_backend_finds_project_root_env_from_services_api(tmp_path, monkeypatch):
    root = tmp_path / "project"
    backend = root / "services" / "api"
    module = backend / "app" / "core" / "config.py"
    module.parent.mkdir(parents=True)
    (root / ".env").write_text("META_AI_PROVIDER=offline_demo\n", encoding="utf-8")
    monkeypatch.setattr(config, "__file__", str(module))
    monkeypatch.chdir(backend)

    assert str(root / ".env") in config._find_env_file()
