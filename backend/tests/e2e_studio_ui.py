"""Creator Studio in a real Chromium browser, desktop and phone.

Run with playwright + httpx installed, the local stack running, real AI disabled, and
creator-service on compose.fake-smtp.yml. This starts its own SMTP sink on :2525;
do not run concurrently with e2e_newsletters.py. No mail leaves the machine.

    python backend/tests/e2e_studio_ui.py

Screenshots go to KINJY_UI_ARTIFACTS (default /tmp/kinjy-studio-ui).
"""
from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import httpx
from playwright.sync_api import sync_playwright, expect

from fake_smtp import FakeSMTP

expect.set_options(timeout=90_000)

BASE = os.getenv("KINJY_API", "http://localhost:8200/api")
WEB = os.getenv("KINJY_WEB", "http://localhost:3030")
ARTIFACTS = Path(os.getenv("KINJY_UI_ARTIFACTS", "/tmp/kinjy-studio-ui"))
ARTIFACTS.mkdir(parents=True, exist_ok=True)
client = httpx.Client(base_url=BASE, timeout=90)


def register(age: int, lang: str = "en") -> dict:
    for _ in range(4):
        tag = uuid.uuid4().hex[:10]
        response = client.post("/auth/register", json={
            "email": f"studio-ui-{tag}@example.com", "handle": f"ui{tag}",
            "display_name": f"Studio UI {tag}", "password": "Sup3rStrong!Pass",
            "date_of_birth": f"{datetime.now().year - age}-06-15", "country": "US", "lang": lang,
        })
        if response.status_code != 504:
            response.raise_for_status()
            return response.json()
    raise RuntimeError("Registration repeatedly timed out")


def headers(account: dict) -> dict:
    return {"Authorization": f"Bearer {account['tokens']['access_token']}"}


def check(label: str, condition: bool = True):
    assert condition, label
    print(f"PASS {label}", flush=True)


