"""Regression tests for the new protected admin board endpoints (iteration 3).

Covers:
 - GET /api/admin/board/today  -> unmasked slot values, auth required
 - GET /api/admin/board/date/{date} -> auth required, validation
 - Public GET /api/board/today still masks future slots
 - PUT /api/board/slot targets the right slot ($elemMatch regression)
"""
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


def today_ist():
    return datetime.now(IST).strftime("%Y-%m-%d")


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_headers(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


# ---------- Auth guard on admin board endpoints ----------
class TestAdminBoardAuth:
    def test_admin_today_requires_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/board/today")
        assert r.status_code == 401, r.text

    def test_admin_date_requires_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/board/date/{today_ist()}")
        assert r.status_code == 401, r.text

    def test_admin_today_bad_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/board/today",
                         headers={"Authorization": "Bearer not.a.jwt"})
        assert r.status_code == 401


# ---------- Unmasked admin view ----------
class TestAdminBoardUnmasked:
    def test_all_63_slots_have_values(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/admin/board/today", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["date"] == today_ist()
        assert d["is_today"] is True
        assert len(d["slots"]) == 63
        assert "_id" not in d
        for s in d["slots"]:
            assert s["revealed"] is True, f"{s['time']} not marked revealed for admin"
            for k in ("a", "b", "c"):
                v = s[k]
                assert isinstance(v, str) and len(v) == 2 and v.isdigit(), \
                    f"slot {s['time']} column {k} not a 2-digit string: {v!r}"

    def test_latest_slot_index_matches_public(self, api_client, auth_headers):
        pub = api_client.get(f"{BASE_URL}/api/board/today").json()
        adm = api_client.get(f"{BASE_URL}/api/admin/board/today", headers=auth_headers).json()
        assert adm["latest_slot_index"] == pub["latest_slot_index"]

    def test_admin_values_match_public_for_revealed(self, api_client, auth_headers):
        pub = api_client.get(f"{BASE_URL}/api/board/today").json()["slots"]
        adm = api_client.get(f"{BASE_URL}/api/admin/board/today", headers=auth_headers).json()["slots"]
        for p, a in zip(pub, adm):
            if p["revealed"]:
                assert (p["a"], p["b"], p["c"]) == (a["a"], a["b"], a["c"]), f"mismatch at {p['time']}"

    def test_public_still_masks_future_slots(self, api_client):
        d = api_client.get(f"{BASE_URL}/api/board/today").json()
        now = datetime.now(IST)
        cur = now.hour * 60 + now.minute
        future = [s for s in d["slots"] if s["hour"] * 60 + s["minute"] > cur]
        for s in future:
            assert s["revealed"] is False
            assert s["a"] is None and s["b"] is None and s["c"] is None, \
                f"public leak at {s['time']}"

    def test_admin_date_endpoint_today(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/admin/board/date/{today_ist()}", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["slots"]) == 63
        assert all(s["a"] is not None for s in d["slots"])

    def test_admin_date_future_rejected(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/admin/board/date/2099-12-31", headers=auth_headers)
        assert r.status_code == 400

    def test_admin_date_invalid_format(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/admin/board/date/05-08-2026", headers=auth_headers)
        assert r.status_code == 400

    def test_admin_date_unknown_past_404(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/admin/board/date/2001-01-01", headers=auth_headers)
        assert r.status_code == 404


# ---------- $elemMatch targeting regression ----------
class TestSlotTargeting:
    def test_update_1710_does_not_touch_0900(self, api_client, auth_headers):
        date = today_ist()
        adm = api_client.get(f"{BASE_URL}/api/admin/board/today", headers=auth_headers).json()
        slots = adm["slots"]
        idx_first = next(i for i, s in enumerate(slots) if s["hour"] == 9 and s["minute"] == 0)
        idx_target = next(i for i, s in enumerate(slots) if s["hour"] == 17 and s["minute"] == 10)
        first_before = (slots[idx_first]["a"], slots[idx_first]["b"], slots[idx_first]["c"])
        target_before = (slots[idx_target]["a"], slots[idx_target]["b"], slots[idx_target]["c"])

        r = api_client.put(f"{BASE_URL}/api/board/slot", headers=auth_headers,
                           json={"date": date, "hour": 17, "minute": 10,
                                 "a": "77", "b": "88", "c": "99"})
        assert r.status_code == 200, r.text

        after = api_client.get(f"{BASE_URL}/api/admin/board/today", headers=auth_headers).json()["slots"]
        assert (after[idx_target]["a"], after[idx_target]["b"], after[idx_target]["c"]) == ("77", "88", "99")
        assert (after[idx_first]["a"], after[idx_first]["b"], after[idx_first]["c"]) == first_before, \
            "9:00 AM slot was mutated by a 5:10 PM update"

        # restore
        api_client.put(f"{BASE_URL}/api/board/slot", headers=auth_headers,
                       json={"date": date, "hour": 17, "minute": 10,
                             "a": target_before[0], "b": target_before[1], "c": target_before[2]})

    def test_empty_value_rejected_by_backend(self, api_client, auth_headers):
        r = api_client.put(f"{BASE_URL}/api/board/slot", headers=auth_headers,
                           json={"date": today_ist(), "hour": 17, "minute": 10,
                                 "a": "", "b": "", "c": ""})
        assert r.status_code == 400
