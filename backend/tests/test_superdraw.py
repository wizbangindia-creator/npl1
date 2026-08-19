"""Super Draw feature tests (iteration 4)."""
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
IST = timezone(timedelta(hours=5, minutes=30))
REVEAL_MIN = 11 * 60 + 30


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def test_credentials():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing credentials file")
    c = p.read_text()
    e = re.search(r'(?im)^\s*(?:[-*]\s*)?\**email\**\s*:\s*\**\s*`?([^`\s*]+)', c)
    pw = re.search(r'(?im)^\s*(?:[-*]\s*)?\**password\**\s*:\s*\**\s*`?([^`\s*]+)', c)
    if not e or not pw:
        pytest.skip("no creds parsed")
    return {"email": e.group(1), "password": pw.group(1)}


@pytest.fixture(scope="module")
def auth_token(api_client, test_credentials):
    r = api_client.post(f"{BASE_URL}/api/auth/login", json=test_credentials)
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:300]}")
    t = r.json().get("token")
    assert isinstance(t, str) and t
    return t


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


def today_ist():
    return datetime.now(IST).strftime("%Y-%m-%d")


# --- Public GET /api/superdraw/today ---
class TestSuperDrawToday:
    def test_today_shape_and_reveal_logic(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/superdraw/today")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["date", "number", "reveal_time", "current_time_ist", "revealed", "is_today"]:
            assert k in d, f"missing key {k}"
        assert d["date"] == today_ist()
        assert d["reveal_time"] == "11:30 AM"
        assert d["is_today"] is True
        assert "_id" not in d
        now = datetime.now(IST)
        should_reveal = (now.hour * 60 + now.minute) >= REVEAL_MIN
        assert d["revealed"] is should_reveal
        if should_reveal:
            assert isinstance(d["number"], str) and re.fullmatch(r"\d{2}", d["number"])
        else:
            assert d["number"] is None

    def test_number_stable_across_calls(self, api_client, auth_headers):
        a = api_client.get(f"{BASE_URL}/api/admin/superdraw/today", headers=auth_headers).json()
        b = api_client.get(f"{BASE_URL}/api/superdraw/today").json()
        c = api_client.get(f"{BASE_URL}/api/admin/superdraw/today", headers=auth_headers).json()
        assert a["number"] == c["number"], "number regenerated between calls"
        assert b["date"] == a["date"]


# --- Public GET /api/superdraw/date/{date} ---
class TestSuperDrawByDate:
    def test_today_via_date(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/superdraw/date/{today_ist()}")
        assert r.status_code == 200, r.text
        assert r.json()["is_today"] is True

    def test_future_date_400(self, api_client):
        future = (datetime.now(IST) + timedelta(days=3)).strftime("%Y-%m-%d")
        r = api_client.get(f"{BASE_URL}/api/superdraw/date/{future}")
        assert r.status_code == 400, r.text
        assert "future" in r.json()["detail"].lower()

    def test_unknown_past_date_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/superdraw/date/1999-01-02")
        assert r.status_code == 404, r.text

    @pytest.mark.parametrize("bad", ["2026-13-40", "not-a-date", "20260101"])
    def test_invalid_format_400(self, api_client, bad):
        r = api_client.get(f"{BASE_URL}/api/superdraw/date/{bad}")
        assert r.status_code == 400, f"{bad} -> {r.status_code} {r.text[:200]}"


# --- Admin GET /api/admin/superdraw/today ---
class TestAdminSuperDrawGet:
    def test_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/admin/superdraw/today")
        assert r.status_code == 401, r.text

    def test_bad_token_401(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/admin/superdraw/today",
                           headers={"Authorization": "Bearer garbage"})
        assert r.status_code == 401

    def test_returns_unmasked(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/admin/superdraw/today", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["revealed"] is True
        assert re.fullmatch(r"\d{2}", d["number"] or "")


# --- PUT /api/superdraw ---
class TestSuperDrawUpdate:
    def test_requires_auth(self, api_client):
        r = api_client.put(f"{BASE_URL}/api/superdraw", json={"date": today_ist(), "number": "77"})
        assert r.status_code == 401, r.text

    def test_update_and_persist(self, api_client, auth_headers):
        orig = api_client.get(f"{BASE_URL}/api/admin/superdraw/today", headers=auth_headers).json()["number"]
        target = "77" if orig != "77" else "42"
        r = api_client.put(f"{BASE_URL}/api/superdraw", headers=auth_headers,
                           json={"date": today_ist(), "number": target})
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True
        g = api_client.get(f"{BASE_URL}/api/admin/superdraw/today", headers=auth_headers).json()
        assert g["number"] == target
        pub = api_client.get(f"{BASE_URL}/api/superdraw/today").json()
        if pub["revealed"]:
            assert pub["number"] == target
        # restore
        api_client.put(f"{BASE_URL}/api/superdraw", headers=auth_headers,
                       json={"date": today_ist(), "number": orig})

    @pytest.mark.parametrize("bad", ["7", "7a", "123", "", "  "])
    def test_invalid_number_400(self, api_client, auth_headers, bad):
        r = api_client.put(f"{BASE_URL}/api/superdraw", headers=auth_headers,
                           json={"date": today_ist(), "number": bad})
        assert r.status_code == 400, f"{bad!r} -> {r.status_code}"

    def test_unknown_past_date_404(self, api_client, auth_headers):
        r = api_client.put(f"{BASE_URL}/api/superdraw", headers=auth_headers,
                           json={"date": "1999-01-02", "number": "55"})
        assert r.status_code == 404, r.text


# --- Regression: main board slot update ---
class TestBoardSlotRegression:
    def test_slot_update_targets_correct_slot(self, api_client, auth_headers):
        board = api_client.get(f"{BASE_URL}/api/admin/board/today", headers=auth_headers).json()
        slots = board["slots"]
        assert len(slots) > 5
        idx = 3
        s = slots[idx]
        others_before = [(x["hour"], x["minute"], x["a"], x["b"], x["c"]) for i, x in enumerate(slots) if i != idx]
        r = api_client.put(f"{BASE_URL}/api/board/slot", headers=auth_headers, json={
            "date": board["date"], "hour": s["hour"], "minute": s["minute"],
            "a": "11", "b": "22", "c": "33"})
        assert r.status_code == 200, r.text
        after = api_client.get(f"{BASE_URL}/api/admin/board/today", headers=auth_headers).json()["slots"]
        assert (after[idx]["a"], after[idx]["b"], after[idx]["c"]) == ("11", "22", "33")
        others_after = [(x["hour"], x["minute"], x["a"], x["b"], x["c"]) for i, x in enumerate(after) if i != idx]
        assert others_before == others_after, "other slots mutated"
        # restore
        api_client.put(f"{BASE_URL}/api/board/slot", headers=auth_headers, json={
            "date": board["date"], "hour": s["hour"], "minute": s["minute"],
            "a": s["a"], "b": s["b"], "c": s["c"]})
