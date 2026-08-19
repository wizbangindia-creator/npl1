"""Backend tests for admin upcoming slot, hold/release, and change-password flows."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = f"{BASE_URL}/api"
IST = timezone(timedelta(hours=5, minutes=30))

ADMIN_EMAIL = "admin@shivshakti.local"
ADMIN_PASSWORD = "shivshakti2026"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- login ----------
def test_login_ok(token):
    assert isinstance(token, str) and len(token) > 20


def test_login_bad_pw():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongwrong"})
    assert r.status_code == 401


# ---------- upcoming ----------
def test_upcoming_requires_auth():
    r = requests.get(f"{API}/admin/board/upcoming")
    assert r.status_code == 401


def test_upcoming_returns_single_slot(auth_headers):
    r = requests.get(f"{API}/admin/board/upcoming", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "slot" in data and "index" in data
    if data["slot"] is not None:
        s = data["slot"]
        for k in ["time", "hour", "minute", "a", "b", "c", "held", "released"]:
            assert k in s
        # slot must not be in the past unless held (revealed==False)
        now_ist = datetime.now(IST)
        slot_min = s["hour"] * 60 + s["minute"]
        cur_min = now_ist.hour * 60 + now_ist.minute
        # Should be upcoming: either time not reached, or held-but-within-window
        if slot_min < cur_min:
            assert s.get("held") is True and not s.get("released"), (
                f"Past slot returned as upcoming without hold: {s}"
            )


# ---------- save A/B/C ----------
def test_save_ab_c_persists(auth_headers):
    r = requests.get(f"{API}/admin/board/upcoming", headers=auth_headers)
    data = r.json()
    if not data.get("slot"):
        pytest.skip("No upcoming slot right now")
    slot = data["slot"]
    payload = {
        "date": data["date"],
        "hour": slot["hour"],
        "minute": slot["minute"],
        "a": "11", "b": "22", "c": "33",
    }
    r = requests.put(f"{API}/board/slot", json=payload, headers=auth_headers)
    assert r.status_code == 200, r.text
    r2 = requests.get(f"{API}/admin/board/upcoming", headers=auth_headers)
    d2 = r2.json()
    assert d2["slot"]["hour"] == slot["hour"] and d2["slot"]["minute"] == slot["minute"]
    assert d2["slot"]["a"] == "11"
    assert d2["slot"]["b"] == "22"
    assert d2["slot"]["c"] == "33"


def test_save_invalid_digits_rejected(auth_headers):
    r = requests.get(f"{API}/admin/board/upcoming", headers=auth_headers)
    data = r.json()
    if not data.get("slot"):
        pytest.skip("No upcoming slot right now")
    slot = data["slot"]
    r = requests.put(f"{API}/board/slot", json={
        "date": data["date"], "hour": slot["hour"], "minute": slot["minute"],
        "a": "1", "b": "22", "c": "33",
    }, headers=auth_headers)
    assert r.status_code == 400


# ---------- hold / release ----------
def test_hold_and_release(auth_headers):
    r = requests.get(f"{API}/admin/board/upcoming", headers=auth_headers)
    data = r.json()
    if not data.get("slot"):
        pytest.skip("No upcoming slot right now")
    slot = data["slot"]
    body = {"date": data["date"], "hour": slot["hour"], "minute": slot["minute"]}

    r = requests.post(f"{API}/board/slot/hold", json=body, headers=auth_headers)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/admin/board/upcoming", headers=auth_headers)
    d2 = r2.json()
    # The same slot should now show held=True, released=False
    if d2["slot"] and d2["slot"]["hour"] == slot["hour"] and d2["slot"]["minute"] == slot["minute"]:
        assert d2["slot"]["held"] is True
        assert d2["slot"]["released"] is False

    r = requests.post(f"{API}/board/slot/release", json=body, headers=auth_headers)
    assert r.status_code == 200
    r3 = requests.get(f"{API}/admin/board/upcoming", headers=auth_headers)
    d3 = r3.json()
    # After release: either same slot released=True, or upcoming moved on
    if d3["slot"] and d3["slot"]["hour"] == slot["hour"] and d3["slot"]["minute"] == slot["minute"]:
        assert d3["slot"]["released"] is True


def test_hold_masks_on_public_board_when_time_reached(auth_headers):
    """Hold a past-time slot and verify public board hides it; then release restores it."""
    # Pick a slot whose time has already passed today
    r = requests.get(f"{API}/api" if False else f"{API}/board/today")
    assert r.status_code == 200
    board = r.json()
    now_ist = datetime.now(IST)
    cur_min = now_ist.hour * 60 + now_ist.minute
    past_slot = None
    for s in board["slots"]:
        if s["hour"] * 60 + s["minute"] <= cur_min and s["revealed"]:
            past_slot = s
    if not past_slot:
        pytest.skip("No past revealed slot to test hold-masking")
    body = {"date": board["date"], "hour": past_slot["hour"], "minute": past_slot["minute"]}

    # Hold it
    r = requests.post(f"{API}/board/slot/hold", json=body, headers=auth_headers)
    assert r.status_code == 200

    # Check public board within 60s window: could be masked or already auto-released.
    r = requests.get(f"{API}/board/today")
    slots = r.json()["slots"]
    match = next(s for s in slots if s["hour"] == past_slot["hour"] and s["minute"] == past_slot["minute"])
    slot_dt = now_ist.replace(hour=past_slot["hour"], minute=past_slot["minute"], second=0, microsecond=0)
    seconds_since = (datetime.now(IST) - slot_dt).total_seconds()
    if seconds_since < 60:
        assert match["revealed"] is False, "Held slot within 60s window should not be revealed publicly"
    else:
        assert match["revealed"] is True, "After 60s hold window, slot should auto-reveal"

    # Release restores reveal
    r = requests.post(f"{API}/board/slot/release", json=body, headers=auth_headers)
    assert r.status_code == 200
    r = requests.get(f"{API}/board/today")
    slots = r.json()["slots"]
    match = next(s for s in slots if s["hour"] == past_slot["hour"] and s["minute"] == past_slot["minute"])
    assert match["revealed"] is True


# ---------- change password ----------
def test_change_password_wrong_current(auth_headers):
    r = requests.post(f"{API}/auth/change-password",
                      json={"current_password": "not-the-password", "new_password": "shivshakti2026"},
                      headers=auth_headers)
    assert r.status_code == 401


def test_change_password_full_cycle(auth_headers):
    new_pw = "TempPass_9182"
    # 1) change
    r = requests.post(f"{API}/auth/change-password",
                      json={"current_password": ADMIN_PASSWORD, "new_password": new_pw},
                      headers=auth_headers)
    assert r.status_code == 200, r.text

    # 2) old password fails
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 401

    # 3) new password works
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": new_pw})
    assert r.status_code == 200
    new_token = r.json()["token"]

    # 4) revert
    r = requests.post(f"{API}/auth/change-password",
                      json={"current_password": new_pw, "new_password": ADMIN_PASSWORD},
                      headers={"Authorization": f"Bearer {new_token}"})
    assert r.status_code == 200

    # 5) original password works again
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200


# ---------- public board ----------
def test_public_board_loads():
    r = requests.get(f"{API}/board/today")
    assert r.status_code == 200
    data = r.json()
    assert "slots" in data and len(data["slots"]) > 0
