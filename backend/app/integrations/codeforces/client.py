from typing import Any, Dict, Set, Tuple

import requests


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
