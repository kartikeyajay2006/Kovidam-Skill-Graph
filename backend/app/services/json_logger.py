import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Assuming this module is at backend/app/services/json_logger.py
# This resolves to backend/data/extracted_resumes
BASE_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "extracted_resumes"


def save_raw_output(data: dict, trace_id: str, filename: str) -> Optional[str]:
    """
    Saves the extracted raw data to a JSON file.

    Args:
        data: The dictionary containing the raw extracted data.
        trace_id: A unique identifier for the extraction process.
        filename: The original filename (e.g., resume.pdf).

    Returns:
        The absolute path to the saved JSON file, or None if saving fails.
    """
    try:
        # Ensure directory exists (create if not)
        BASE_DATA_DIR.mkdir(parents=True, exist_ok=True)

        # Sanitize original filename (remove extension and invalid chars)
        safe_filename = Path(filename).stem
        safe_filename = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in safe_filename)

        # Generate timestamp
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

        # Construct filename: {original_filename}_{trace_id}_{timestamp}.json
        final_filename = f"{safe_filename}_{trace_id}_{timestamp}.json"
        
        file_path = BASE_DATA_DIR / final_filename

        # Safe file writing (utf-8, indent=2)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.info(f"Successfully saved raw output to {file_path}")
        return str(file_path)

    except Exception as e:
        # Handle exceptions gracefully
        logger.error(f"Failed to save raw output for trace {trace_id}: {e}", exc_info=True)
        return None
