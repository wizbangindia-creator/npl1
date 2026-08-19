"""Backend API tests for Shivshaktiloto (board, auth, admin overrides)."""
import os
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

IST = timezone(timedelta(hours=5, minutes=30))
ADMIN_EMAIL = "admin@shivshakti.local"
ADMIN_PASSWORD = "shivshakti2026"


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def today_ist():
    return datetime.now(IST).strftime("%Y-%m-%d")


# ---------- Health ----------
class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert "message" in r.json()


# ---------- Public board ----------
class TestBoardToday:
    def test_today_structure_and_reveal(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/board/today")
        assert r.status_code == 200
        d = r.json()
        assert d["date"] == today_ist()
        assert d["is_today"] is True
        assert len(d["slots"]) == 63, f"expected 63 slots, got {len(d['slots'])}"
        assert "_id" not in d
        now = datetime.now(IST)
        cur = now.hour * 60 + now.minute
        latest = -1
        for i, s in enumerate(d["slots"]):
            slot_min = s["hour"] * 60 + s["minute"]
            should_reveal = slot_min <= cur
            assert s["revealed"] == should_reveal, f"slot {s['time']} reveal mismatch"
            if should_reveal:
                latest = i
                for k in ("a", "b", "c"):
                    assert isinstance(s[k], str) and len(s[k]) == 2 and s[k].isdigit()
            else:
                assert s["a"] is None and s["b"] is None and s["c"] is None
        assert d["latest_slot_index"] == latest

    def test_slot_times_schedule(self, api_client):
        d = api_client.get(f"{BASE_URL}/api/board/today").json()
        slots = d["slots"]
        assert slots[0]["time"] == "9:00 AM"
        assert slots[32]["time"] == "5:00 PM"
        assert slots[33]["time"] == "5:10 PM"
        assert slots[-1]["time"] == "10:00 PM"
        # morning cadence 15 min
        for i in range(1, 33):
            prev = slots[i - 1]["hour"] * 60 + slots[i - 1]["minute"]
            cur = slots[i]["hour"] * 60 + slots[i]["minute"]
            assert cur - prev == 15
        for i in range(34, 63):
            prev = slots[i - 1]["hour"] * 60 + slots[i - 1]["minute"]
            cur = slots[i]["hour"] * 60 + slots[i]["minute"]
            assert cur - prev == 10

    def test_numbers_stable_across_calls(self, api_client):
        a = api_client.get(f"{BASE_URL}/api/board/today").json()
        b = api_client.get(f"{BASE_URL}/api/board/today").json()
        rev_a = [(s["a"], s["b"], s["c"]) for s in a["slots"] if s["revealed"]]
        rev_b = [(s["a"], s["b"], s["c"]) for s in b["slots"] if s["revealed"]]
        assert rev_a == rev_b


class TestBoardByDate:
    def test_today_via_date(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/board/date/{today_ist()}")
        assert r.status_code == 200
        d = r.json()
        assert d["is_today"] is True
        assert len(d["slots"]) == 63

    def test_future_date_rejected(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/board/date/2099-12-31")
        assert r.status_code == 400
        assert "future" in r.json()["detail"].lower()

    def test_invalid_format(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/board/date/05-08-2026")
        assert r.status_code == 400

    def test_unknown_past_date_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/board/date/2001-01-01")
        assert r.status_code == 404

    def test_dates_list(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/board/dates")
        assert r.status_code == 200
        dates = r.json()["dates"]
        assert isinstance(dates, list)
        assert today_ist() in dates


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert isinstance(d["token"], str) and len(d["token"].split(".")) == 3

    def test_login_email_case_insensitive(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": ADMIN_EMAIL.upper(), "password": ADMIN_PASSWORD})
        assert r.status_code == 200

    def test_login_wrong_password(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_unknown_user(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": "nobody@x.test", "password": "x"})
        assert r.status_code == 401

    def test_login_missing_fields(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL})
        assert r.status_code == 422

    def test_me_with_token(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json() == {"email": ADMIN_EMAIL, "role": "admin"}

    def test_me_without_token(self, api_client):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_bad_token(self, api_client):
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": "Bearer not.a.jwt"})
        assert r.status_code == 401

    def test_protected_endpoints_require_auth(self):
        r = requests.put(f"{BASE_URL}/api/board/slot",
                         json={"date": today_ist(), "hour": 9, "minute": 0,
                               "a": "11", "b": "22", "c": "33"})
        assert r.status_code == 401
        r2 = requests.post(f"{BASE_URL}/api/board/regenerate")
        assert r2.status_code == 401


# ---------- Admin slot override ----------
class TestSlotUpdate:
    def test_update_slot_persists(self, api_client, auth_headers):
        date = today_ist()
        before = api_client.get(f"{BASE_URL}/api/board/today").json()
        # pick first revealed slot so we can read values back
        idx = next(i for i, s in enumerate(before["slots"]) if s["revealed"])
        slot = before["slots"][idx]
        orig = (slot["a"], slot["b"], slot["c"])
        payload = {"date": date, "hour": slot["hour"], "minute": slot["minute"],
                   "a": "07", "b": "88", "c": "99"}
        r = api_client.put(f"{BASE_URL}/api/board/slot", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

        after = api_client.get(f"{BASE_URL}/api/board/today").json()["slots"][idx]
        assert (after["a"], after["b"], after["c"]) == ("07", "88", "99")

        # restore
        api_client.put(f"{BASE_URL}/api/board/slot", headers=auth_headers,
                       json={"date": date, "hour": slot["hour"], "minute": slot["minute"],
                             "a": orig[0], "b": orig[1], "c": orig[2]})

    @pytest.mark.parametrize("bad", [
        {"a": "5", "b": "22", "c": "33"},
        {"a": "123", "b": "22", "c": "33"},
        {"a": "ab", "b": "22", "c": "33"},
        {"a": "", "b": "22", "c": "33"},
    ])
    def test_invalid_values_rejected(self, api_client, auth_headers, bad):
        payload = {"date": today_ist(), "hour": 9, "minute": 0}
        payload.update(bad)
        r = api_client.put(f"{BASE_URL}/api/board/slot", json=payload, headers=auth_headers)
        assert r.status_code == 400, f"expected 400 for {bad}, got {r.status_code}"

    def test_unknown_slot_404(self, api_client, auth_headers):
        r = api_client.put(f"{BASE_URL}/api/board/slot", headers=auth_headers,
                           json={"date": today_ist(), "hour": 3, "minute": 7,
                                 "a": "11", "b": "22", "c": "33"})
        assert r.status_code == 404


# ---------- Regenerate ----------
class TestRegenerate:
    def test_regenerate_creates_fresh_numbers(self, api_client, auth_headers):
        before = api_client.get(f"{BASE_URL}/api/board/today").json()
        r = api_client.post(f"{BASE_URL}/api/board/regenerate", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["date"] == today_ist()
        assert d["slot_count"] == 63
        after = api_client.get(f"{BASE_URL}/api/board/today").json()
        assert len(after["slots"]) == 63
        rev_before = [(s["a"], s["b"], s["c"]) for s in before["slots"] if s["revealed"]]
        rev_after = [(s["a"], s["b"], s["c"]) for s in after["slots"] if s["revealed"]]
        assert len(rev_after) == len(rev_before)
        if len(rev_before) > 5:
            assert rev_before != rev_after, "regenerate did not change numbers"
