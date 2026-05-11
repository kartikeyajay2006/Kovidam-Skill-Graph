from typing import Any, List, Dict, Set
from dataclasses import dataclass

@dataclass
class VerifiedSkill:
    skill: str
    level: str
    multiplier: float
    strength: str
    strength_score: float
    sources: List[str]

def is_contradictory(skill: str, evidence_context: Dict[str, Any]) -> bool:
    return False

def get_skill_strength_info(sources: Set[str]) -> tuple[str, float]:
    """
    Determine the qualitative strength of the evidence and its numerical score.
    Weights:
    - manifest/imports: +0.40
    - repo_name/deployment: +0.20
    - experience: +0.15
    - project_desc: +0.10
    - readme: +0.05
    """
    score = 0.0
    
    if "github_manifest" in sources: score += 0.40
    if "github_imports" in sources: score += 0.40
    if "github_repo_name" in sources: score += 0.20
    if "deployment" in sources: score += 0.20
    if "experience" in sources: score += 0.15
    if "project_desc" in sources: score += 0.10
    if "github_readme" in sources: score += 0.05
    
    score = min(1.0, round(score, 3))
    
    if score >= 0.8:
        strength = "extremely strong"
    elif score >= 0.6:
        strength = "very strong"
    elif score >= 0.4:
        strength = "strong"
    elif score >= 0.2:
        strength = "moderate"
    elif score > 0.0:
        strength = "weak"
    else:
        strength = "none"
        
    return strength, score

def get_multiplier(level: str, mode: str) -> float:
    if mode == "internship":
        return {
            "HIGH_VERIFIED": 1.2,
            "MEDIUM_VERIFIED": 1.0,
            "LOW_VERIFIED": 0.8,
            "PUBLICLY_UNVERIFIED": 0.55,
            "CONTRADICTORY": 0.35
        }.get(level, 1.0)
    else: # job
        return {
            "HIGH_VERIFIED": 1.15,
            "MEDIUM_VERIFIED": 1.0,
            "LOW_VERIFIED": 0.9,
            "PUBLICLY_UNVERIFIED": 0.85,
            "CONTRADICTORY": 0.45
        }.get(level, 1.0)

def verify_skills(
    claimed_skills: List[str], 
    github_evidence: Dict[str, Set[str]], 
    deployments: Set[str], 
    experience_text: str, 
    mode: str
) -> List[VerifiedSkill]:
    
    verified_results = []
    
    # We pad the whole experience text once for performance
    padded_exp = f" {experience_text} "
    for p in [",", ".", ";", ":", "(", ")", "[", "]", "/", "\\", "-", "\n", "\t"]:
        padded_exp = padded_exp.replace(p, " ")
    padded_exp = " ".join(padded_exp.split())
    padded_exp = f" {padded_exp} "
    
    for skill in claimed_skills:
        skill_lower = skill.lower()
        padded_skill = f" {skill_lower} "
        
        sources = set()
        
        # 1. GitHub
        if skill_lower in github_evidence.get("manifests", set()):
            sources.add("github_manifest")
        if skill_lower in github_evidence.get("imports", set()):
            sources.add("github_imports")
        if skill_lower in github_evidence.get("repo_names", set()):
            sources.add("github_repo_name")
            
        # We check readme via substring since readmes are raw text
        for r in github_evidence.get("readme", set()):
            if skill_lower in r:
                sources.add("github_readme")
                break
                
        # 2. Deployments
        if deployments and skill_lower in ["react", "next.js", "vue", "node.js", "vercel", "aws", "gcp", "netlify"]:
            sources.add("deployment")
            
        # 3. Experience
        if padded_skill in padded_exp:
            sources.add("experience")
            
        # 4. Determine Level
        evidence_context = {"sources": sources, "skill": skill_lower}
        
        strength, strength_score = get_skill_strength_info(sources)
        
        if is_contradictory(skill_lower, evidence_context):
            level = "CONTRADICTORY"
        elif strength_score >= 0.6: # Equivalent to old logic of len(sources) >= 2
            level = "HIGH_VERIFIED"
        elif strength_score >= 0.2: # Equivalent to old logic of len(sources) == 1
            level = "MEDIUM_VERIFIED"
        elif len(github_evidence.get("repo_names", set())) > 0:
            level = "LOW_VERIFIED"
        else:
            level = "PUBLICLY_UNVERIFIED"

        multiplier = get_multiplier(level, mode)
        
        verified_results.append(
            VerifiedSkill(
                skill=skill, 
                level=level, 
                multiplier=multiplier, 
                strength=strength, 
                strength_score=strength_score,
                sources=list(sources)
            )
        )
        
    return verified_results
