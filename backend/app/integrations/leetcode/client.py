from typing import Any, Dict

import requests


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
