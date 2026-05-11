from typing import Any

def extract_experience_context(extracted_resume: dict[str, Any]) -> str:
    """
    Extract the work experience and project sections as plain text
    for deterministic proximity/density matching.
    """
    # Kovidam extracted JSON usually has raw text
    text = str(extracted_resume.get("raw_text_preview", "")).lower()
    
    # We can also append any structured experience/projects if they exist in the payload
    # from the LLM extraction step
    data = extracted_resume.get("data", {})
    
    if isinstance(data, dict):
        exp = data.get("experience", [])
        if isinstance(exp, list):
            for e in exp:
                if isinstance(e, dict):
                    text += " " + str(e.get("description", "")).lower()
                    text += " " + str(e.get("responsibilities", "")).lower()
                    text += " " + " ".join([str(t).lower() for t in e.get("technologies", [])])
                    
        proj = data.get("projects", [])
        if isinstance(proj, list):
            for p in proj:
                if isinstance(p, dict):
                    text += " " + str(p.get("description", "")).lower()
                    text += " " + " ".join([str(t).lower() for t in p.get("technologies", [])])
    
    return text

def check_skill_in_experience(skill: str, experience_text: str) -> bool:
    """
    Deterministically check if skill exists in the dense experience text.
    In the future, we will use proximity sets (e.g., 'react' near 'frontend' or 'ui').
    """
    # Pad skill with boundaries to avoid substring matching (e.g. "c" in "react")
    padded_skill = f" {skill.lower()} "
    padded_text = f" {experience_text} "
    
    # Replace common punctuation with spaces
    for p in [",", ".", ";", ":", "(", ")", "[", "]", "/", "\\", "-", "\n", "\t"]:
        padded_text = padded_text.replace(p, " ")
        
    # Reduce multiple spaces
    padded_text = " ".join(padded_text.split())
    padded_text = f" {padded_text} "

    return padded_skill in padded_text
