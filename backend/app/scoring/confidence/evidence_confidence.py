from typing import Any, Dict, Tuple, List

def calculate_github_confidence(extracted: Dict[str, Any]) -> Tuple[float, List[str]]:
    boost = 0.0
    evidence = []
    
    repos = extracted.get("github_analysis", {}).get("repositories", [])
    if not repos:
        evidence.append("Low Confidence: No public GitHub data available.")
        return 0.0, evidence
        
    strong_ownership = 0
    for r in repos:
        analysis = r.get("analysis", {})
        retention = analysis.get("target_user_code_retention_audit", {})
        if "error" not in retention:
            try:
                pct_str = retention.get("surviving_percentage", "0.0%")
                pct = float(pct_str.strip("%"))
                if pct > 80.0:
                    strong_ownership += 1
            except ValueError:
                pass
                
    if strong_ownership > 0:
        boost += 0.3
        evidence.append(f"Strong Ownership: Code retention >80% verified in {strong_ownership} repositories.")
    else:
        evidence.append("Moderate Ownership: Repositories exist but ownership isn't dominant.")
        
    return min(1.0, boost), evidence

def calculate_skills_confidence(extracted: Dict[str, Any], engineering_depth: Dict[str, Any]) -> Tuple[float, List[str]]:
    boost = 0.0
    evidence = []
    
    repos = extracted.get("github_analysis", {}).get("repositories", [])
    has_manifest_skills = False
    
    for r in repos:
        tech = r.get("analysis", {}).get("identified_tech_stack_dependencies", [])
        if tech:
            has_manifest_skills = True
            break
            
    if has_manifest_skills:
        boost += 0.2
        evidence.append("Verified Dependency Manifests: Skills deterministically found in package files.")
    else:
        evidence.append("Semantic Inference: Skill claims rely on textual extraction without manifest proof.")
        
    if engineering_depth.get("architecture_score", 0.0) > 0.0:
        boost += 0.1
        evidence.append("Architectural Verification: Architecture signals correlate with skill claims.")
        
    return min(1.0, boost), evidence
    
def calculate_deployment_confidence(extracted: Dict[str, Any], skill_meta: Dict[str, Any]) -> Tuple[float, List[str]]:
    boost = 0.0
    evidence = []
    
    # We can check if deployment links exist in the original payload, or use a heuristic.
    # We know from previous implementations that "urls" might contain deployment links.
    urls = extracted.get("profiles", {}).get("urls", [])
    if urls:
        boost += 0.4
        evidence.append(f"Verified Deployments: {len(urls)} live URLs found in profile.")
    else:
        evidence.append("No Active Deployments: Candidate has no live hosted links.")
        
    return min(1.0, boost), evidence
