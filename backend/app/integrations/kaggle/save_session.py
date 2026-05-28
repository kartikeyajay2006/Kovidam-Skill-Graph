try:
    from playwright.sync_api import sync_playwright
except ModuleNotFoundError as exc:
    sync_playwright = None  # type: ignore[assignment]
    _PLAYWRIGHT_IMPORT_ERROR = exc

SESSION_FILE = "kaggle_session.json"


def main() -> None:
    if sync_playwright is None:
        raise RuntimeError(
            "playwright is not installed. Install the optional Kaggle integration "
            "dependencies before saving a Kaggle session."
        ) from _PLAYWRIGHT_IMPORT_ERROR

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://www.kaggle.com", wait_until="domcontentloaded", timeout=60000)
        print("Log in to Kaggle in the opened browser window.")
        print("After login, return to this terminal and press Enter.")
        input("Press Enter to verify login... ")

        page.goto("https://www.kaggle.com/settings", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(2500)
        if "/account/login" in page.url:
            print("Login verification failed. Kaggle still shows login page.")
            print("Please run again and complete login fully, then save session.")
            context.close()
            browser.close()
            return

        context.storage_state(path=SESSION_FILE)
        context.close()
        browser.close()

    print(f"Session saved to {SESSION_FILE}")


if __name__ == "__main__":
    main()
