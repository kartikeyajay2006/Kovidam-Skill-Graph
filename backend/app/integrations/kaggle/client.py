import os
import re
import json
from typing import Any, Dict

try:
    from playwright.async_api import async_playwright
except ModuleNotFoundError as exc:
    async_playwright = None  # type: ignore[assignment]
    _PLAYWRIGHT_IMPORT_ERROR = exc


SESSION_FILE = "kaggle_session.json"


async def get_kaggle_data(username: str) -> Dict[str, Any]:
    if async_playwright is None:
        raise RuntimeError(
            "playwright is not installed. Install the optional Kaggle integration "
            "dependencies if you need Kaggle profile scraping."
        ) from _PLAYWRIGHT_IMPORT_ERROR

    result: Dict[str, Any] = {
        "username": username,
        "competitions": 0,
        "rank": 0,
        "medals": {"gold": 0, "silver": 0, "bronze": 0},
        "notebooks": 0,
        "datasets": 0,
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        if os.path.exists(SESSION_FILE):
            context = await browser.new_context(storage_state=SESSION_FILE)
        else:
            context = await browser.new_context()
        page = await context.new_page()

        async def extract_tab_count(tab_prefix: str) -> int:
            try:
                # Primary: visible tab text like "Competitions (123)"
                els = await page.locator(f"text=/{tab_prefix}\\s*\\(\\d+[\\d,]*\\)/i").all()
                for el in els:
                    txt = await el.inner_text()
                    m = re.search(rf"{tab_prefix}\s*\((\d+(?:,\d+)?)\)", txt, re.IGNORECASE)
                    if m:
                        return int(m.group(1).replace(",", ""))
            except Exception:
                pass
            try:
                # Fallback: parse whole page text for same pattern
                body_text = await page.locator("body").inner_text()
                m = re.search(rf"{tab_prefix}\s*\((\d+(?:,\d+)?)\)", body_text, re.IGNORECASE)
                if m:
                    return int(m.group(1).replace(",", ""))
            except Exception:
                pass
            return 0

        async def extract_medals(medal_type: str) -> int:
            total = 0
            try:
                els = await page.locator(f"img[title='{medal_type} medal']").all()
                for el in els:
                    parent_text = await el.locator("..").inner_text()
                    digits = "".join(filter(str.isdigit, parent_text))
                    if digits:
                        total += int(digits)
            except Exception:
                pass
            return total

        async def extract_best_rank() -> int:
            best_rank = float("inf")
            try:
                els = await page.locator("text=RANK").all()
                for el in els:
                    p_text = await el.locator("..").inner_text()
                    m = re.search(r"RANK\s+([\d,]+)", p_text, re.IGNORECASE)
                    if m:
                        r = int(m.group(1).replace(",", ""))
                        if 0 < r < best_rank:
                            best_rank = r
            except Exception:
                pass
            try:
                # Fallback: global text search "RANK 7,547"
                body_text = await page.locator("body").inner_text()
                candidates = re.findall(r"RANK\s*([\d,]+)", body_text, re.IGNORECASE)
                for c in candidates:
                    r = int(c.replace(",", ""))
                    if 0 < r < best_rank:
                        best_rank = r
            except Exception:
                pass
            return int(best_rank) if best_rank != float("inf") else 0

        try:
            await page.goto(f"https://www.kaggle.com/{username}", wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(1500)
            await page.mouse.wheel(0, 2000)
            await page.wait_for_timeout(500)

            # Primary source: parse Next.js payload (more stable than visible DOM labels)
            try:
                next_data_raw = await page.locator("script#__NEXT_DATA__").text_content()
                if next_data_raw:
                    payload = json.loads(next_data_raw)

                    def _walk(obj):
                        if isinstance(obj, dict):
                            yield obj
                            for v in obj.values():
                                yield from _walk(v)
                        elif isinstance(obj, list):
                            for i in obj:
                                yield from _walk(i)

                    # Generic best-effort key search
                    for node in _walk(payload):
                        for k, v in node.items():
                            if not isinstance(v, (int, float, str)):
                                continue
                            lk = k.lower()
                            if result["rank"] == 0 and "rank" in lk:
                                try:
                                    rv = int(str(v).replace(",", ""))
                                    if rv > 0:
                                        result["rank"] = rv
                                except Exception:
                                    pass
                            if result["competitions"] == 0 and ("competition" in lk and ("count" in lk or "total" in lk)):
                                try:
                                    result["competitions"] = int(str(v).replace(",", ""))
                                except Exception:
                                    pass
                            if result["notebooks"] == 0 and (("notebook" in lk or "code" in lk) and ("count" in lk or "total" in lk)):
                                try:
                                    result["notebooks"] = int(str(v).replace(",", ""))
                                except Exception:
                                    pass
                            if result["datasets"] == 0 and ("dataset" in lk and ("count" in lk or "total" in lk)):
                                try:
                                    result["datasets"] = int(str(v).replace(",", ""))
                                except Exception:
                                    pass
            except Exception:
                pass

            datasets_dom = await extract_tab_count("Datasets")
            notebooks_dom = await extract_tab_count("Code")
            rank_dom = await extract_best_rank()
            competitions_dom = await extract_tab_count("Competitions")

            if result["datasets"] == 0 and datasets_dom > 0:
                result["datasets"] = datasets_dom
            if result["notebooks"] == 0 and notebooks_dom > 0:
                result["notebooks"] = notebooks_dom
            if result["rank"] == 0 and rank_dom > 0:
                result["rank"] = rank_dom
            if result["competitions"] == 0 and competitions_dom > 0:
                result["competitions"] = competitions_dom
            result["medals"]["gold"] = await extract_medals("Gold")
            result["medals"]["silver"] = await extract_medals("Silver")
            result["medals"]["bronze"] = await extract_medals("Bronze")

            # Extra fallback from profile links like "/<user>/code?..."
            if result["notebooks"] == 0 or result["datasets"] == 0 or result["competitions"] == 0:
                try:
                    anchors = await page.locator("a[href]").all()
                    for a in anchors:
                        href = (await a.get_attribute("href")) or ""
                        txt = (await a.inner_text()).strip()
                        if result["notebooks"] == 0 and "/code" in href:
                            m = re.search(r"(\d+(?:,\d+)?)", txt)
                            if m:
                                result["notebooks"] = int(m.group(1).replace(",", ""))
                        if result["datasets"] == 0 and "/datasets" in href:
                            m = re.search(r"(\d+(?:,\d+)?)", txt)
                            if m:
                                result["datasets"] = int(m.group(1).replace(",", ""))
                        if result["competitions"] == 0 and "/competitions" in href:
                            m = re.search(r"(\d+(?:,\d+)?)", txt)
                            if m:
                                result["competitions"] = int(m.group(1).replace(",", ""))
                except Exception:
                    pass
        finally:
            await context.close()
            await browser.close()

    return result
