from typing import Any, Dict

def apply_authenticity_gate(authenticity_factor: float) -> Dict[str, Any]:
    """
    Evaluates the authenticity factor and handles contradictory or weak signals.
    """
    multiplier = 1.0
    low_confidence = False
    
    if authenticity_factor < 0.5:
        # Severe penalty for highly contradictory or spammy evidence
        multiplier = 0.8
        low_confidence = True
    elif authenticity_factor < 0.7:
        multiplier = 0.9
        
    return {
        "multiplier": multiplier,
        "forces_low_confidence": low_confidence
    }
