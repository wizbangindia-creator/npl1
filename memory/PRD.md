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
