import hashlib
import json
from functools import lru_cache
from typing import Any

@lru_cache(maxsize=200)
def _get_cached_github_evidence(payload_hash: str, github_analysis_str: str) -> dict[str, set[str]]:
    """
    Internal cached function. We pass github_analysis_str to be able to parse it,
    or better yet, we just reconstruct it, but string parsing is slow.
    Instead, let's just use the hash as a key and keep a manual cache, 
    or use lru_cache with a custom wrapper.
    """
    pass

# We will use a custom simple LRU class to avoid serialization overhead 
# if we pass the dict directly, but wait, if we hash the dict, we can just use a dictionary.
import collections

class _RepoCache:
    def __init__(self, maxsize=200):
        self.cache = collections.OrderedDict()
        self.maxsize = maxsize

    def get_evidence(self, github_analysis: dict[str, Any]) -> dict[str, set[str]]:
        from app.scoring.collectors.github_collector import extract_from_github
        
        if not github_analysis:
            return extract_from_github(github_analysis)
            
        # Create a stable hash based on the overall score and repo count as a proxy,
        # or stringify it. Stringifying a large JSON might be slow, but it's okay for 200 items.
        try:
            # We use the summary block as a quick hash key if available, else stringify
            summary = github_analysis.get("summary", {})
            repos = github_analysis.get("repositories", [])
            if summary and repos:
                repo_names = [r.get("repository", {}).get("name", "") for r in repos]
                key_str = f"{summary.get('overall_score_100')}_{len(repos)}_{','.join(repo_names)}"
            else:
                key_str = str(github_analysis)[:1000] # fallback
                
            cache_key = hashlib.md5(key_str.encode('utf-8')).hexdigest()
        except Exception:
            # Fallback to just extracting
            return extract_from_github(github_analysis)
            
        if cache_key in self.cache:
            self.cache.move_to_end(cache_key)
            return self.cache[cache_key]
            
        evidence = extract_from_github(github_analysis)
        self.cache[cache_key] = evidence
        
        if len(self.cache) > self.maxsize:
            self.cache.popitem(last=False)
            
        return evidence

# Global cache instance
repo_cache = _RepoCache(maxsize=200)

def get_cached_github_evidence(github_analysis: dict[str, Any]) -> dict[str, set[str]]:
    return repo_cache.get_evidence(github_analysis)
