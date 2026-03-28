# IPL Bet 2026 🏏

A fun betting web app for your team to bet on IPL 2026 matches. Built with vanilla JS frontend and Node.js/Express backend.

## Quick Start

```bash
# Install dependencies
npm install

# Seed the database (creates matches + admin user)
npm run seed

# Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

## Default Admin Login

- **Username:** `Admin`
- **Password:** `Admin$123Admin!`

## Setup Steps

1. **Seed the database** — `npm run seed` creates all 74 IPL 2026 matches + playoffs and the admin user
2. **Add users** — Login as admin, go to Admin Panel → Users, and add your team members (name + phone + password)
3. **Share the link** — Users login with their phone number and password
4. **Place bets** — Everyone bets before the 1 PM cutoff each match day
5. **Declare results** — Admin goes to Admin Panel → Results and declares winners after each match

## Key Features

- **Daily betting** — 50 points per match (100 for semis, 250 for final)
- **Hidden bets** — Nobody can see others' bets until the 1 PM cutoff passes
- **Auto settlement** — Losers' points are pooled and split among winners
- **Leaderboard** — Live rankings of all participants
- **Admin controls** — Manage users, override betting windows, declare results
- **Password reset** — Users can reset via email OTP

## Email OTP Setup (Optional)

For password reset emails, configure SMTP in `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

Without SMTP config, OTPs are printed to the server console (mock mode).

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (zero frameworks)
- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)
- **Auth:** Session-based (express-session)
