import inspect
from typing import Any, Dict

from app.integrations.atcoder.client import get_atcoder_stats
from app.integrations.codechef.client import get_codechef_stats
from app.integrations.codeforces.client import get_codeforces_stats
from app.integrations.kaggle.client import get_kaggle_data
from app.integrations.leetcode.client import get_leetcode_stats


async def fetch_all_platform_stats(handles: Dict[str, str]) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "codeforces": None,
        "leetcode": None,
        "codechef": None,
        "atcoder": None,
        "kaggle": None,
        "errors": {},
    }

    for platform, fn in {
        "codeforces": get_codeforces_stats,
        "leetcode": get_leetcode_stats,
        "codechef": get_codechef_stats,
        "atcoder": get_atcoder_stats,
        "kaggle": get_kaggle_data,
    }.items():
        username = handles.get(platform)
        if not username:
            continue
        try:
            if inspect.iscoroutinefunction(fn):
                result[platform] = await fn(username)
            else:
                result[platform] = fn(username)
        except Exception as exc:
            result["errors"][platform] = str(exc)

    return result
