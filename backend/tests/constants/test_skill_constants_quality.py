import re
from pathlib import Path

from app.constants.skills_aliases import SKILL_ALIASES
from app.main import _canonical_skill, _parse_csv_list, _skill_match_score


def _sample_extracted(tokens: list[str]) -> dict:
    return {
        "raw_text_preview": " ".join(tokens),
        "raw_text_full": "",
        "github_analysis": {"repositories": []},
        "skills_section": {"items": tokens},
        "projects_section": {"items": [{"tech_stack": tokens}]},
    }


def test_skill_alias_source_has_no_duplicate_keys() -> None:
    source = Path("app/constants/skills_aliases.py").read_text(encoding="utf-8")
    keys = re.findall(r'^\s*"([^"]+)"\s*:\s*"[^"]*"\s*,?\s*$', source, flags=re.M)
    seen: set[str] = set()
    dupes = sorted({k for k in keys if k in seen or seen.add(k)})
    assert not dupes, f"Duplicate skill alias keys found: {dupes}"


def test_typo_aliases_are_canonicalized() -> None:
    assert _canonical_skill("pyhon") == "python"
    assert _canonical_skill("fastap") == "fastapi"
    assert _canonical_skill("nide") == "nodejs"


def test_fastapi_implies_python_for_matching() -> None:
    extracted = _sample_extracted(["fastapi"])
    _score, matched, _missing, _evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["pyhon"],  # typo should still map to python
    )
    assert "pyhon" in matched


def test_nodejs_implies_javascript_for_matching() -> None:
    extracted = _sample_extracted(["nodejs"])
    _score, matched, _missing, _evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["javascript"],
    )
    assert "javascript" in matched


def test_alias_conflicts_are_fixed_for_tf_and_sns() -> None:
    assert SKILL_ALIASES["tf"] == "tensorflow"
    assert SKILL_ALIASES["sns"] == "seaborn"


def test_risky_short_aliases_removed() -> None:
    for risky in ("sh", "es", "wp", "rb", "rs"):
        assert risky not in SKILL_ALIASES


def test_parse_csv_list_applies_constraints_and_canonicalization() -> None:
    parsed = _parse_csv_list("fastap; pyhon | node js, backend, ,")
    assert parsed == ["fastapi", "python", "nodejs"]
