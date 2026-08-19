"""Unit test of build_super_response reveal-gate at 11:30 AM IST (clock injected)."""
import sys
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, "/app/backend")
import server  # noqa: E402

IST = timezone(timedelta(hours=5, minutes=30))


class FakeDT(datetime):
    fixed = None

    @classmethod
    def now(cls, tz=None):
        return cls.fixed.astimezone(tz) if tz else cls.fixed


@pytest.fixture
def patch_clock(monkeypatch):
    def _set(dt):
        FakeDT.fixed = dt
        monkeypatch.setattr(server, "datetime", FakeDT)
    return _set


@pytest.mark.parametrize("hh,mm,expect_revealed", [
    (0, 1, False), (11, 29, False), (11, 30, True), (11, 31, True), (23, 59, True),
])
def test_reveal_gate(patch_clock, hh, mm, expect_revealed):
    now = datetime(2026, 8, 5, hh, mm, 0, tzinfo=IST)
    patch_clock(now)
    doc = {"date": "2026-08-05", "number": "42"}
    resp = server.build_super_response(doc)
    assert resp.revealed is expect_revealed
    assert resp.is_today is True
    assert resp.reveal_time == "11:30 AM"
    assert resp.number == ("42" if expect_revealed else None)


def test_admin_view_bypasses_gate(patch_clock):
    patch_clock(datetime(2026, 8, 5, 6, 0, 0, tzinfo=IST))
    resp = server.build_super_response({"date": "2026-08-05", "number": "42"}, admin_view=True)
    assert resp.revealed is True and resp.number == "42"
