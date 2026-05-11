import asyncio
import io
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List

from pypdf import PdfReader
try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None

try:
    import pdfplumber
except Exception:
    pdfplumber = None
try:
    import pytesseract
except Exception:
    pytesseract = None
try:
    from PIL import Image
except Exception:
    Image = None

from app.config import EXTRACTED_RESUMES_DIR, load_environment
from app.integrations.coding_platforms import fetch_all_platform_stats
from app.integrations.github.scanner import scan_resume_for_github
from app.integrations.github.analyzer_core import analyze_github_repo_by_url
from app.integrations.github.scorer import score_repository

load_environment()
logger = logging.getLogger("kovidam.resume_parser")


URL_PATTERN = re.compile(r"https?://[^\s)>,]+")
YEARS_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)", re.IGNORECASE)
GITHUB_REPO_CONCURRENCY = max(1, int(os.getenv("GITHUB_REPO_CONCURRENCY", "3")))
STRUCTURED_EXTRACTION_MODEL = os.getenv("RESUME_STRUCTURED_MODEL", "gpt-4o-mini")
STRUCTURED_EXTRACTION_TIMEOUT_SECONDS = float(os.getenv("RESUME_STRUCTURED_TIMEOUT_SECONDS", "20.0"))
STRUCTURED_EXTRACTION_CHUNK_TIMEOUT_SECONDS = float(
    os.getenv("RESUME_STRUCTURED_CHUNK_TIMEOUT_SECONDS", "18.0")
)
STRUCTURED_EXTRACTION_MAX_CHUNK_CHARS = int(os.getenv("RESUME_STRUCTURED_MAX_CHUNK_CHARS", "6000"))
STRUCTURED_EXTRACTION_MAX_CHUNKS = int(os.getenv("RESUME_STRUCTURED_MAX_CHUNKS", "6"))
STRUCTURED_EXTRACTION_RETRIES = max(0, int(os.getenv("RESUME_STRUCTURED_RETRIES", "1")))
OCR_MIN_ALPHA_CHARS_PER_PAGE = int(os.getenv("RESUME_OCR_MIN_ALPHA_CHARS_PER_PAGE", "50"))
PARSER_MIN_ALPHA_CHARS = int(os.getenv("RESUME_PARSER_MIN_ALPHA_CHARS", "120"))
PARSER_BULLET_RE = re.compile(r"^\s*[\-\*\u2022]\s+\S", re.MULTILINE)
PARSER_HEADING_RE = re.compile(
    r"(?im)^\s*(projects?|skills?|experience|work experience|education|certifications?|achievements?)\s*:?\s*$"
)


def _normalize_ai_ready_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = [ln.rstrip() for ln in text.split("\n")]
    # Remove mostly empty repeated lines (common headers/footers).
    freq: Dict[str, int] = {}
    for ln in lines:
        k = ln.strip().lower()
        if k:
            freq[k] = freq.get(k, 0) + 1
    cleaned_lines = []
    for ln in lines:
        key = ln.strip().lower()
        if key and freq.get(key, 0) > 4 and len(key) < 50:
            continue
        cleaned_lines.append(ln)
    return "\n".join(cleaned_lines).strip()


def _text_quality_score(text: str) -> float:
    if not text:
        return 0.0
    alpha_chars = len(re.findall(r"[A-Za-z]", text))
    bullets = len(PARSER_BULLET_RE.findall(text))
    headings = len(PARSER_HEADING_RE.findall(text))
    too_long_symbols = len(re.findall(r"[^\w\s]{3,}", text))
    score = 0.0
    score += min(alpha_chars / 2500.0, 1.0) * 0.6
    score += min(bullets / 8.0, 1.0) * 0.2
    score += min(headings / 5.0, 1.0) * 0.2
    score -= min(too_long_symbols / 30.0, 0.2)
    return max(0.0, min(score, 1.0))


