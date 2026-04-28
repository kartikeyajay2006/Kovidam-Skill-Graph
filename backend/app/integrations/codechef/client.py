import re
from typing import Any, Dict

import requests
from bs4 import BeautifulSoup


DEFAULT_HEADERS = {"User-Agent": "Mozilla/5.0"}


def get_codechef_stats(username: str) -> Dict[str, Any]:
    url = f"https://www.codechef.com/users/{username}"
    response = requests.get(url, headers=DEFAULT_HEADERS, timeout=10)
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch URL: {url}")
    soup = BeautifulSoup(response.text, "html.parser")

    rating_block = soup.find("div", id="rating-block-all")
    highest_rating = "N/A"

    if rating_block:
        small_tag = rating_block.find("small")
        if small_tag:
            text = small_tag.get_text(strip=True)
            match = re.search(r"(\d+)", text)
            if match:
                highest_rating = match.group(1)

    contests = "N/A"
    contest_div = soup.find("div", class_="contest-participated-count")
    if contest_div:
        b_tag = contest_div.find("b")
        if b_tag:
            contests = b_tag.text.strip()

    return {
        "username": username,
        "highest_rating": highest_rating,
        "contests_participated": contests,
    }