sink = FakeSMTP()
sink.start()
accounts: list[dict] = []
contexts = []
try:
    reuse_tag = os.getenv("KINJY_UI_REUSE_TAG", "")
    reuse_job = os.getenv("KINJY_UI_REUSE_JOB", "")
    if reuse_tag:
        assert re.fullmatch(r"[0-9a-f]{10}", reuse_tag) and reuse_job
        signed_in = client.post("/auth/login", json={"email": f"studio-ui-{reuse_tag}@example.com", "password": "Sup3rStrong!Pass"})
        signed_in.raise_for_status()
        adult = signed_in.json()
    else:
        adult = register(35)
    minor = register(14)
    french = register(30, "fr")
    accounts.extend([adult, minor, french])
    print("Fixture accounts ready; opening Chromium", flush=True)
    info = client.get("/creators/newsletter/subscribers", headers=headers(adult))
    info.raise_for_status()
    if not info.json()["can_send"]:
        raise SystemExit("SKIPPED: start creator-service with compose.fake-smtp.yml")
    # Refuse an environment capable of sending to a real provider.
    providers = client.get("/ai/providers").json()["providers"]
    assert not any(p.get("live") for p in providers), "Run this suite with real AI disabled"

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.getenv("KINJY_CHROMIUM", "/usr/bin/google-chrome"), headless=True)
        errors: list[str] = []

        def context(account=None, **kwargs):
            ctx = browser.new_context(**kwargs)
            contexts.append(ctx)
            if account:
                ctx.add_init_script("if (location.origin === " + repr(WEB) + ") { localStorage.setItem('kaluta.access_token', " + repr(account["tokens"]["access_token"]) + ");localStorage.setItem('kaluta.refresh_token', " + repr(account["tokens"]["refresh_token"]) + "); }")
            ctx.on("page", lambda page: page.on("pageerror", lambda error: errors.append(str(error))))
            return ctx

        page = context(adult, viewport={"width": 1440, "height": 1000}).new_page()
        page.set_default_timeout(90_000)
        page.goto(f"{WEB}/studio" + (f"?job={reuse_job}" if reuse_tag else ""), wait_until="domcontentloaded")
        compose = page.get_by_role("form", name="Create", exact=True)
        expect(compose).to_be_visible()
        expect(page.get_by_role("region", name="Scheduled posts", exact=True)).to_be_visible()
        check("Studio opens with composition, history and scheduled posts")

        if not reuse_tag:
            source = "Studio browser check\nThe market opens at dawn."
            compose.get_by_label("Your idea, your draft").fill(source)
            for name in ("Newsletter", "Carousel", "Audio", "Short video", "Long video"):
                compose.get_by_role("button", name=name, exact=True).click()
            compose.get_by_role("button", name=re.compile(r"^Create ")).click()
        results = page.get_by_role("region", name="Results", exact=True)
        expect(results.get_by_role("heading", name=re.compile(r"6 pieces made"))).to_be_visible(timeout=240_000)
        check("All six original-language formats finish in the browser")
        expect(results.locator("img").first).to_be_visible()
        expect(results.locator("audio")).to_have_count(1)
        expect(results.locator("video")).to_have_count(2)
        page.wait_for_function("Array.from(document.querySelectorAll('section[aria-label=Results] audio, section[aria-label=Results] video')).every(player => player.readyState >= 1 && !player.error)", timeout=90_000)
        check("Carousel images and audio/video previews load")
        with page.expect_download() as download_info:
            results.get_by_role("link", name="Download slide 1", exact=True).click()
        download = download_info.value
        check("A rendered file downloads instead of navigating away", download.failure() is None)

        article = results.locator("li").filter(has=page.get_by_role("heading", name="Article · English", exact=True)).first
        article.get_by_role("button", name="Post it…", exact=True).click()
        article.get_by_label("Publish later", exact=True).check()
        article.get_by_label("When to publish").fill((datetime.now() + timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M"))
        article.get_by_role("button", name="Schedule it", exact=True).click()
        expect(article.get_by_text(re.compile("Scheduled for"))).to_be_visible()
        scheduled = page.get_by_role("region", name="Scheduled posts", exact=True)
        expect(scheduled.get_by_role("button", name="Change time")).to_have_count(1)
        scheduled.get_by_role("button", name="Change time").click()
        scheduled.get_by_label("New publication time").fill((datetime.now() + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M"))
        scheduled.get_by_role("button", name="Save time").click()
        expect(scheduled.get_by_role("button", name="Change time")).to_be_visible()
        check("A result can be scheduled and its time changed")
        scheduled.get_by_role("button", name="Publish now", exact=True).click()
        scheduled.get_by_role("button", name="Yes, publish now", exact=True).click()
        expect(scheduled.get_by_text("No posts waiting.", exact=False)).to_be_visible()
        check("A scheduled post can be published immediately")

        waiting = client.post("/posts", headers=headers(adult), json={"body": "Cancel this browser fixture", "scheduled_for": (datetime.now().astimezone() + timedelta(hours=4)).isoformat()})
        waiting.raise_for_status()
        scheduled.get_by_role("button", name="Refresh", exact=True).click()
        scheduled.get_by_role("button", name="Cancel post", exact=True).click()
        scheduled.get_by_role("button", name="Yes, cancel post", exact=True).click()
        expect(scheduled.get_by_text("No posts waiting.", exact=False)).to_be_visible()
        check("A scheduled post can be cancelled from the Studio")

        newsletter = results.locator("li").filter(has=page.get_by_role("heading", name="Newsletter · English", exact=True)).first
        handle = adult["user"]["handle"]
        reader = context(viewport={"width": 390, "height": 844}).new_page()
        reader.set_default_timeout(90_000)
        reader.goto(f"{WEB}/newsletter/{handle}", wait_until="domcontentloaded")
        reader.get_by_role("textbox", name="Your e-mail address").fill(f"reader-{uuid.uuid4().hex[:8]}@example.com")
        for attempt in range(3):
            with reader.expect_response(lambda response: response.url.endswith('/newsletter/subscribe')) as subscribed:
                reader.get_by_role("button", name="Subscribe", exact=True).click()
            if subscribed.value.status < 500:
                break
            print(f"Newsletter sign-up temporarily unavailable; retry {attempt + 1}", flush=True)
        assert subscribed.value.status == 202
        expect(reader.get_by_role("heading", name="Check your inbox")).to_be_visible()
        assert len(sink.messages) == 1
        confirm = re.search(r"https?://\S+/creators/newsletter/confirm\?token=\S+", sink.messages[0]["body"])
        assert confirm
        confirmed = client.get(confirm.group(0))
        confirmed.raise_for_status()
        newsletter.get_by_role("button", name="Refresh subscribers").click()
        expect(newsletter.get_by_text("1 confirmed subscriber", exact=False)).to_be_visible()
        newsletter.get_by_role("button", name="Send to 1 subscriber…", exact=True).click()
        expect(newsletter.get_by_text("This goes out now", exact=False)).to_be_visible()
        newsletter.get_by_role("button", name="Send it now", exact=True).click()
        expect(newsletter.get_by_text("Sent to 1 person.", exact=True)).to_be_visible()
        check("Public signup, e-mail confirmation and confirmed newsletter sending work")
        assert len(sink.messages) == 2
        unsubscribe = sink.messages[-1]["headers"]["list-unsubscribe"].strip("<>")
        client.post(unsubscribe).raise_for_status()
        assert client.get("/creators/newsletter/subscribers", headers=headers(adult)).json()["confirmed"] == 0
        check("The unsubscribe link removes the recipient")

        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=str(ARTIFACTS / "studio-desktop.png"), full_page=True)
        page.get_by_role("radiogroup", name="Display mode").get_by_title("Light", exact=True).click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'light')
        page.screenshot(path=str(ARTIFACTS / "studio-light.png"), full_page=True)
        check("Studio renders in light mode")
        page.get_by_role("radiogroup", name="Display mode").get_by_title("Dark", exact=True).click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        page.set_viewport_size({"width": 390, "height": 844})
        check("Studio has no horizontal overflow at phone width", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        page.screenshot(path=str(ARTIFACTS / "studio-phone-top.png"))
        page.screenshot(path=str(ARTIFACTS / "studio-phone.png"), full_page=True)

        teen = context(minor, viewport={"width": 390, "height": 844}).new_page()
        teen.set_default_timeout(90_000)
        teen.goto(f"{WEB}/studio", wait_until="domcontentloaded")
        form = teen.get_by_role("form", name="Create", exact=True)
        expect(form).to_be_visible()
        expect(form.get_by_role("button", name="French", exact=True)).to_be_disabled()
        expect(form.get_by_text("Translation into other languages is not available", exact=False)).to_be_visible()
        form.get_by_label("Your idea, your draft").fill("A newsletter in my own language.")
        form.get_by_role("button", name="Article", exact=True).click()
        form.get_by_role("button", name="Newsletter", exact=True).click()
        form.get_by_role("button", name=re.compile(r"^Create ")).click()
        expect(teen.get_by_text("Newsletter sending requires a confirmed adult account.", exact=False)).to_be_visible()
        expect(teen.get_by_role("button", name="Send it now", exact=True)).to_have_count(0)
        check("A minor can create, but cannot translate or send newsletters")
        teen.screenshot(path=str(ARTIFACTS / "studio-minor.png"), full_page=True)

        fr = context(french).new_page()
        fr.set_default_timeout(90_000)
        fr.goto(f"{WEB}/studio", wait_until="domcontentloaded")
        expect(fr.get_by_label("Language the text is written in")).to_have_value("fr")
        check("The source language starts with the member's language")
        fr.goto(f"{WEB}/studio/privacy", wait_until="domcontentloaded")
        expect(fr.get_by_role("heading", name="Your content in Creator Studio")).to_be_visible()
        check("The Studio content disclosure is publicly accessible")

        # A failed job lookup must not leave the previous result displayed.
        page.goto(f"{WEB}/studio?job=missing-browser-fixture", wait_until="domcontentloaded")
        expect(page.get_by_role("region", name="Results", exact=True)).to_have_count(0)
        expect(page.get_by_role("alert")).to_be_visible()
        check("An invalid job shows an error without stale results")
        if errors:
            print("Uncaught browser errors: " + repr(errors), flush=True)
        check("No uncaught browser errors", not errors)
        browser.close()
finally:
    # Remove the posts and jobs made by these isolated fixture accounts.
    for account in accounts:
        h = headers(account)
        try:
            for path in (f"/posts/by/{account['user']['id']}?limit=100", "/posts/scheduled"):
                for post in client.get(path, headers=h).json().get("items", []):
                    client.delete(f"/posts/{post['id']}", headers=h)
            for job in client.get("/creators/publish?limit=50", headers=h).json().get("items", []):
                client.delete(f"/creators/publish/{job['job_id']}", headers=h)
        except (httpx.HTTPError, ValueError):
            print("Fixture cleanup could not reach the API", flush=True)
    sink.stop()

print(f"ALL BROWSER CHECKS PASSED; screenshots: {ARTIFACTS}", flush=True)