def _extract_text_with_pypdf(file_path: str) -> tuple[str, list[str]]:
    reader = PdfReader(file_path)
    pages_text: List[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if '/Annots' in page:
            for annot in page['/Annots']:
                try:
                    obj = annot.get_object()
                    if '/A' in obj and '/URI' in obj['/A']:
                        text += "\n" + str(obj['/A']['/URI'])
                except Exception:
                    pass
        pages_text.append(text)
    return "\n".join(pages_text), pages_text


def _extract_text_with_pymupdf(file_path: str) -> tuple[str, list[str]]:
    if fitz is None:
        return "", []
    doc = fitz.open(file_path)
    pages: list[str] = []
    try:
        for page in doc:
            blocks = page.get_text("blocks")
            blocks_sorted = sorted(blocks, key=lambda b: (round(b[1], 1), round(b[0], 1)))
            chunks = []
            for b in blocks_sorted:
                txt = (b[4] or "").strip()
                if txt:
                    chunks.append(txt)
            pages.append("\n".join(chunks))
    finally:
        doc.close()
    return "\n".join(pages), pages


def _extract_ocr_pages_with_pymupdf(file_path: str) -> list[str]:
    if fitz is None or pytesseract is None or Image is None:
        return []
    pages: list[str] = []
    doc = fitz.open(file_path)
    try:
        for page in doc:
            text_direct = (page.get_text("text") or "").strip()
            if len(re.findall(r"[A-Za-z]", text_direct)) >= OCR_MIN_ALPHA_CHARS_PER_PAGE:
                pages.append("")
                continue
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            png_bytes = pix.tobytes("png")
            image = Image.open(io.BytesIO(png_bytes))
            ocr_text = pytesseract.image_to_string(image)
            pages.append(ocr_text or "")
    except Exception:
        return []
    finally:
        doc.close()
    return pages


def _extract_text_with_pdfplumber(file_path: str) -> tuple[str, list[str]]:
    if pdfplumber is None:
        return "", []
    pages: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(layout=True) or page.extract_text() or ""
            pages.append(text)
    return "\n".join(pages), pages


def _merge_page_texts(primary: list[str], secondary: list[str], fallback: list[str]) -> list[str]:
    n_pages = max(len(primary), len(secondary), len(fallback))
    merged: list[str] = []
    for i in range(n_pages):
        candidates = []
        if i < len(primary):
            candidates.append(primary[i])
        if i < len(secondary):
            candidates.append(secondary[i])
        if i < len(fallback):
            candidates.append(fallback[i])
        if not candidates:
            continue
        best = max(candidates, key=_text_quality_score)
        merged.append(best)
    return merged


def _extract_text_and_pages_from_pdf(file_path: str) -> tuple[str, list[str], dict]:
    py_text, py_pages = _extract_text_with_pypdf(file_path)
    mu_text, mu_pages = _extract_text_with_pymupdf(file_path)
    pl_text, pl_pages = _extract_text_with_pdfplumber(file_path)
    ocr_pages = _extract_ocr_pages_with_pymupdf(file_path)

    merged_pages = _merge_page_texts(mu_pages, pl_pages, py_pages)
    if ocr_pages:
        n_pages = max(len(merged_pages), len(ocr_pages))
        merged_with_ocr: list[str] = []
        for i in range(n_pages):
            base = merged_pages[i] if i < len(merged_pages) else ""
            ocr = ocr_pages[i] if i < len(ocr_pages) else ""
            if len(re.findall(r"[A-Za-z]", base)) < OCR_MIN_ALPHA_CHARS_PER_PAGE and ocr.strip():
                merged_with_ocr.append(ocr)
            else:
                merged_with_ocr.append(base)
        merged_pages = merged_with_ocr

    merged_text = "\n\n".join(merged_pages).strip()

    # Global fallback in case page-level merge produced weak content.
    candidates = [merged_text, mu_text, pl_text, py_text]
    best_text = max(candidates, key=_text_quality_score)
    best_text = _normalize_ai_ready_text(best_text)

    # Final safety fallback to preserve previous behavior.
    if len(re.findall(r"[A-Za-z]", best_text)) < PARSER_MIN_ALPHA_CHARS:
        final_text = _normalize_ai_ready_text(py_text)
        final_pages = py_pages
    else:
        final_text = best_text
        final_pages = merged_pages if merged_pages else py_pages

    meta = {
        "parsers_used": {
            "pymupdf": bool(mu_pages),
            "pdfplumber": bool(pl_pages),
            "pypdf": bool(py_pages),
            "ocr_pages": len([p for p in ocr_pages if p.strip()]),
        },
    }
    return final_text, final_pages, meta


def extract_text_from_pdf(file_path: str) -> str:
    text, _, _ = _extract_text_and_pages_from_pdf(file_path)
    return text


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
        "kaggle_url": None,
        "kaggle_username": None,
    }

    patterns = {
        "codeforces": re.compile(r"https?://(?:www\.)?codeforces\.com/profile/([A-Za-z0-9_.-]+)", re.IGNORECASE),
        "leetcode": re.compile(r"https?://(?:www\.)?leetcode\.com/(?:u/)?([A-Za-z0-9_-]+)/?", re.IGNORECASE),
        "codechef": re.compile(r"https?://(?:www\.)?codechef\.com/users/([A-Za-z0-9_-]+)", re.IGNORECASE),
        "atcoder": re.compile(r"https?://(?:www\.)?atcoder\.jp/users/([A-Za-z0-9_-]+)", re.IGNORECASE),
        "kaggle": re.compile(r"https?://(?:www\.)?kaggle\.com/([A-Za-z0-9_-]+)", re.IGNORECASE),
    }

    for url in urls:
        github_profile_match = re.fullmatch(
            r"https?://(?:www\.)?github\.com/([A-Za-z0-9-]+)/?",
            url,
            re.IGNORECASE,
        )
        if github_profile_match:
            found["github_url"] = url
            found["github_username"] = github_profile_match.group(1)

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


