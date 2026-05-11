from typing import Any, Dict

def apply_relevance_gate(target_alignment: float, domain_calibration: Dict[str, Any]) -> float:
    """
    Prevents candidates with massive buzzword counts but fundamentally wrong domains
    from achieving high scores. Applies a soft cap by returning a multiplier.
    """
    multiplier = 1.0
    
    # If the alignment to the target role/domain is extremely low
    if target_alignment < 0.2:
        multiplier = 0.6
    elif target_alignment < 0.4:
        multiplier = 0.8
        
    return multiplier
