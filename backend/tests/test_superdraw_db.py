"""Mongo-level checks for super_draws: one doc per date, past-date reveal."""
import os
import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

benv = dotenv_values("/app/backend/.env")
fenv = dotenv_values("/app/frontend/.env")
BASE_URL = fenv["REACT_APP_BACKEND_URL"].rstrip("/")
MONGO_URL = benv["MONGO_URL"].strip('"')
DB_NAME = benv["DB_NAME"].strip('"')

PAST_DATE = "2026-01-05"


@pytest.fixture(scope="module")
def col():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME].super_draws
    c[DB_NAME].super_draws.delete_one({"date": PAST_DATE})
    c.close()


def test_one_doc_per_date(col):
    for _ in range(4):
        requests.get(f"{BASE_URL}/api/superdraw/today")
    from datetime import datetime, timedelta, timezone
    today = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")
    assert col.count_documents({"date": today}) == 1
    # no duplicate dates overall
    dates = [d["date"] for d in col.find({}, {"_id": 0, "date": 1})]
    assert len(dates) == len(set(dates)), f"duplicate super_draw dates: {dates}"


def test_unique_index_on_date(col):
    idx = col.index_information()
    has_unique = any(v.get("unique") and v["key"][0][0] == "date" for v in idx.values())
    assert has_unique, "super_draws.date has no unique index (race can create duplicates)"


def test_past_date_revealed(col):
    col.delete_one({"date": PAST_DATE})
    col.insert_one({"date": PAST_DATE, "number": "88", "generated_at": "seed"})
    r = requests.get(f"{BASE_URL}/api/superdraw/date/{PAST_DATE}")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["revealed"] is True
    assert d["number"] == "88"
    assert d["is_today"] is False
