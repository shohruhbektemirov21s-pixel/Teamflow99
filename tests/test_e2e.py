from playwright.sync_api import sync_playwright
from os import environ

BASE_URL = environ.get("BASE_URL", "http://127.0.0.1:5173")


def test_public_navigation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=environ.get("E2E_HEADED") != "1")
        page = browser.new_page()
        try:
            page.goto(BASE_URL, wait_until="networkidle")
            assert page.title() == "TeamFlow"
            assert page.locator("main#landing-main").is_visible()
            assert page.locator('a[href="/kirish"]').count() >= 1
            assert page.locator('a[href="/royxatdan-otish"]').count() >= 1

            page.locator('a[href="/kirish"]').first.click()
            page.locator("main#auth-main").wait_for()
            assert page.locator('input[autocomplete="username"]').is_visible()
            assert page.locator('input[autocomplete="current-password"]').is_visible()
            assert page.locator('button[type="submit"]').is_visible()

            page.locator('a[href="/royxatdan-otish"]').first.click()
            page.locator('input[autocomplete="new-password"]').wait_for()
            assert page.locator("main#auth-main").is_visible()
        finally:
            browser.close()

if __name__ == "__main__":
    test_public_navigation()
