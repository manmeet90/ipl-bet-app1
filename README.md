# IPL Bet 2026 🏏

A fun betting web app for your team to bet on IPL 2026 matches. Built with vanilla JS frontend and Node.js/Express backend.

> **🔥 Now supports Firebase Realtime Database!** Migrated from SQLite to Firebase for better scalability and real-time features.

## Quick Start

### Option 1: Firebase (Recommended - Cloud Database)

```bash
# Install dependencies
npm install

# Set up Firebase (see FIREBASE_SETUP.md for detailed instructions)
# Add your Firebase credentials to .env file

# Seed the Firebase database
npm run seed-firebase

# Start the server
npm start
```

### Option 2: SQLite (Local Development Only)

```bash
# Install dependencies
npm install

# Seed the local database
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

## Migration from Turso/SQLite

If you have an existing app with data in Turso or SQLite:

1. **Export your data** to JSON files (users.json, matches.json, bets.json, points_ledger.json)
2. **Set up Firebase** following `FIREBASE_SETUP.md`
3. **Run the migration**: `npm run migrate-from-turso`
4. **Verify the migration** worked correctly

See `MIGRATION_FROM_TURSO_GUIDE.md` for detailed instructions.

## Documentation

- 📖 **[Firebase Setup Guide](FIREBASE_SETUP.md)** - Set up Firebase Realtime Database
- 🔄 **[Migration Guide](MIGRATION_FROM_TURSO_GUIDE.md)** - Migrate from Turso/SQLite to Firebase  
- 📋 **[Migration Summary](MIGRATION_SUMMARY.md)** - Technical details of the Firebase migration
- 🗂️ **[Database Structure](firebase-database-structure.md)** - Firebase schema documentation

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (zero frameworks)
- **Backend:** Node.js + Express  
- **Database:** Firebase Realtime Database (primary) / SQLite (fallback)
- **Auth:** Session-based (express-session)
