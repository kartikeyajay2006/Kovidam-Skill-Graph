import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List

from pypdf import PdfReader

from app.integrations.coding_platforms import fetch_all_platform_stats


URL_PATTERN = re.compile(r"https?://[^\s)>,]+")
YEARS_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)", re.IGNORECASE)


def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    pages_text: List[str] = []
    for page in reader.pages:
        pages_text.append(page.extract_text() or "")
    return "\n".join(pages_text)


def _extract_urls(text: str) -> List[str]:
    return sorted(set(URL_PATTERN.findall(text)))


def _extract_handles_and_urls(text: str) -> Dict[str, Any]:
    urls = _extract_urls(text)

    found = {
        "github_url": None,
        "github_username": None,
        "codeforces_url": None,
        "codeforces_username": None,
        "leetcode_url": None,
        "leetcode_username": None,
        "codechef_url": None,
        "codechef_username": None,
        "atcoder_url": None,
        "atcoder_username": None,
    }

    patterns = {
        "github": re.compile(r"https?://(?:www\.)?github\.com/([A-Za-z0-9-]+)", re.IGNORECASE),
        "codeforces": re.compile(r"https?://(?:www\.)?codeforces\.com/profile/([A-Za-z0-9_.-]+)", re.IGNORECASE),
        "leetcode": re.compile(r"https?://(?:www\.)?leetcode\.com/([A-Za-z0-9_-]+)", re.IGNORECASE),
        "codechef": re.compile(r"https?://(?:www\.)?codechef\.com/users/([A-Za-z0-9_-]+)", re.IGNORECASE),
        "atcoder": re.compile(r"https?://(?:www\.)?atcoder\.jp/users/([A-Za-z0-9_-]+)", re.IGNORECASE),
    }

    for url in urls:
        for platform, regex in patterns.items():
            match = regex.search(url)
            if not match:
                continue
            username = match.group(1)
            found[f"{platform}_url"] = url
            found[f"{platform}_username"] = username

    return {"urls": urls, **found}


def _extract_work_experience_years(text: str) -> str:
    matches = YEARS_PATTERN.findall(text)
    if not matches:
        return "N/A"
    max_years = max(float(x) for x in matches)
    if max_years.is_integer():
        return str(int(max_years))
    return str(max_years)


def parse_resume_and_enrich(file_path: str) -> Dict[str, Any]:
    text = extract_text_from_pdf(file_path)
    profile_data = _extract_handles_and_urls(text)

    handles = {
        "codeforces": profile_data.get("codeforces_username"),
        "leetcode": profile_data.get("leetcode_username"),
        "codechef": profile_data.get("codechef_username"),
        "atcoder": profile_data.get("atcoder_username"),
    }

    platform_stats = fetch_all_platform_stats(handles)

    return {
        "work_experience_years": _extract_work_experience_years(text),
        "profiles": profile_data,
        "platform_stats": platform_stats,
        "raw_text_preview": text[:1500],
    }


def save_extracted_data_to_json(data: Dict[str, Any], source_filename: str) -> str:
    output_dir = os.path.join(os.getcwd(), "backend", "data", "extracted_resumes")
    os.makedirs(output_dir, exist_ok=True)

    safe_name = re.sub(r"[^A-Za-z0-9_.-]", "_", source_filename) if source_filename else "resume"
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"{safe_name}_{timestamp}.json")

    payload = {
        "source_filename": source_filename,
        "saved_at_utc": datetime.utcnow().isoformat() + "Z",
        "data": data,
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return output_file
