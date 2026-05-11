from typing import Any, Dict, Tuple, List

def detect_extraction_ambiguity(extracted: Dict[str, Any]) -> Tuple[float, List[str]]:
    """
    Analyzes extraction metadata to detect parsing ambiguity and hallucination risks.
    Returns a tuple of (penalty, list_of_evidence_strings)
    """
    penalty = 0.0
    evidence = []
    
    parser_meta = extracted.get("parser_meta", {}).get("parsers_used", {})
    ocr_pages = parser_meta.get("ocr_pages", 0)
    
    if ocr_pages > 0:
        penalty += 0.20
        evidence.append(f"High Ambiguity: Resume required OCR parsing for {ocr_pages} pages.")
        
    struct_meta = extracted.get("structured_extraction_meta", {})
    chunk_errors = struct_meta.get("chunk_errors", [])
    if chunk_errors:
        penalty += 0.15
        evidence.append(f"Moderate Ambiguity: {len(chunk_errors)} chunk errors during LLM structured extraction.")
        
    exp_years = str(extracted.get("work_experience_years", ""))
    if exp_years.upper() == "N/A":
        penalty += 0.05
        evidence.append("Low Ambiguity: Failed to deterministically infer work experience years.")
        
    if not evidence:
        evidence.append("Clear Extraction: Deterministic parsing succeeded without ambiguity.")
        
    return penalty, evidence