def _clean_skill_list(raw_skills: Any) -> list[str]:
    if not isinstance(raw_skills, list):
        return []
    cleaned = []
    seen = set()
    for item in raw_skills:
        skill = re.sub(r"\s+", " ", str(item or "").strip().lower())
        if not skill:
            continue
        if skill in seen:
            continue
        seen.add(skill)
        cleaned.append(skill)
    return sorted(cleaned)


def _clean_projects(raw_projects: Any) -> list[Dict[str, Any]]:
    if not isinstance(raw_projects, list):
        return []
    projects: list[Dict[str, Any]] = []
    for raw in raw_projects:
        if not isinstance(raw, dict):
            continue
        title = re.sub(r"\s+", " ", str(raw.get("title") or "").strip())
        description = re.sub(r"\s+", " ", str(raw.get("description") or "").strip())
        tech_stack = _clean_skill_list(raw.get("tech_stack") or [])
        highlights_raw = raw.get("highlights") or []
        highlights = []
        if isinstance(highlights_raw, list):
            for h in highlights_raw:
                point = re.sub(r"\s+", " ", str(h or "").strip())
                if point:
                    highlights.append(point)
        project = {
            "title": title,
            "description": description,
            "tech_stack": tech_stack,
            "highlights": highlights[:8],
        }
        if any([project["title"], project["description"], project["tech_stack"], project["highlights"]]):
            projects.append(project)
    projects.sort(key=lambda p: (p.get("title") or "", p.get("description") or ""))
    return projects


def _clean_experience(raw_experience: Any) -> list[Dict[str, Any]]:
    if not isinstance(raw_experience, list):
        return []
    experiences: list[Dict[str, Any]] = []
    for raw in raw_experience:
        if not isinstance(raw, dict):
            continue
        position = re.sub(r"\s+", " ", str(raw.get("position") or "").strip())
        company = re.sub(r"\s+", " ", str(raw.get("company") or "").strip())
        duration = re.sub(r"\s+", " ", str(raw.get("duration") or "").strip())
        description = re.sub(r"\s+", " ", str(raw.get("description") or "").strip())
        tech_stack = _clean_skill_list(raw.get("tech_stack") or [])
        experience = {
            "position": position,
            "company": company,
            "duration": duration,
            "description": description,
            "tech_stack": tech_stack,
        }
        if any([experience["position"], experience["company"], experience["description"]]):
            experiences.append(experience)
    experiences.sort(key=lambda e: (e.get("company") or "", e.get("position") or ""))
    return experiences


