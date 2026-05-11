def detect_testing_maturity(combined_text: str) -> float:
    """
    Scans for engineering QA and testing paradigms.
    Returns a score between 0.0 and 1.0.
    """
    text = combined_text.lower()
    
    signals = [
        "jest", "pytest", "cypress", "selenium", "unit test", "integration test",
        "test coverage", "mocking", "e2e test", "tdd", "bdd", "mocha", "chai"
    ]
    
    hits = 0
    for signal in signals:
        if signal in text:
            hits += 1
            
    return min(1.0, hits * 0.3)
