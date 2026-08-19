# NPL1 (Shivshaktiloto) — PHP + MySQL version

A drop-in PHP/MySQL rebuild of the app. Works on **Hostinger's normal shared hosting** — no VPS needed.

## What's inside

```
php-version/
├── config.php               ← EDIT DB CREDENTIALS HERE
├── db_setup.sql             ← import this once via phpMyAdmin
├── index.php                ← public main board (63 draws/day)
├── super-draw.php           ← public super draw page (1 number at 11:30 AM IST)
├── admin_login.php          ← admin login form
├── admin.php                ← protected admin panel
├── logout.php
├── _hero.php                ← shared marquee + hero partial
├── api/                     ← JSON endpoints called by JS
│   ├── board_today.php
│   ├── board_date.php
│   ├── admin_board.php      (auth)
│   ├── update_slot.php      (auth, POST)
│   ├── superdraw_today.php
│   ├── superdraw_date.php
│   ├── admin_superdraw.php  (auth)
│   ├── update_super.php     (auth, POST)
│   └── regenerate.php       (auth, POST)
└── assets/
    ├── style.css
    ├── app.js
    └── admin.js
```

## Deploy to Hostinger shared hosting — step by step

### 1. Create a MySQL database
- Log into **Hostinger hPanel** → **Databases** → **MySQL Databases**
- Click **Create a New Database**
- Note the four values shown:
  - Database name (e.g. `u123456789_npl1`)
  - Username (e.g. `u123456789_admin`)
  - Password (you choose it)
  - Host is usually `localhost`

### 2. Import the schema
- In hPanel → **phpMyAdmin** → open your new database
- Click **Import** → choose **`db_setup.sql`** from this folder → **Go**
- You should now see three empty tables: `admins`, `slots`, `super_draws`

### 3. Edit `config.php`
Open `config.php` and replace the four DB constants:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_npl1');
define('DB_USER', 'u123456789_admin');
define('DB_PASS', 'your_db_password');
```
Also change the admin password (used to sign into the admin panel):
```php
define('ADMIN_EMAIL',    'admin@shivshakti.local');
define('ADMIN_PASSWORD', 'CHOOSE_A_STRONG_PASSWORD');
```

### 4. Upload the files
- hPanel → **File Manager** → open `public_html`
- Upload the **contents** of `php-version/` (not the folder itself)
- OR zip the contents locally, upload the zip, then **Extract** in File Manager

### 5. Open your site
- Visit `https://yourdomain.com/` — you should see the main board
- Visit `https://yourdomain.com/super-draw.php` — super draw page
- Visit `https://yourdomain.com/admin_login.php` — sign in with the email + password you set in step 3

The admin row is auto-created on first request (via `seed_admin()` in `config.php`).

## How it works

- **Timezone** All logic runs in IST (`Asia/Kolkata`)
- **Board** 63 slots/day (9:00 AM–5:00 PM every 15 min → 33 rows, then 5:10 PM–10:00 PM every 10 min → 30 rows)
- **Randoms** Two-digit strings `00`–`99` are generated once per date on first hit and stored in `slots`
- **Reveal** Public API masks future rows; admin API returns everything so you can edit ahead of time
- **Super draw** One number/day at 11:30 AM IST, stored in `super_draws`
- **Auth** PHP session, single admin seeded from constants in `config.php`, bcrypt password hashing (`password_hash` / `password_verify`)
- **Frontend** Server-rendered HTML with a small vanilla-JS layer that polls `/api/*.php` every 15 s

## Change the admin password later
1. Edit `ADMIN_PASSWORD` in `config.php`
2. Save & re-upload the file
The next request will detect the mismatch and re-hash the password into the DB automatically.

## Rotate the seed / start fresh
Just drop the three tables in phpMyAdmin and import `db_setup.sql` again.

## Troubleshooting

- **Blank page / 500 error** — Hostinger hPanel → **File Manager** → check `error_log` next to your files. Most common issues:
  - DB credentials wrong in `config.php`
  - Tables not imported → re-run `db_setup.sql`
- **Times feel off by 5 hours** — the server's timezone is being overridden per-request to Asia/Kolkata. If you customised, revert `date_default_timezone_set('Asia/Kolkata');`
- **Admin login always fails** — clear cookies, or delete the row from the `admins` table so it auto-seeds again
- **The "watching now" number keeps changing** — that's intentional, it's a client-side liveness counter (not real presence data)

## Files map (React version → PHP version)
| React file | PHP equivalent |
|---|---|
| `App.js` (routes) | `.htaccess`-style URLs — each page is its own `.php` file |
| `pages/Home.jsx` | `index.php` + `assets/app.js` (initHome) |
| `pages/SuperDraw.jsx` | `super-draw.php` + `assets/app.js` (initSuperDraw) |
| `pages/AdminLogin.jsx` | `admin_login.php` (server-side POST) |
| `pages/AdminPanel.jsx` | `admin.php` + `assets/admin.js` |
| `components/HeroBanner.jsx` | `_hero.php` |
| `components/OnlineUsers.jsx` | `startOnlineUsers()` in `assets/app.js` |
| FastAPI `server.py` routes | `api/*.php` files |
| MongoDB `boards`, `super_draws` | MySQL tables `slots`, `super_draws` |
| JWT Bearer auth | PHP `$_SESSION` |
