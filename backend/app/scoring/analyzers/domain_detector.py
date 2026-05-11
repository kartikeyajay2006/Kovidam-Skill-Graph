from typing import List, Dict, Any, Set
from app.scoring.analyzers.verification_engine import VerifiedSkill
from app.scoring.vocabularies.frontend_vocab import FRONTEND_ECOSYSTEM
from app.scoring.vocabularies.backend_vocab import BACKEND_ECOSYSTEM
from app.scoring.vocabularies.infra_vocab import INFRA_ECOSYSTEM
from app.scoring.vocabularies.data_ai_vocab import DATA_AI_ECOSYSTEM
from app.scoring.vocabularies.mobile_vocab import MOBILE_ECOSYSTEM
from app.scoring.vocabularies.devops_vocab import DEVOPS_ECOSYSTEM

DOMAINS = {
    "frontend": FRONTEND_ECOSYSTEM,
    "backend": BACKEND_ECOSYSTEM,
    "infrastructure": INFRA_ECOSYSTEM,
    "data_ai": DATA_AI_ECOSYSTEM,
    "mobile": MOBILE_ECOSYSTEM,
    "devops": DEVOPS_ECOSYSTEM
}

CORE_FRAMEWORKS = {
    "frontend": {"react", "next.js", "vue", "angular", "svelte"},
    "backend": {"django", "express", "spring", "fastapi", "ruby on rails", "laravel", "flask", "node.js"},
    "infrastructure": {"aws", "gcp", "azure", "kubernetes", "terraform"},
    "data_ai": {"tensorflow", "pytorch", "spark", "pandas"},
    "mobile": {"react native", "flutter", "swift", "kotlin"},
    "devops": {"ci/cd", "github actions", "jenkins", "gitlab ci"}
}

def analyze_domains(verified_skills: List[VerifiedSkill]) -> Dict[str, Any]:
    """
    Cluster verified skills into engineering domains and compute ecosystem confidence.
    """
    domain_hits = {domain: 0 for domain in DOMAINS.keys()}
    domain_core_presence = {domain: False for domain in DOMAINS.keys()}
    
    # We only consider skills that have some level of verification (strength > 0)
    # We will use strength_score to weight the hit, but for now we just count hits.
    for vs in verified_skills:
        # Ignore completely contradictory or publicly unverified skills without sources
        if vs.level == "CONTRADICTORY" or vs.level == "PUBLICLY_UNVERIFIED":
            continue
            
        skill_lower = vs.skill.lower()
        
        # Check which domain it belongs to
        for domain_name, vocab in DOMAINS.items():
            if skill_lower in vocab:
                domain_hits[domain_name] += 1
                if skill_lower in CORE_FRAMEWORKS[domain_name]:
                    domain_core_presence[domain_name] = True
                    
    ecosystem_confidence = {}
    active_domains = []
    
    has_infra_overall = domain_hits["infrastructure"] > 0 or domain_hits["devops"] > 0
    
    for domain_name, hits in domain_hits.items():
        if hits > 0:
            active_domains.append(domain_name)
            
            # Mathematical confidence logic
            # Baseline from hits
            confidence = hits * 0.20
            
            # Bonus for having a core framework
            if domain_core_presence[domain_name]:
                confidence += 0.35
                
            # Bonus for having related infra skills (shows maturity)
            if has_infra_overall and domain_name not in ["infrastructure", "devops"]:
                confidence += 0.15
                
            ecosystem_confidence[domain_name] = min(1.0, round(confidence, 3))
            
    return {
        "engineering_domains": active_domains,
        "ecosystem_confidence": ecosystem_confidence
    }
