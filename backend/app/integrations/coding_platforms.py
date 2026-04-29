import inspect
import asyncio
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

    fetchers = {
        "codeforces": get_codeforces_stats,
        "leetcode": get_leetcode_stats,
        "codechef": get_codechef_stats,
        "atcoder": get_atcoder_stats,
        "kaggle": get_kaggle_data,
    }

    async def run_one(platform: str, fn, username: str):
        username = handles.get(platform)
        if not username:
            return platform, None, None
        try:
            if inspect.iscoroutinefunction(fn):
                data = await fn(username)
            else:
                data = await asyncio.to_thread(fn, username)
            return platform, data, None
        except Exception as exc:
            return platform, None, str(exc)

    tasks = [run_one(platform, fn, handles.get(platform, "")) for platform, fn in fetchers.items()]
    for platform, data, err in await asyncio.gather(*tasks):
        if err:
            result["errors"][platform] = err
        elif data is not None:
            result[platform] = data

    return result