def _chunk_text_by_headings_or_pages(text: str, pages: list[str]) -> list[str]:
    chunks: list[str] = []
    heading_pattern = re.compile(
        r"(?im)^\s*(projects?|skills?|technical skills?|experience|work experience|education|achievements?)\s*:?\s*$"
    )
    starts = [m.start() for m in heading_pattern.finditer(text)]
    if starts:
        starts.append(len(text))
        for i in range(len(starts) - 1):
            part = text[starts[i]:starts[i + 1]].strip()
            if part:
                chunks.append(part)
    elif pages:
        chunks = [p.strip() for p in pages if p.strip()]
    else:
        chunks = [text]

    final_chunks: list[str] = []
    for c in chunks:
        if len(c) <= STRUCTURED_EXTRACTION_MAX_CHUNK_CHARS:
            final_chunks.append(c)
            continue
        for i in range(0, len(c), STRUCTURED_EXTRACTION_MAX_CHUNK_CHARS):
            piece = c[i:i + STRUCTURED_EXTRACTION_MAX_CHUNK_CHARS].strip()
            if piece:
                final_chunks.append(piece)
    return final_chunks[:STRUCTURED_EXTRACTION_MAX_CHUNKS]


def _extract_structured_from_chunk(client: Any, chunk_text: str) -> Dict[str, Any]:
    prompt = (
        "Extract structured resume data from the provided text chunk.\n"
        "Return strict JSON with this shape only:\n"
        "{"
        "\"skills\":[\"...\"],"
        "\"projects\":[{\"title\":\"...\",\"description\":\"...\",\"tech_stack\":[\"...\"],\"highlights\":[\"...\"]}],"
        "\"experience\":[{\"position\":\"...\",\"company\":\"...\",\"duration\":\"...\",\"description\":\"...\",\"tech_stack\":[\"...\"]}],"
        "\"achievements\":[{\"description\":\"...\",\"impact_score_1_to_10\": 8}]"
        "}\n"
        "Rules:\n"
        "1) Skills must be canonicalized and deduplicated. Treat equivalent variants as the same skill "
        "(example: reactjs and react should collapse to one canonical label).\n"
        "2) Do not invent skills, projects, experience, or achievements not supported by text.\n"
        "3) Keep project and experience descriptions concise and factual.\n"
        "4) tech_stack should only contain skills/tools mentioned for that project or role.\n"
        "5) For experience, extract position (e.g. 'Software Engineer', 'Intern'), company, duration (e.g. '2023-2024' or 'June 2023 - Aug 2023'), and description.\n"
        "6) For achievements, extract the raw natural language string as description. Score the achievement's impact on a scale of 1-10 (e.g. global competition win = 9-10, minor local event = 3-4). Higher scores should be given to verifiable global hackathon wins and open-source contributions.\n"
        "7) Output JSON only, no markdown.\n"
        "Text chunk:\n"
        + chunk_text
    )
    resp = client.chat.completions.create(
        model=STRUCTURED_EXTRACTION_MODEL,
        timeout=STRUCTURED_EXTRACTION_CHUNK_TIMEOUT_SECONDS,
        messages=[
            {"role": "system", "content": "You are a strict information extraction system. Output valid JSON only."},
            {"role": "user", "content": prompt},
        ],
    )
    content = (resp.choices[0].message.content or "").strip()
    start = content.find("{")
    end = content.rfind("}")
    parsed = json.loads(content[start:end + 1]) if start != -1 and end != -1 else {}
    return {
        "skills": _clean_skill_list(parsed.get("skills") or []),
        "projects": _clean_projects(parsed.get("projects") or []),
        "experience": _clean_experience(parsed.get("experience") or []),
        "achievements": parsed.get("achievements") or [],
    }


