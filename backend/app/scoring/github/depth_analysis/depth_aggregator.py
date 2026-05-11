from typing import Any, Dict
from app.scoring.github.depth_analysis.architecture_detector import detect_architecture_sophistication
from app.scoring.github.depth_analysis.infra_detector import detect_infra_maturity
from app.scoring.github.depth_analysis.api_complexity_detector import detect_api_complexity
from app.scoring.github.depth_analysis.testing_detector import detect_testing_maturity
from app.scoring.github.depth_analysis.consistency_analyzer import analyze_temporal_consistency
from app.scoring.github.depth_analysis.ownership_analyzer import analyze_ownership_quality

def calculate_engineering_depth(extracted: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aggregates all heuristic signals into a final engineering depth score.
    Uses textual payloads from extracted sections and github analysis.
    """
    
    # 1. Combine textual payloads
    text_blocks = []
    
    # Add project descriptions
    for proj in extracted.get("projects_section", {}).get("items", []):
        text_blocks.append(str(proj.get("description") or ""))
        tech = proj.get("tech_stack") or []
        text_blocks.append(" ".join([str(t) for t in tech if t]))
        highlights = proj.get("highlights") or []
        text_blocks.append(" ".join([str(h) for h in highlights if h]))
        
    # Add experience descriptions
    for exp in extracted.get("experience_section", {}).get("items", []):
        text_blocks.append(str(exp.get("description") or ""))
        highlights = exp.get("highlights") or []
        text_blocks.append(" ".join([str(h) for h in highlights if h]))
        
    # Add GitHub payloads
    github_analysis = extracted.get("github_analysis", {})
    for r in github_analysis.get("repositories", []):
        analysis = r.get("analysis", {})
        text_blocks.append(str(analysis.get("repository_description") or ""))
        tech = analysis.get("identified_tech_stack_dependencies") or []
        text_blocks.append(" ".join([str(t) for t in tech if t]))
        
    combined_text = " ".join([t for t in text_blocks if t])
    
    # 2. Run heuristic detectors
    arch_score = detect_architecture_sophistication(combined_text)
    infra_score = detect_infra_maturity(combined_text)
    api_score = detect_api_complexity(combined_text)
    test_score = detect_testing_maturity(combined_text)
    
    # 3. Run GitHub native analyzers
    consistency_score = analyze_temporal_consistency(github_analysis)
    ownership_score = analyze_ownership_quality(github_analysis)
    
    # 4. Compute weighted depth score
    depth_score = (
        (arch_score * 0.25) +
        (infra_score * 0.25) +
        (api_score * 0.15) +
        (test_score * 0.15) +
        (consistency_score * 0.10) +
        (ownership_score * 0.10)
    )
    
    return {
        "score": round(min(1.0, depth_score), 3),
        "architecture_score": round(arch_score, 3),
        "infra_score": round(infra_score, 3),
        "api_complexity_score": round(api_score, 3),
        "testing_score": round(test_score, 3),
        "consistency_score": round(consistency_score, 3),
        "ownership_score": round(ownership_score, 3)
    }
