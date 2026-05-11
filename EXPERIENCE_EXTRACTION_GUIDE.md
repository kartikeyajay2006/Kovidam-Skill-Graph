# Experience Extraction Feature - Implementation Guide

## Overview
The resume parser has been enhanced to extract **experience/internships/jobs** sections from resumes, in addition to the existing skills and projects extraction.

## Changes Made

### 1. **Updated Extraction Prompt** (`_extract_structured_from_chunk`)
The OpenAI API prompt now requests structured experience data with the following format:
```json
{
  "skills": ["..."],
  "projects": [{...}],
  "experience": [{
    "position": "Software Engineer",
    "company": "Tech Corp",
    "duration": "2023-2024",
    "description": "Developed backend services",
    "tech_stack": ["Python", "FastAPI"]
  }]
}
```

### 2. **New Function: `_clean_experience()`**
- Validates and cleans experience data from LLM extraction
- Removes empty or invalid entries
- Deduplicates and canonicalizes tech stacks
- Sorts by company name and position

### 3. **New Function: `_extract_experience_from_text_fallback()`**
Fallback extraction when API is unavailable. Looks for:
- "Work Experience", "Experience", "Internships", "Jobs" sections
- Patterns like "Position at Company" or "Position, Company"
- Duration information (years, month-year ranges)
- Description lines following the position entry

### 4. **Updated Merge Function**
`_merge_structured_results()` now:
- Collects experience from all chunks
- Deduplicates across chunks
- Returns merged experience data

### 5. **Updated Resume Parser Output**
The `parse_resume_and_enrich()` function now returns:
```json
{
  "work_experience_years": "N/A",
  "profiles": {...},
  "skills_section": {
    "items": [...],
    "count": 24
  },
  "projects_section": {
    "items": [...],
    "count": 1
  },
  "experience_section": {
    "items": [
      {
        "position": "Software Engineer",
        "company": "Tech Corp",
        "duration": "June 2023 - August 2024",
        "description": "Led development of microservices...",
        "tech_stack": ["Python", "FastAPI", "PostgreSQL"]
      }
    ],
    "count": 1
  },
  "structured_extraction_meta": {...},
  "parser_meta": {...}
}
```

## Usage

### In Python Code
```python
from app.services.resume_parser import parse_resume_and_enrich
import asyncio

async def extract_resume():
    result = await parse_resume_and_enrich("/path/to/resume.pdf", "internship")
    
    # Access experience section
    experience = result.get("experience_section", {})
    for job in experience.get("items", []):
        print(f"{job['position']} at {job['company']}")
        print(f"  Duration: {job['duration']}")
        print(f"  Tech Stack: {', '.join(job['tech_stack'])}")

asyncio.run(extract_resume())
```

### JSON Output Structure
```json
{
  "experience_section": {
    "items": [
      {
        "position": "string (job title)",
        "company": "string (company name)",
        "duration": "string (e.g., '2023-2024' or 'June 2023 - Aug 2023')",
        "description": "string (job description)",
        "tech_stack": ["list", "of", "technologies"]
      }
    ],
    "count": 1
  }
}
```

## Supported Formats

The parser recognizes experience sections with headers:
- "Work Experience"
- "Experience"
- "Internships"
- "Jobs"

And supports common formats:
- **Position at Company**: `Software Engineer at TechCorp`
- **Position, Company**: `Backend Developer, StartupXYZ`
- Duration lines: `June 2023 - August 2024` or `2023-2024`
- Description: Lines following the position/company entry

## Fallback Behavior

If OpenAI API key is not configured or extraction fails:
1. The system uses `_extract_experience_from_text_fallback()`
2. Manually parses the resume text for experience sections
3. Returns best-effort extraction results
4. Status in metadata will show "skipped_no_api_key" or "error_with_fallback"

## Integration with Existing Code

The experience extraction is fully integrated with:
- Profile extraction (URLs, GitHub, LinkedIn, etc.)
- Skills extraction
- Projects extraction
- Platform stats (CodeForces, LeetCode, etc.)
- GitHub analysis

All happen in the same `parse_resume_and_enrich()` function call.

## Error Handling

The system gracefully handles:
- Resumes without experience sections (returns empty array)
- Malformed experience entries (filters them out)
- API failures (falls back to text parsing)
- Missing tech stacks (returns empty array)

## Testing

To test with your own resumes:
```bash
cd /home/varunpatil/Desktop/kovidam-test/Kovidam-Skill-Graph
python test_experience_extraction.py  # Run after providing PDF files
```

## Example Output for Varun's Resume

Since Varun's resume (`varun.pdf_20260511_112530.json`) doesn't have an explicit "Work Experience" section, the extraction will return:
```json
{
  "experience_section": {
    "items": [],
    "count": 0
  }
}
```

To test experience extraction, provide a resume that includes job/internship experience in a dedicated section.

## Future Enhancements

Potential improvements:
1. Extract salary information from experience entries
2. Classify experience level (Junior, Mid, Senior)
3. Extract achievements/accomplishments per role
4. Parse responsibility bullet points
5. Extract employment type (Full-time, Internship, Contract)

---

**Modified Files:**
- `backend/app/services/resume_parser.py` - Core extraction logic
- Added new functions for experience extraction
- Updated OpenAI prompt for structured extraction
- Enhanced output JSON schema
