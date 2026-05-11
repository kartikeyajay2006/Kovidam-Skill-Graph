def detect_architecture_sophistication(combined_text: str) -> float:
    """
    Scans for production architecture paradigms.
    Returns a score between 0.0 and 1.0.
    """
    text = combined_text.lower()
    
    signals = [
        "microservices", "event-driven", "dependency injection", "cqrs",
        "message queue", "websocket", "background tasks", "celery",
        "rabbitmq", "kafka", "service layer", "repository pattern",
        "hexagonal architecture", "clean architecture"
    ]
    
    hits = 0
    for signal in signals:
        if signal in text:
            hits += 1
            
    return min(1.0, hits * 0.3)