def _merge_structured_results(parts: list[Dict[str, Any]]) -> Dict[str, Any]:
    all_skills: list[str] = []
    all_projects: list[Dict[str, Any]] = []
    all_experience: list[Dict[str, Any]] = []
    all_achievements: list[Dict[str, Any]] = []
    for part in parts:
        all_skills.extend(part.get("skills") or [])
        all_projects.extend(part.get("projects") or [])
        all_experience.extend(part.get("experience") or [])
        all_achievements.extend(part.get("achievements") or [])
    skills = _clean_skill_list(all_skills)
    projects = _clean_projects(all_projects)
    experience = _clean_experience(all_experience)
    # Deduplicate achievements by description
    seen_achievements = set()
    achievements = []
    for ach in all_achievements:
        desc = str(ach.get("description", "")).strip()
        if desc and desc not in seen_achievements:
            seen_achievements.add(desc)
            achievements.append(ach)
    return {"skills": skills, "projects": projects, "experience": experience, "achievements": achievements}


def _extract_projects_from_text_fallback(text: str) -> list[Dict[str, Any]]:
    lines = [ln.strip() for ln in text.splitlines()]
    if not lines:
        return []

    heading_idx = -1
    for i, ln in enumerate(lines):
        if re.fullmatch(r"(?i)projects?", ln):
            heading_idx = i
            break
    if heading_idx == -1:
        return []

    end_idx = len(lines)
    for i in range(heading_idx + 1, len(lines)):
        if re.fullmatch(r"(?i)(additional information|education|experience|technical skills?|skills?)", lines[i]):
            end_idx = i
            break

    section = [ln for ln in lines[heading_idx + 1:end_idx] if ln]
    if not section:
        return []

    projects: list[Dict[str, Any]] = []
    i = 0
    while i < len(section):
        title = section[i]
        if len(title) > 120:
            i += 1
            continue
        next_ln = section[i + 1] if i + 1 < len(section) else ""
        highlights: list[str] = []
        j = i + 2
        while j < len(section):
            candidate = section[j]
            if re.fullmatch(r"(?i)(additional information|education|experience|technical skills?|skills?)", candidate):
                break
            if j + 1 < len(section) and len(candidate) < 90 and not re.search(r"[.!?]$", candidate):
                # Looks like next project title.
                break
            highlights.append(candidate)
            j += 1

        project = {
            "title": title,
            "description": f"{title}.",
            "tech_stack": _clean_skill_list(re.split(r"[,()/]+", next_ln)) if next_ln else [],
            "highlights": highlights[:8],
        }
        if project["highlights"]:
            project["description"] = project["highlights"][0]
        projects.append(project)
        i = max(j, i + 1)

    return _clean_projects(projects)


def _extract_skills_from_text_fallback(text: str) -> list[str]:
    lines = [ln.strip() for ln in text.splitlines()]
    if not lines:
        return []

    heading_idx = -1
    for i, ln in enumerate(lines):
        if re.fullmatch(r"(?i)(technical skills?|skills?)", ln):
            heading_idx = i
            break

    section_lines: list[str] = []
    if heading_idx != -1:
        for i in range(heading_idx + 1, len(lines)):
            if re.fullmatch(r"(?i)(projects?|education|experience|additional information|certifications?)", lines[i]):
                break
            if lines[i]:
                section_lines.append(lines[i])

    section_text = "\n".join(section_lines) if section_lines else text
    candidates = re.split(r"[\n,:/()\-]+", section_text)
    cleaned: list[str] = []
    for token in candidates:
        skill = re.sub(r"\s+", " ", token.strip().lower())
        if not skill:
            continue
        if len(skill) < 2 or len(skill) > 40:
            continue
        if not re.search(r"[a-z]", skill):
            continue
        if skill in {"technical skills", "skills", "strong", "proficient", "using", "and", "with"}:
            continue
        cleaned.append(skill)
    return _clean_skill_list(cleaned)


