import hashlib

from app.jobs.queue import make_analysis_cache_key


def test_new_analysis_semantics_cannot_reuse_legacy_cached_report():
    repo, requirement, model = "repo", "Change email", "model"
    legacy = hashlib.sha256(f"{repo}:change email:{model}".encode()).hexdigest()
    assert make_analysis_cache_key(repo, requirement, model) != legacy
    assert make_analysis_cache_key(repo, requirement, model) == make_analysis_cache_key(
        repo, "  change   email  ", model,
    )
