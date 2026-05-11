def detect_infra_maturity(combined_text: str) -> float:
    """
    Scans for DevOps and deployment automation paradigms.
    Returns a score between 0.0 and 1.0.
    """
    text = combined_text.lower()
    
    signals = [
        "docker", "docker-compose", "kubernetes", "terraform", "ci/cd",
        "github actions", "datadog", "prometheus", "nginx", "load balancer",
        "jenkins", "gitlab ci", "ansible", "helm", "grafana", "elk stack",
        "aws", "gcp", "azure"
    ]
    
    hits = 0
    for signal in signals:
        if signal in text:
            hits += 1
            
    return min(1.0, hits * 0.25)
