import pytest
from app.services import resume_parser


def test_extract_handles_and_urls_parses_leetcode_u_profile():
    text = "LeetCode: https://leetcode.com/u/someName/"
    extracted = resume_parser._extract_handles_and_urls(text)
    assert extracted["leetcode_username"] == "someName"


def test_extract_handles_and_urls_parses_platform_profiles_without_protocol():
    text = (
        "LeetCode: leetcode.com/u/someName/ "
        "Codeforces: codeforces.com/profile/cfUser"
    )
    extracted = resume_parser._extract_handles_and_urls(text)
    assert extracted["leetcode_username"] == "someName"
    assert extracted["codeforces_username"] == "cfUser"


@pytest.mark.asyncio
async def test_parse_resume_and_enrich_uses_resume_username_and_role(monkeypatch):
    monkeypatch.setattr(
        resume_parser,
        "extract_text_from_pdf",
        lambda _: "GitHub https://github.com/octocat\nRepo https://github.com/octocat/Hello-World",
    )
    monkeypatch.setattr(
        resume_parser,
        "fetch_all_platform_stats",
        lambda _: {"codeforces": None, "leetcode": None, "codechef": None, "atcoder": None, "errors": {}},
    )

    captured = {}

    def fake_scan(text, force_username=None):
        captured["force_username"] = force_username
        return {
            "inferred_username": force_username,
            "repositories": [{"url": "https://github.com/octocat/Hello-World", "owner": "octocat", "name": "Hello-World"}],
        }

    monkeypatch.setattr(resume_parser, "scan_resume_for_github", fake_scan)
    monkeypatch.setattr(
        resume_parser,
        "analyze_github_repo_by_url",
        lambda url, username: {"project_name": "Hello-World", "target_username": username},
    )

    def fake_score(analysis, role="job"):
        captured["role"] = role
        return {"overall_contribution_score": 0.9, "evaluation_role_profile": role}

    monkeypatch.setattr(resume_parser, "score_repository", fake_score)

    result = await resume_parser.parse_resume_and_enrich(
        "resume.pdf",
        role="internship",
    )

    repo_result = result["github_analysis"]["repositories"][0]

    assert captured["force_username"] == "octocat"
    assert captured["role"] == "internship"
    assert repo_result["analysis"]["scoring"]["evaluation_role_profile"] == "internship"


@pytest.mark.asyncio
async def test_parse_resume_and_enrich_preserves_error_analysis(monkeypatch):
    monkeypatch.setattr(resume_parser, "extract_text_from_pdf", lambda _: "https://github.com/octocat")
    monkeypatch.setattr(
        resume_parser,
        "fetch_all_platform_stats",
        lambda _: {"codeforces": None, "leetcode": None, "codechef": None, "atcoder": None, "errors": {}},
    )
    monkeypatch.setattr(
        resume_parser,
        "scan_resume_for_github",
        lambda text, force_username=None: {
            "inferred_username": force_username or "octocat",
            "repositories": [{"url": "https://github.com/octocat/Hello-World", "owner": "octocat", "name": "Hello-World"}],
        },
    )
    monkeypatch.setattr(
        resume_parser,
        "analyze_github_repo_by_url",
        lambda url, username: {
            "error": "Failed to fetch repository information",
            "status_code": 404,
            "details": "Not Found",
        },
    )

    result = await resume_parser.parse_resume_and_enrich("resume.pdf")
    repo_result = result["github_analysis"]["repositories"][0]

    assert repo_result["error"] == "Failed to fetch repository information"
    assert repo_result["analysis"]["status_code"] == 404
    assert repo_result["analysis"]["details"] == "Not Found"
