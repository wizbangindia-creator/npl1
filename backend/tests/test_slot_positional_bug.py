"""Regression test: PUT /api/board/slot must update the exact (hour, minute) slot."""
import os
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env["REACT_APP_BACKEND_URL"]).rstrip("/")
IST = timezone(timedelta(hours=5, minutes=30))
ADMIN = {"email": "admin@shivshakti.local", "password": "shivshakti2026"}


@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_update_targets_correct_slot(headers):
    """Update the 12:00 PM slot; the 9:00 AM slot (same minute=0) must stay unchanged."""
    date = datetime.now(IST).strftime("%Y-%m-%d")
    before = requests.get(f"{BASE_URL}/api/board/today").json()["slots"]
    idx_900 = next(i for i, s in enumerate(before) if s["hour"] == 9 and s["minute"] == 0)
    idx_1200 = next(i for i, s in enumerate(before) if s["hour"] == 12 and s["minute"] == 0)
    orig_900 = (before[idx_900]["a"], before[idx_900]["b"], before[idx_900]["c"])

    r = requests.put(f"{BASE_URL}/api/board/slot", headers=headers,
                     json={"date": date, "hour": 12, "minute": 0, "a": "41", "b": "42", "c": "43"})
    assert r.status_code == 200, r.text

    after = requests.get(f"{BASE_URL}/api/board/today").json()["slots"]
    got_1200 = (after[idx_1200]["a"], after[idx_1200]["b"], after[idx_1200]["c"])
    got_900 = (after[idx_900]["a"], after[idx_900]["b"], after[idx_900]["c"])
    assert got_900 == orig_900, f"9:00 AM slot was wrongly modified: {orig_900} -> {got_900}"
    assert got_1200 == ("41", "42", "43"), f"12:00 PM slot not updated, got {got_1200}"
