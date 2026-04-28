import re
from typing import Any, Dict, Optional, Set, Tuple

import requests
from bs4 import BeautifulSoup


DEFAULT_HEADERS = {"User-Agent": "Mozilla/5.0"}


def _safe_get(url: str, timeout: int = 10) -> requests.Response:
    response = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch URL: {url}")
    return response


def get_atcoder_stats(username: str) -> Dict[str, Any]:
    url = f"https://atcoder.jp/users/{username}"
    response = _safe_get(url)
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


def get_codechef_stats(username: str) -> Dict[str, Any]:
    url = f"https://www.codechef.com/users/{username}"
    response = _safe_get(url)
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


def get_codeforces_stats(handle: str) -> Dict[str, Any]:
    user_info_url = f"https://codeforces.com/api/user.info?handles={handle}"
    user_info_resp = requests.get(user_info_url, timeout=10)
    user_info = user_info_resp.json()

    if user_info.get("status") != "OK":
        raise ValueError("Invalid handle or API error (user.info)")

    user_data = user_info["result"][0]
    max_rating = user_data.get("maxRating", 0)

    submissions_url = f"https://codeforces.com/api/user.status?handle={handle}"
    submissions_resp = requests.get(submissions_url, timeout=10)
    submissions = submissions_resp.json()

    if submissions.get("status") != "OK":
        raise ValueError("API error (user.status)")

    solved_problems: Set[Tuple[int, str]] = set()
    for sub in submissions["result"]:
        if sub.get("verdict") == "OK":
            problem = sub.get("problem", {})
            contest_id = problem.get("contestId")
            index = problem.get("index")
            if contest_id and index:
                solved_problems.add((contest_id, index))

    return {
        "handle": handle,
        "max_rating": max_rating,
        "problems_solved": len(solved_problems),
    }


def get_leetcode_stats(username: str) -> Dict[str, Any]:
    url = "https://leetcode.com/graphql"

    query = """
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
      userContestRanking(username: $username) {
        rating
      }
    }
    """

    variables = {"username": username}
    response = requests.post(url, json={"query": query, "variables": variables}, timeout=10)
    data = response.json()

    if "errors" in data:
        raise ValueError("Invalid username or API issue")

    user = data.get("data", {}).get("matchedUser")
    ranking = data.get("data", {}).get("userContestRanking")

    if not user:
        raise ValueError("LeetCode user not found")

    stats = user["submitStats"]["acSubmissionNum"]
    solved = {"Easy": 0, "Medium": 0, "Hard": 0}

    for item in stats:
        difficulty = item.get("difficulty")
        if difficulty in solved:
            solved[difficulty] = item.get("count", 0)

    rating = ranking["rating"] if ranking else 0

    return {
        "username": username,
        "rating": rating,
        "easy_solved": solved["Easy"],
        "medium_solved": solved["Medium"],
        "hard_solved": solved["Hard"],
    }


def fetch_all_platform_stats(handles: Dict[str, str]) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "codeforces": None,
        "leetcode": None,
        "codechef": None,
        "atcoder": None,
        "errors": {},
    }

    for platform, fn in {
        "codeforces": get_codeforces_stats,
        "leetcode": get_leetcode_stats,
        "codechef": get_codechef_stats,
        "atcoder": get_atcoder_stats,
    }.items():
        username = handles.get(platform)
        if not username:
            continue
        try:
            result[platform] = fn(username)
        except Exception as exc:
            result["errors"][platform] = str(exc)

    return result
