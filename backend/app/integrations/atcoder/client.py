from typing import Any, Dict, Optional

import requests
from bs4 import BeautifulSoup


DEFAULT_HEADERS = {"User-Agent": "Mozilla/5.0"}


def _safe_get(url: str, timeout: int = 10) -> requests.Response:
    response = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch URL: {url}")
    return response


def get_atcoder_stats(username: str) -> Dict[str, Any]:
    urls = [
        f"https://atcoder.jp/users/{username}",
        f"https://www.atcoder.jp/users/{username}",
    ]

    response = None
    last_error: Optional[Exception] = None
    for url in urls:
        try:
            response = _safe_get(url)
            break
        except Exception as exc:
            last_error = exc

    if response is None:
        raise ValueError(f"Failed to fetch AtCoder profile for '{username}': {last_error}")

    soup = BeautifulSoup(response.text, "html.parser")

    highest_rating = "N/A"
    contests = "N/A"

    for row in soup.find_all("tr"):
        th = row.find("th")
        td = row.find("td")
        if not th or not td:
            continue

        key = th.get_text(strip=True)
        if "Highest Rating" in key:
            span = td.find("span")
            if span:
                highest_rating = span.get_text(strip=True)

        if "Rated Matches" in key:
            contests = td.get_text(strip=True)

    return {
        "username": username,
        "highest_rating": highest_rating,
        "contests_participated": contests,
    }
