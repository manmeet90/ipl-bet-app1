# IPL Bet 2026 🏏

A fun betting web app for your team to bet on IPL 2026 matches. Built with vanilla JS frontend and Node.js/Express backend.

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Seed the database (creates matches + admin user)
npm run seed

# Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

Locally, the app uses a SQLite file (`data/ipl_bet.db`). No extra setup needed.

## Default Admin Login

- **Username:** `Admin`
- **Password:** `Admin$123Admin!`

## Setup Steps

1. **Seed the database** — `npm run seed` creates all 74 IPL 2026 matches + playoffs and the admin user
2. **Add users** — Login as admin, go to Admin Panel → Users, and add your team members (name + phone + password)
3. **Share the link** — Users login with their phone number and password
4. **Place bets** — Everyone bets before the 1 PM IST cutoff each match day (admin can adjust per match)
5. **Declare results** — Admin goes to Admin Panel → Results and declares winners after each match

## Deploying to Render (Free Tier)

Render's free tier uses ephemeral storage, so local SQLite files get wiped on restart. Use **Turso** (hosted SQLite) for persistent data.

### 1. Create a Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Sign up / login
turso auth login

# Create a database
turso db create ipl-bet-2026

# Get your database URL
turso db show ipl-bet-2026 --url
# → libsql://ipl-bet-2026-yourusername.turso.io

# Create an auth token
turso db tokens create ipl-bet-2026
# → eyJhbGciOiJFZDI1NTE5...
```

### 2. Deploy to Render

1. Push your code to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install && npm run seed`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Add **Environment Variables:**
   - `TURSO_DATABASE_URL` = your Turso URL (`libsql://...`)
   - `TURSO_AUTH_TOKEN` = your Turso auth token
   - `SESSION_SECRET` = any random string
   - `NODE_ENV` = `production`
6. Deploy!

The seed script is safe to re-run — it skips if matches/admin already exist.

## Key Features

- **Daily betting** — 50 points per match (100 for semis, 250 for final)
- **Hidden bets** — Nobody can see others' bets until the cutoff passes
- **Auto settlement** — Losers' points are pooled and split among winners
- **Leaderboard** — Live rankings with player detail drill-down
- **Party Pot** — Running total of all negative points
- **Admin controls** — Manage users, edit matches/cutoffs, declare results, place bets on behalf of users
- **Match abandoned** — Supports abandoned matches with no point impact

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (zero frameworks)
- **Backend:** Node.js + Express
- **Database:** SQLite via libsql (local dev) / Turso (production)
- **Auth:** Session-based (express-session)