def _extract_experience_from_text_fallback(text: str) -> list[Dict[str, Any]]:
    lines = [ln.strip() for ln in text.splitlines()]
    if not lines:
        return []

    # Find the experience/work experience section
    heading_idx = -1
    for i, ln in enumerate(lines):
        if re.fullmatch(r"(?i)(work experience|experience|internships?|jobs?)", ln):
            heading_idx = i
            break

    if heading_idx == -1:
        return []

    end_idx = len(lines)
    for i in range(heading_idx + 1, len(lines)):
        if re.fullmatch(r"(?i)(projects?|education|skills?|technical skills?|additional information|certifications?)", lines[i]):
            end_idx = i
            break

    section = [ln for ln in lines[heading_idx + 1:end_idx] if ln]
    if not section:
        return []

    experiences: list[Dict[str, Any]] = []
    i = 0
    while i < len(section):
        line = section[i]
        # Try to parse position and company
        # Common patterns: "Position at Company", "Position, Company", etc.
        position = ""
        company = ""
        duration = ""

        # Look for patterns like "Software Engineer at TechCorp" or "Engineer, Company Name"
        if " at " in line.lower():
            parts = line.split(" at ")
            position = parts[0].strip()
            company = parts[1].strip()
        elif "," in line:
            parts = line.split(",")
            position = parts[0].strip()
            company = parts[1].strip() if len(parts) > 1 else ""

        if position or company:
            # Next line might contain duration
            next_line = section[i + 1] if i + 1 < len(section) else ""
            if next_line and re.search(r"\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec", next_line):
                duration = next_line
                description_start = i + 2
            else:
                description_start = i + 1

            # Collect description lines
            description_lines = []
            j = description_start
            while j < len(section):
                candidate = section[j]
                # Stop if we hit another job entry or section
                if len(candidate) < 100 and " at " in candidate.lower():
                    break
                if re.search(r"^\d{4}", candidate):
                    # Looks like a year/duration
                    break
                description_lines.append(candidate)
                j += 1

            description = " ".join(description_lines[:3]) if description_lines else ""

            experience = {
                "position": position,
                "company": company,
                "duration": duration,
                "description": description,
                "tech_stack": [],
            }
            if position or company or description:
                experiences.append(experience)

            i = j
        else:
            i += 1

    return _clean_experience(experiences)


def _extract_achievements_from_text_fallback(text: str) -> list[Dict[str, Any]]:
    lines = [ln.strip() for ln in text.splitlines()]
    if not lines:
        return []

    heading_idx = -1
    for i, ln in enumerate(lines):
        if re.fullmatch(r"(?i)achievements?", ln):
            heading_idx = i
            break
    if heading_idx == -1:
        return []

    end_idx = len(lines)
    for i in range(heading_idx + 1, len(lines)):
        if re.fullmatch(r"(?i)(additional information|education|experience|technical skills?|skills?|projects?)", lines[i]):
            end_idx = i
            break

    section = [ln for ln in lines[heading_idx + 1:end_idx] if ln]
    
    achievements = []
    for ln in section:
        clean_ln = ln.lstrip("•*- ").strip()
        if clean_ln and len(clean_ln) > 10:
            achievements.append({
                "description": clean_ln,
                "impact_score_1_to_10": 5  # Conservative fallback
            })
    return achievements

