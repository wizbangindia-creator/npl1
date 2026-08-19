from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import random
import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta


# ---------- Config ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'
JWT_EXP_HOURS = 12
ADMIN_EMAIL = os.environ['ADMIN_EMAIL'].lower()
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']

IST = timezone(timedelta(hours=5, minutes=30))

app = FastAPI(title="Shivshaktiloto API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ---------- Auth utils ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_token(email: str) -> str:
    payload = {
        'sub': email,
        'role': 'admin',
        'type': 'access',
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def require_admin(authorization: str = Header(default='')) -> dict:
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')
    if payload.get('role') != 'admin' or payload.get('type') != 'access':
        raise HTTPException(status_code=403, detail='Forbidden')
    return payload


# ---------- Slot helpers ----------
def generate_slot_times():
    slots = []
    m = 9 * 60
    while m <= 17 * 60:  # 9:00 through 17:00 inclusive
        slots.append((m // 60, m % 60))
        m += 15
    m = 17 * 60 + 10
    while m <= 22 * 60:  # 17:10 through 22:00 inclusive
        slots.append((m // 60, m % 60))
        m += 10
    return slots


def format_time_12h(h: int, m: int) -> str:
    period = 'AM' if h < 12 else 'PM'
    dh = h % 12
    if dh == 0:
        dh = 12
    return f"{dh}:{m:02d} {period}"


def two_digit_random() -> str:
    return f"{random.randint(0, 99):02d}"


def today_str_ist() -> str:
    return datetime.now(IST).strftime('%Y-%m-%d')


# ---------- Models ----------
class Slot(BaseModel):
    time: str
    hour: int
    minute: int
    a: Optional[str] = None
    b: Optional[str] = None
    c: Optional[str] = None
    revealed: bool = False


class BoardResponse(BaseModel):
    date: str
    current_time_ist: str
    current_hour: int
    current_minute: int
    slots: List[Slot]
    is_today: bool
    latest_slot_index: int


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    email: str


class SlotUpdate(BaseModel):
    date: str
    hour: int
    minute: int
    a: str
    b: str
    c: str


class SlotHold(BaseModel):
    date: str
    hour: int
    minute: int


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ---------- Board persistence ----------
async def ensure_board(date_str: str) -> dict:
    existing = await db.boards.find_one({'date': date_str}, {'_id': 0})
    if existing:
        return existing
    now_ist = datetime.now(IST)
    slot_docs = [
        {'hour': h, 'minute': m, 'a': two_digit_random(), 'b': two_digit_random(), 'c': two_digit_random()}
        for (h, m) in generate_slot_times()
    ]
    doc = {'date': date_str, 'slots': slot_docs, 'generated_at': now_ist.isoformat()}
    try:
        await db.boards.insert_one(dict(doc))
    except Exception as e:
        logger.warning(f'Insert race on board: {e}')
        existing = await db.boards.find_one({'date': date_str}, {'_id': 0})
        if existing:
            return existing
        raise
    return doc


HOLD_MAX_SECONDS = 60


def slot_reveal_state(s: dict, date_str: str, now_ist: datetime):
    """Public reveal state for a slot: (revealed, hold_remaining_seconds)."""
    today_str = now_ist.strftime('%Y-%m-%d')
    if date_str < today_str:
        return True, None
    if date_str != today_str:
        return False, None
    h, m = int(s['hour']), int(s['minute'])
    slot_min = h * 60 + m
    cur_min = now_ist.hour * 60 + now_ist.minute
    if slot_min > cur_min:
        return False, None  # reveal time not reached yet
    if not s.get('held') or s.get('released'):
        return True, None
    slot_dt = now_ist.replace(hour=h, minute=m, second=0, microsecond=0)
    hold_end = slot_dt + timedelta(seconds=HOLD_MAX_SECONDS)
    if now_ist >= hold_end:
        return True, None  # 60s window elapsed -> auto released
    remaining = int((hold_end - now_ist).total_seconds()) + 1
    return False, remaining


def build_board_response(doc: dict) -> BoardResponse:
    now_ist = datetime.now(IST)
    today_str = now_ist.strftime('%Y-%m-%d')
    is_today = doc['date'] == today_str

    result: List[Slot] = []
    latest_idx = -1
    for i, s in enumerate(doc['slots']):
        h, m = int(s['hour']), int(s['minute'])
        revealed, _ = slot_reveal_state(s, doc['date'], now_ist)
        if revealed:
            latest_idx = i
        result.append(Slot(
            time=format_time_12h(h, m),
            hour=h, minute=m,
            a=s['a'] if revealed else None,
            b=s['b'] if revealed else None,
            c=s['c'] if revealed else None,
            revealed=revealed,
        ))
    return BoardResponse(
        date=doc['date'],
        current_time_ist=now_ist.strftime('%I:%M:%S %p'),
        current_hour=now_ist.hour,
        current_minute=now_ist.minute,
        slots=result,
        is_today=is_today,
        latest_slot_index=latest_idx,
    )


# ---------- Routes ----------
@api_router.get('/')
async def root():
    return {'message': 'Shivshaktiloto API live'}


@api_router.post('/auth/login', response_model=LoginResponse)
async def login(req: LoginRequest):
    email = (req.email or '').lower().strip()
    admin = await db.users.find_one({'email': email})
    if not admin or not verify_password(req.password, admin.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    if admin.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Forbidden')
    return LoginResponse(token=create_token(email), email=email)


@api_router.get('/auth/me')
async def me(payload: dict = Depends(require_admin)):
    return {'email': payload['sub'], 'role': payload['role']}


@api_router.get('/board/today', response_model=BoardResponse)
async def get_today_board():
    doc = await ensure_board(today_str_ist())
    return build_board_response(doc)


@api_router.get('/board/date/{date_str}', response_model=BoardResponse)
async def get_board_by_date(date_str: str):
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid date format (expected YYYY-MM-DD)')
    today = datetime.now(IST).date()
    if d > today:
        raise HTTPException(status_code=400, detail='Cannot view future dates')
    if d == today:
        doc = await ensure_board(date_str)
    else:
        doc = await db.boards.find_one({'date': date_str}, {'_id': 0})
        if not doc:
            raise HTTPException(status_code=404, detail='No board recorded for this date')
    return build_board_response(doc)


@api_router.get('/board/dates')
async def list_board_dates():
    rows = await db.boards.find({}, {'_id': 0, 'date': 1}).sort('date', -1).to_list(400)
    return {'dates': [r['date'] for r in rows]}


def build_admin_board_response(doc: dict) -> BoardResponse:
    """Admin view: returns ALL slot values regardless of reveal time."""
    now_ist = datetime.now(IST)
    today_str = now_ist.strftime('%Y-%m-%d')
    current_minutes = now_ist.hour * 60 + now_ist.minute
    result: List[Slot] = []
    latest_idx = -1
    for i, s in enumerate(doc['slots']):
        h, m = int(s['hour']), int(s['minute'])
        slot_min = h * 60 + m
        if doc['date'] == today_str and slot_min <= current_minutes:
            latest_idx = i
        result.append(Slot(
            time=format_time_12h(h, m),
            hour=h, minute=m,
            a=s['a'], b=s['b'], c=s['c'],
            revealed=True,
        ))
    return BoardResponse(
        date=doc['date'],
        current_time_ist=now_ist.strftime('%I:%M:%S %p'),
        current_hour=now_ist.hour,
        current_minute=now_ist.minute,
        slots=result,
        is_today=(doc['date'] == today_str),
        latest_slot_index=latest_idx,
    )


@api_router.get('/admin/board/today', response_model=BoardResponse, dependencies=[Depends(require_admin)])
async def admin_get_today():
    doc = await ensure_board(today_str_ist())
    return build_admin_board_response(doc)


@api_router.get('/admin/board/date/{date_str}', response_model=BoardResponse, dependencies=[Depends(require_admin)])
async def admin_get_by_date(date_str: str):
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid date format (expected YYYY-MM-DD)')
    today = datetime.now(IST).date()
    if d > today:
        raise HTTPException(status_code=400, detail='Cannot view future dates')
    if d == today:
        doc = await ensure_board(date_str)
    else:
        doc = await db.boards.find_one({'date': date_str}, {'_id': 0})
        if not doc:
            raise HTTPException(status_code=404, detail='No board recorded for this date')
    return build_admin_board_response(doc)


@api_router.put('/board/slot', dependencies=[Depends(require_admin)])
async def update_slot(payload: SlotUpdate):
    for val, name in [(payload.a, 'A'), (payload.b, 'B'), (payload.c, 'C')]:
        if not (isinstance(val, str) and len(val) == 2 and val.isdigit()):
            raise HTTPException(status_code=400, detail=f'Column {name} must be a 2-digit number (00-99)')
    if payload.date == today_str_ist():
        await ensure_board(payload.date)
    result = await db.boards.update_one(
        {'date': payload.date, 'slots': {'$elemMatch': {'hour': payload.hour, 'minute': payload.minute}}},
        {'$set': {'slots.$.a': payload.a, 'slots.$.b': payload.b, 'slots.$.c': payload.c}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Slot not found')
    return {'success': True}


@api_router.post('/board/regenerate', dependencies=[Depends(require_admin)])
async def regenerate_today():
    date_str = today_str_ist()
    await db.boards.delete_one({'date': date_str})
    doc = await ensure_board(date_str)
    return {'date': doc['date'], 'slot_count': len(doc['slots'])}


@api_router.get('/admin/board/upcoming', dependencies=[Depends(require_admin)])
async def admin_get_upcoming():
    date_str = today_str_ist()
    doc = await ensure_board(date_str)
    now_ist = datetime.now(IST)
    cur_min = now_ist.hour * 60 + now_ist.minute
    for i, s in enumerate(doc['slots']):
        revealed, remaining = slot_reveal_state(s, date_str, now_ist)
        if not revealed:
            h, m = int(s['hour']), int(s['minute'])
            return {
                'date': date_str,
                'current_time_ist': now_ist.strftime('%I:%M:%S %p'),
                'index': i,
                'time_reached': (h * 60 + m) <= cur_min,
                'hold_remaining_seconds': remaining,
                'slot': {
                    'time': format_time_12h(h, m),
                    'hour': h, 'minute': m,
                    'a': s['a'], 'b': s['b'], 'c': s['c'],
                    'held': bool(s.get('held')),
                    'released': bool(s.get('released')),
                },
            }
    return {
        'date': date_str,
        'current_time_ist': now_ist.strftime('%I:%M:%S %p'),
        'index': -1,
        'time_reached': False,
        'hold_remaining_seconds': None,
        'slot': None,
    }


@api_router.post('/board/slot/hold', dependencies=[Depends(require_admin)])
async def hold_slot(payload: SlotHold):
    if payload.date == today_str_ist():
        await ensure_board(payload.date)
    result = await db.boards.update_one(
        {'date': payload.date, 'slots': {'$elemMatch': {'hour': payload.hour, 'minute': payload.minute}}},
        {'$set': {'slots.$.held': True, 'slots.$.released': False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Slot not found')
    return {'success': True}


@api_router.post('/board/slot/release', dependencies=[Depends(require_admin)])
async def release_slot(payload: SlotHold):
    if payload.date == today_str_ist():
        await ensure_board(payload.date)
    result = await db.boards.update_one(
        {'date': payload.date, 'slots': {'$elemMatch': {'hour': payload.hour, 'minute': payload.minute}}},
        {'$set': {'slots.$.released': True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Slot not found')
    return {'success': True}


@api_router.post('/auth/change-password')
async def change_password(req: ChangePasswordRequest, payload: dict = Depends(require_admin)):
    email = payload['sub']
    user = await db.users.find_one({'email': email})
    if not user or not verify_password(req.current_password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Current password is incorrect')
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail='New password must be at least 6 characters')
    if req.new_password == req.current_password:
        raise HTTPException(status_code=400, detail='New password must be different from current password')
    await db.users.update_one(
        {'email': email},
        {'$set': {'password_hash': hash_password(req.new_password), 'password_changed': True}}
    )
    return {'success': True}


# ---------- Super Draw (one number/day at 11:30 AM IST) ----------
SUPER_DRAW_HOUR = 11
SUPER_DRAW_MINUTE = 30


class SuperDrawResponse(BaseModel):
    date: str
    number: Optional[str]
    reveal_time: str
    current_time_ist: str
    revealed: bool
    is_today: bool


class SuperDrawUpdate(BaseModel):
    date: str
    number: str


async def ensure_super_draw(date_str: str) -> dict:
    existing = await db.super_draws.find_one({'date': date_str}, {'_id': 0})
    if existing:
        return existing
    now_ist = datetime.now(IST)
    doc = {
        'date': date_str,
        'number': two_digit_random(),
        'generated_at': now_ist.isoformat(),
    }
    try:
        await db.super_draws.insert_one(dict(doc))
    except Exception as e:
        logger.warning(f'Insert race on super_draw: {e}')
        existing = await db.super_draws.find_one({'date': date_str}, {'_id': 0})
        if existing:
            return existing
        raise
    return doc


def build_super_response(doc: dict, admin_view: bool = False) -> SuperDrawResponse:
    now_ist = datetime.now(IST)
    today_str = now_ist.strftime('%Y-%m-%d')
    is_today = doc['date'] == today_str
    is_past = doc['date'] < today_str
    current_min = now_ist.hour * 60 + now_ist.minute
    reveal_min = SUPER_DRAW_HOUR * 60 + SUPER_DRAW_MINUTE
    if admin_view or is_past:
        revealed = True
    elif is_today:
        revealed = current_min >= reveal_min
    else:
        revealed = False
    return SuperDrawResponse(
        date=doc['date'],
        number=doc['number'] if revealed else None,
        reveal_time=format_time_12h(SUPER_DRAW_HOUR, SUPER_DRAW_MINUTE),
        current_time_ist=now_ist.strftime('%I:%M:%S %p'),
        revealed=revealed,
        is_today=is_today,
    )


@api_router.get('/superdraw/today', response_model=SuperDrawResponse)
async def get_today_super():
    doc = await ensure_super_draw(today_str_ist())
    return build_super_response(doc)


@api_router.get('/superdraw/date/{date_str}', response_model=SuperDrawResponse)
async def get_super_by_date(date_str: str):
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid date format (expected YYYY-MM-DD)')
    today = datetime.now(IST).date()
    if d > today:
        raise HTTPException(status_code=400, detail='Cannot view future dates')
    if d == today:
        doc = await ensure_super_draw(date_str)
    else:
        doc = await db.super_draws.find_one({'date': date_str}, {'_id': 0})
        if not doc:
            raise HTTPException(status_code=404, detail='No super draw for this date')
    return build_super_response(doc)


@api_router.get('/admin/superdraw/today', response_model=SuperDrawResponse, dependencies=[Depends(require_admin)])
async def admin_get_super_today():
    doc = await ensure_super_draw(today_str_ist())
    return build_super_response(doc, admin_view=True)


@api_router.put('/superdraw', dependencies=[Depends(require_admin)])
async def update_super(payload: SuperDrawUpdate):
    if not (isinstance(payload.number, str) and len(payload.number) == 2 and payload.number.isdigit()):
        raise HTTPException(status_code=400, detail='Number must be a 2-digit number (00-99)')
    if payload.date == today_str_ist():
        await ensure_super_draw(payload.date)
    result = await db.super_draws.update_one(
        {'date': payload.date},
        {'$set': {'number': payload.number}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Super draw not found for this date')
    return {'success': True}


# ---------- Wire up ----------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin():
    existing = await db.users.find_one({'email': ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            'email': ADMIN_EMAIL,
            'password_hash': hash_password(ADMIN_PASSWORD),
            'role': 'admin',
            'created_at': datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f'Seeded admin: {ADMIN_EMAIL}')
    elif not existing.get('password_changed') and not verify_password(ADMIN_PASSWORD, existing.get('password_hash', '')):
        await db.users.update_one(
            {'email': ADMIN_EMAIL},
            {'$set': {'password_hash': hash_password(ADMIN_PASSWORD)}}
        )
        logger.info('Admin password updated from env')


@app.on_event('startup')
async def startup_event():
    await db.users.create_index('email', unique=True)
    await seed_admin()


@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()
