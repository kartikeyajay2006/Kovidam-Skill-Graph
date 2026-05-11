def detect_api_complexity(combined_text: str) -> float:
    """
    Scans for robust backend networking and security paradigms.
    Returns a score between 0.0 and 1.0.
    """
    text = combined_text.lower()
    
    signals = [
        "jwt", "oauth", "rate limiting", "graphql", "grpc", "middleware",
        "caching", "redis", "authentication", "authorization", "websockets",
        "validation", "throttling", "api gateway"
    ]
    
    hits = 0
    for signal in signals:
        if signal in text:
            hits += 1
            
    return min(1.0, hits * 0.2)