def _extract_structured_resume_sections_sync(text: str, pages: list[str]) -> Dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        fallback_projects = _extract_projects_from_text_fallback(text)
        fallback_skills = _extract_skills_from_text_fallback(text)
        fallback_experience = _extract_experience_from_text_fallback(text)
        fallback_achievements = _extract_achievements_from_text_fallback(text)
        return {
            "skills": fallback_skills,
            "projects": fallback_projects,
            "experience": fallback_experience,
            "achievements": fallback_achievements,
            "meta": {"provider": "none", "status": "skipped_no_api_key"},
        }
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        chunks = _chunk_text_by_headings_or_pages(text, pages)
        part_results: list[Dict[str, Any]] = []
        chunk_errors: list[str] = []
        for idx, chunk in enumerate(chunks):
            last_err = None
            for attempt in range(STRUCTURED_EXTRACTION_RETRIES + 1):
                try:
                    part_results.append(_extract_structured_from_chunk(client, chunk))
                    last_err = None
                    break
                except Exception as exc:
                    last_err = f"chunk={idx} attempt={attempt} error={exc}"
            if last_err:
                chunk_errors.append(last_err)

        merged = _merge_structured_results(part_results)
        fallback_projects = _extract_projects_from_text_fallback(text)
        if not merged["projects"] and fallback_projects:
            merged["projects"] = fallback_projects

        if fallback_projects:
            merged["skills"] = _clean_skill_list(merged["skills"] + [
                skill
                for proj in fallback_projects
                for skill in (proj.get("tech_stack") or [])
            ])
        return {
            "skills": merged["skills"],
            "projects": merged["projects"],
            "experience": merged["experience"],
            "achievements": merged["achievements"],
            "meta": {
                "provider": "openai",
                "model": STRUCTURED_EXTRACTION_MODEL,
                "status": "ok",
                "chunks_processed": len(chunks),
                "chunks_succeeded": len(part_results),
                "chunk_errors": chunk_errors[:5],
            },
        }
    except Exception as exc:
        logger.exception("structured_resume_extraction_failed")
        fallback_projects = _extract_projects_from_text_fallback(text)
        fallback_skills = _extract_skills_from_text_fallback(text)
        fallback_experience = _extract_experience_from_text_fallback(text)
        if fallback_projects:
            fallback_skills = _clean_skill_list(
                fallback_skills + [s for p in fallback_projects for s in (p.get("tech_stack") or [])]
            )
        return {
            "skills": fallback_skills,
            "projects": fallback_projects,
            "experience": fallback_experience,
            "meta": {
                "provider": "openai",
                "model": STRUCTURED_EXTRACTION_MODEL,
                "status": "error_with_fallback",
                "error": str(exc),
            },
        }


async def _extract_structured_resume_sections(text: str, pages: list[str]) -> Dict[str, Any]:
    chunks = _chunk_text_by_headings_or_pages(text, pages)
    estimated_total_timeout = max(
        STRUCTURED_EXTRACTION_TIMEOUT_SECONDS,
        (len(chunks) * (STRUCTURED_EXTRACTION_RETRIES + 1) * STRUCTURED_EXTRACTION_CHUNK_TIMEOUT_SECONDS) + 5.0,
    )
    try:
        if STRUCTURED_EXTRACTION_TIMEOUT_SECONDS <= 0:
            return await asyncio.to_thread(_extract_structured_resume_sections_sync, text, pages)
        return await asyncio.wait_for(
            asyncio.to_thread(_extract_structured_resume_sections_sync, text, pages),
            timeout=estimated_total_timeout,
        )
    except Exception as exc:
        logger.exception("structured_resume_extraction_timeout_or_error")
        fallback_projects = _extract_projects_from_text_fallback(text)
        fallback_skills = _extract_skills_from_text_fallback(text)
        fallback_experience = _extract_experience_from_text_fallback(text)
        fallback_achievements = _extract_achievements_from_text_fallback(text)
        
        if fallback_projects:
            fallback_skills = _clean_skill_list(
                fallback_skills + [s for p in fallback_projects for s in (p.get("tech_stack") or [])]
            )
            
        return {
            "skills": fallback_skills,
            "projects": fallback_projects,
            "experience": fallback_experience,
            "achievements": fallback_achievements,
            "meta": {
                "provider": "openai",
                "model": STRUCTURED_EXTRACTION_MODEL,
                "status": "timeout_or_error_with_fallback",
                "error": str(exc),
                "timeout_seconds": estimated_total_timeout,
            },
        }


