# NPL1 - Daily Draw Board

Cloned from https://github.com/wizbangindia-creator/npl1 on 2026-06 into /app.

## Stack
- Backend: FastAPI + MongoDB (motor), JWT admin auth (server.py)
- Frontend: React 19 (CRACO), Tailwind, radix ui; pages: Home, SuperDraw, AdminLogin, AdminPanel
- Also includes a standalone php-version/ (PHP+MySQL port) not deployed here

## App overview
- Main board: 63 draws/day (9:00AM-10:00PM IST), each slot has A/B/C 2-digit numbers, revealed as time passes
- Super Draw: one number/day revealed at 11:30 AM IST
- Admin: login, view/edit all slot values, edit super draw, regenerate today's board

## Setup notes
- backend/.env requires JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (added during clone)
- frontend/.env REACT_APP_BACKEND_URL set to this env's preview URL
- Admin auto-seeded on startup from env creds

## Status: Cloned & running. Verified: home board, superdraw, admin login.

## Update (2026-06): Admin changer redesign (both React & PHP versions)
Implemented in FastAPI/React app AND php-version/:
1. Admin changer shows ONLY the single upcoming (next-unrevealed) slot — no past/future slots, no full table.
2. Save sets A/B/C; Hold Result delays that slot's public reveal up to 60s; Release reveals immediately (auto-reveals after 60s).
3. Admin can change their login password (persists; env/config password no longer overrides once changed in-app — password_changed flag).

Backend (server.py): slot_reveal_state(), GET /api/admin/board/upcoming, POST /api/board/slot/hold, /release, POST /api/auth/change-password, seed_admin honors password_changed. Tested: /app/backend/tests/test_admin_upcoming_hold_password.py 11/11 pass.

PHP (php-version/): config.php migrate_schema() auto-adds slots.held, slots.released, admins.password_changed on first load (keeps existing data, no SQL re-import). New endpoints api/admin_upcoming.php, hold_slot.php, release_slot.php, change_password.php. admin.php + assets/admin.js rewritten for upcoming-only changer + hold/release + change-password. Verified with local PHP8.2 + MariaDB: migration preserves historical rows, hold 60s window, password change survives bootstrap. Deploy = just re-upload files to Hostinger.