async def parse_resume_and_enrich(
    file_path: str,
    role: str = "job",
) -> Dict[str, Any]:
    text, text_pages, parser_meta = await asyncio.to_thread(_extract_text_and_pages_from_pdf, file_path)
    profile_data = _extract_handles_and_urls(text)
    structured_sections = await _extract_structured_resume_sections(text, text_pages)

    handles = {
        "codeforces": profile_data.get("codeforces_username"),
        "leetcode": profile_data.get("leetcode_username"),
        "codechef": profile_data.get("codechef_username"),
        "atcoder": profile_data.get("atcoder_username"),
        "kaggle": profile_data.get("kaggle_username"),
    }

    platform_stats = await fetch_all_platform_stats(handles)

    github_scan_result = scan_resume_for_github(
        text,
        force_username=profile_data.get("github_username"),
    )

    github_repos_data = []
    inferred_username = github_scan_result.get("inferred_username")
    repo_scores_selected: List[float] = []

    async def analyze_one_repo(repo: Dict[str, Any], username: str, semaphore: asyncio.Semaphore):
        url = repo.get("url")
        async with semaphore:
            analysis = await asyncio.to_thread(analyze_github_repo_by_url, url, username)
            if "error" in analysis:
                return {
                    "repository": repo,
                    "analysis": analysis,
                    "error": analysis["error"],
                }, None

            selected_score = await asyncio.to_thread(score_repository, analysis, role)
            analysis["scoring"] = {
                "selected_role_profile": role,
                "selected": selected_score,
            }
            score_value = float(selected_score.get("overall_contribution_score_100", 0.0))
            return {
                "repository": repo,
                "analysis": analysis,
            }, score_value

    if inferred_username:
        repos = github_scan_result.get("repositories", [])
        repo_semaphore = asyncio.Semaphore(GITHUB_REPO_CONCURRENCY)
        tasks = [analyze_one_repo(repo, inferred_username, repo_semaphore) for repo in repos]
        analyzed = await asyncio.gather(*tasks, return_exceptions=True)

        for repo, result in zip(repos, analyzed):
            if isinstance(result, Exception):
                github_repos_data.append({
                    "repository": repo,
                    "analysis": {"error": str(result)},
                    "error": str(result),
                })
                continue

            payload, maybe_score = result
            github_repos_data.append(payload)
            if maybe_score is not None:
                repo_scores_selected.append(maybe_score)

    repo_count = len(github_repos_data)
    active_role_score = round(sum(repo_scores_selected) / len(repo_scores_selected), 3) if repo_scores_selected else 0.0

    return {
        "work_experience_years": _extract_work_experience_years(text),
        "profiles": profile_data,
        "skills_section": {
            "items": structured_sections.get("skills", []),
            "count": len(structured_sections.get("skills", [])),
        },
        "projects_section": {
            "items": structured_sections.get("projects", []),
            "count": len(structured_sections.get("projects", [])),
        },
        "experience_section": {
            "items": structured_sections.get("experience", []),
            "count": len(structured_sections.get("experience", [])),
        },
        "achievements_section": {
            "items": structured_sections.get("achievements", []),
            "count": len(structured_sections.get("achievements", [])),
        },
        "structured_extraction_meta": structured_sections.get("meta", {}),
        "parser_meta": parser_meta,
        "platform_stats": platform_stats,
        "github_analysis": {
            "inferred_username": inferred_username,
            "selected_role_profile": role,
            "repositories": github_repos_data,
            "summary": {
                "repo_count": repo_count,
                "overall_score_100": active_role_score,
                "overall_score_100_str": f"{active_role_score:.3f}",
            },
        },
        "raw_text_full": text,
        "raw_text_preview": text[:1500],
    }


def save_extracted_data_to_json(data: Dict[str, Any], source_filename: str) -> str:
    EXTRACTED_RESUMES_DIR.mkdir(parents=True, exist_ok=True)

    safe_name = re.sub(r"[^A-Za-z0-9_.-]", "_", source_filename) if source_filename else "resume"
    now_utc = datetime.now(timezone.utc)
    timestamp = now_utc.strftime("%Y%m%d_%H%M%S")
    output_file = EXTRACTED_RESUMES_DIR / f"{safe_name}_{timestamp}.json"

    payload = {
        "source_filename": source_filename,
        "saved_at_utc": now_utc.isoformat().replace("+00:00", "Z"),
        "data": data,
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return str(output_file)
