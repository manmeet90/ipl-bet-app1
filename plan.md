# IPL 2026 Betting App — Implementation Plan

## Overview

A lightweight, fun betting web app for a team of ~14 people to bet on IPL 2026 matches. Built with **vanilla HTML/CSS/JavaScript** and a simple backend, prioritizing a fancy but user-friendly UI with zero framework overhead.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Vanilla HTML + CSS + JS | Simple, no build step, easy to deploy |
| Backend | Node.js + Express | Lightweight API server |
| Database | SQLite (via `better-sqlite3`) | Zero-config, single-file DB, perfect for ~14 users |
| Auth | Session-based (express-session) | Simple phone+password login, no OAuth complexity |
| Deployment | Single machine (localhost or any VPS) | Small team, low traffic |

---

## Data Model

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Display name |
| phone | TEXT UNIQUE | Login username |
| email | TEXT | For password reset OTP delivery |
| password_hash | TEXT | bcrypt hashed |
| is_admin | BOOLEAN | 0 or 1 |
| created_at | DATETIME | Default now |

#### `matches`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| match_number | INTEGER | IPL match sequence number |
| team_a | TEXT | e.g., "CSK" |
| team_b | TEXT | e.g., "MI" |
| match_date | DATE | Date of match |
| match_time | TEXT | Start time (e.g., "7:30 PM") |
| venue | TEXT | Stadium name |
| match_type | TEXT | "league" / "semifinal" / "final" |
| bet_points | INTEGER | 50 (league), 100 (semi), 250 (final) — admin-editable |
| bet_cutoff | DATETIME | Default 1:00 PM on match day |
| betting_open | BOOLEAN | Admin can override to keep open past cutoff |
| result | TEXT NULL | "team_a" / "team_b" / "tie" / NULL (pending) |
| is_completed | BOOLEAN | Whether match result has been declared |

#### `bets`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | References users.id |
| match_id | INTEGER FK | References matches.id |
| prediction | TEXT | "team_a" / "team_b" / "tie" |
| placed_at | DATETIME | Timestamp of last bet/modification |
| UNIQUE(user_id, match_id) | | One bet per user per match, upsert on change |

#### `password_resets`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | References users.id |
| email | TEXT | Email address provided by user for receiving OTP |
| otp_code | TEXT | 6-digit OTP code |
| otp_expires_at | DATETIME | Expiry time (15 minutes from creation) |
| is_used | BOOLEAN | Marked true once OTP is successfully verified |
| created_at | DATETIME | Default now |

#### `points_ledger`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | References users.id |
| match_id | INTEGER FK | References matches.id |
| points_delta | INTEGER | + for winners, - for losers/non-bettors |
| reason | TEXT | "win" / "loss" / "no_bet" |
| created_at | DATETIME | When points were settled |

---

## Core Features

### 1. Authentication & Password Management
- Login page with phone number + password fields
- Session stored server-side (express-session with SQLite store)
- Admin seeded at startup: `Admin` / `Admin$123Admin!`
- Users created by admin via admin panel (name + phone + email + password)
- **Change Password** (logged-in user): User can change their own password from a profile/settings section by providing current password + new password
- **Forgot Password** (pre-login OTP flow):
  1. User clicks "Forgot Password?" on the login page
  2. Enters their phone number (username) and an email address
  3. Server generates a 6-digit OTP, stores it in `password_resets` table (valid for 15 minutes), and sends it to the provided email via Nodemailer
  4. User enters the OTP on the verification screen
  5. If OTP is valid and not expired, user is prompted to set a new password
  6. Password is updated, OTP is marked as used

### 2. Match Listing & Betting (User)
- **Home/Dashboard**: Shows today's matches prominently + upcoming matches
- **Match Card UI**: Each match displayed as a styled card showing:
  - Team logos/short names with colors
  - Match date, time, venue
  - Bet points at stake
  - Betting status (open / closed / result declared)
  - User's own bet (if any) — always visible to the user themselves
  - **Other people's bets are HIDDEN while betting is open** (see Bet Privacy below)
- **Place/Modify Bet**: Click a match card → modal or inline selector for Team A / Team B / Tie
  - Allowed only if betting is open (before 1 PM or admin override)
  - Can change bet any number of times before cutoff
- **Past Matches**: Show results, who won/lost points, with point breakdowns

### 3. Bet Privacy (Hidden Until Cutoff)
- **While betting is open**: A user can only see their own bet for a match. No counts, no names, no hints about what others have picked. The API must not return other users' bets for open matches.
- **After betting closes** (1 PM cutoff passed AND `betting_open = false`): All bets for that match become visible — every user can see who bet on which team, displayed as a grouped list (Team A bettors, Team B bettors, Tie bettors, No-bet users).
- **Admin exception**: Admin can always see all bets for any match regardless of cutoff status (needed for management).
- **Why**: Prevents people from waiting to see the majority pick and then copying — keeps it fun and fair.

### 4. Leaderboard
- Ranked table of all participants with total accumulated points
- Highlight current user's position
- Fun animations for top 3 (crown/trophy icons)

### 5. Admin Panel
- **Manage Users**: Add/remove users, reset passwords
- **Manage Matches**: Pre-seeded with full IPL 2026 schedule; admin can edit bet_points, toggle betting_open
- **Declare Results**: Select winning team or tie → triggers point settlement
- **Override Betting Window**: Toggle `betting_open` for individual matches to allow late bets

### 6. Points Settlement Logic
When admin declares a match result:
1. Gather all bets for that match
2. Users who bet on the **losing team** or **did not bet** → lose `bet_points` each
3. Sum all lost points into a pool
4. Divide pool equally among users who bet on the **winning team**
5. If result is **tie**, handle per spec (only "tie" bettors win the pool)
6. If **nobody** picked the winner, lost points return to each (no redistribution)
7. Record all transactions in `points_ledger`

---

## API Endpoints

### Auth & Password
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with phone + password |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current logged-in user |
| PUT | `/api/auth/change-password` | Change password (logged-in) `{ current_password, new_password }` |
| POST | `/api/auth/forgot-password` | Request OTP `{ phone, email }` → sends OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP `{ phone, otp }` → returns a reset token |
| POST | `/api/auth/reset-password` | Set new password `{ phone, otp, new_password }` |

### Matches
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/matches` | List all matches (with user's own bet; others' bets only if betting closed) |
| GET | `/api/matches/:id` | Single match detail — includes all bets only after cutoff; before cutoff only user's own bet |

### Bets
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bets` | Place or update a bet `{ match_id, prediction }` |
| GET | `/api/bets/my` | Get all bets for current user |

### Leaderboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leaderboard` | Ranked list of users with total points |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/users` | Create a new user |
| DELETE | `/api/admin/users/:id` | Remove a user |
| PUT | `/api/admin/matches/:id` | Edit match (bet_points, betting_open, etc.) |
| POST | `/api/admin/matches/:id/result` | Declare match result and settle points |
| PUT | `/api/admin/users/:id/reset-password` | Reset a user's password |

---

## UI Design Plan

### Theme
- **Dark mode primary** with IPL-inspired vibrant accent colors (purple, gold, orange)
- Glassmorphism cards with subtle gradients
- Team colors used for match cards (e.g., CSK yellow, MI blue)
- Responsive design — mobile-first since most users will bet from phones

### Pages / Screens (Single Page App via vanilla JS routing)

1. **Login Page** — Clean centered card, IPL branding, phone + password inputs, "Forgot Password?" link
1. **Forgot Password Flow** — 3-step inline flow: enter phone+email → enter OTP → set new password
1. **Profile / Change Password** — Accessible from navbar, current + new password form
2. **Dashboard** — Today's matches at top, upcoming matches below, quick-bet buttons
3. **Match Detail** — Expanded view with bet selector, match info; after cutoff shows grouped bet reveal (who picked what)
4. **Leaderboard** — Animated rank table with points, trend arrows
5. **My Bets** — History of all bets with outcomes and points earned/lost
6. **Admin Panel** — Tabbed interface: Users | Matches | Results

### UI Components
- **Match Card**: Glassmorphism card with team logos, VS divider, bet chips
- **Bet Selector**: Three toggle buttons (Team A / Tie / Team B) with team colors
- **Toast Notifications**: Slide-in notifications for bet placed, result declared, etc.
- **Countdown Timer**: Live countdown to 1 PM cutoff on open matches
- **Bet Reveal Panel**: After cutoff, shows all users grouped by their pick (Team A / Tie / Team B / No Bet) with avatars/names — hidden before cutoff with a "Bets hidden until cutoff" lock icon
- **Confetti Animation**: When viewing results where user won points

---

## File Structure

```
ipl_bet/
├── package.json
├── .env                       # SMTP credentials (not committed)
├── server.js                  # Express server entry point
├── db/
│   ├── schema.sql             # Table creation SQL
│   ├── seed-matches.js        # Seed IPL 2026 schedule
│   └── database.js            # DB connection + helpers
├── routes/
│   ├── auth.js                # Auth routes
│   ├── matches.js             # Match routes
│   ├── bets.js                # Bet routes
│   ├── leaderboard.js         # Leaderboard routes
│   └── admin.js               # Admin routes
├── middleware/
│   ├── auth.js                # Session auth middleware
│   └── admin.js               # Admin check middleware
├── services/
│   ├── settlement.js          # Points settlement logic
│   └── email.js               # Nodemailer OTP email sender
├── public/
│   ├── index.html             # SPA shell
│   ├── css/
│   │   └── style.css          # All styles
│   ├── js/
│   │   ├── app.js             # Router + app init
│   │   ├── api.js             # API client helper
│   │   ├── pages/
│   │   │   ├── login.js       # Login + forgot password flow
│   │   │   ├── profile.js     # Change password page
│   │   │   ├── dashboard.js   # Dashboard page
│   │   │   ├── leaderboard.js # Leaderboard page
│   │   │   ├── my-bets.js     # My bets page
│   │   │   └── admin.js       # Admin panel page
│   │   └── components/
│   │       ├── match-card.js   # Match card component
│   │       ├── bet-selector.js # Bet selector widget
│   │       ├── navbar.js       # Navigation bar
│   │       └── toast.js        # Toast notifications
│   └── assets/
│       └── team-logos/         # Team logo SVGs/PNGs
└── README.md
```

---

## IPL 2026 Match Data

Pre-seed the database with the full IPL 2026 schedule (74 league matches + 4 playoffs). Key data per match:
- Match number, teams, date, time, venue
- `match_type`: league / semifinal / final
- `bet_points`: 50 (league), 100 (semifinal), 250 (final)
- All matches start with `betting_open = true` and `result = NULL`

The schedule data will be sourced and added as a JSON seed file.

---

## Settlement Algorithm (Detail)

```
function settleMatch(matchId, result):
    match = getMatch(matchId)
    allUsers = getAllUsers()  // all 14 participants
    bets = getBetsForMatch(matchId)

    betMap = { user_id → prediction }   // from bets table
    betPoints = match.bet_points

    winners = []
    losers = []

    for each user in allUsers:
        if user did not bet OR user bet != result:
            losers.push(user)
        else:
            winners.push(user)

    totalPool = losers.length * betPoints

    if winners.length > 0:
        pointsPerWinner = totalPool / winners.length  // can be fractional, round to 2 decimals
        for each winner: record +pointsPerWinner
        for each loser:  record -betPoints
    else:
        // nobody won — no points deducted from anyone
        // (optional: admin can re-declare result)
```

---

## Implementation Order

### Phase 1 — Backend Foundation
1. Initialize Node.js project, install dependencies
2. Set up SQLite database with schema (including `password_resets` table)
3. Implement auth (login, session, middleware)
4. Implement change password + forgot password OTP flow (Nodemailer email sending)
5. Implement match CRUD + seed IPL schedule
6. Implement bet placement API
7. Implement settlement logic
8. Implement leaderboard API

### Phase 2 — Frontend
1. Build SPA shell (index.html + router)
2. Login page + forgot password flow (phone → OTP → new password)
3. Dashboard with match cards
4. Bet placement flow
5. Leaderboard page
6. My Bets history page
7. Profile page with change password form

### Phase 3 — Admin Panel
1. User management (add/remove/reset password)
2. Match management (edit points, toggle betting)
3. Result declaration + settlement trigger

### Phase 4 — Polish
1. Team logos and colors
2. Animations (confetti, transitions)
3. Countdown timers
4. Toast notifications
5. Mobile responsiveness fine-tuning
6. Edge case handling and testing

---

## Key Edge Cases to Handle

- **No one bets on a match**: Everyone loses `bet_points`, pool goes to... nobody. Decision: no points deducted if no one participates.
- **Everyone bets the same team (and loses)**: All lose, no winners, no redistribution.
- **Tie result with no tie bettors**: Same as above — all lose, no redistribution.
- **Fractional points**: Use 2 decimal places; display rounded but store precisely.
- **Concurrent bet modifications**: SQLite handles single-writer well; upsert ensures last write wins.
- **Match rescheduled / cancelled**: Admin can edit match date or mark as cancelled (no settlement).
- **Double-header days**: Two matches, each with independent bet pools and cutoffs.
- **Bet visibility timing**: If admin reopens betting after cutoff (`betting_open = true` override), bets must be hidden again for that match until betting closes again — privacy is tied to the effective open/closed state, not just the clock.
- **OTP spam prevention**: Rate-limit forgot-password requests to max 3 OTPs per phone per hour. OTPs expire after 15 minutes. Old unused OTPs are invalidated when a new one is generated.

---

## Dependencies

```json
{
  "express": "^4.x",
  "better-sqlite3": "^11.x",
  "bcrypt": "^5.x",
  "express-session": "^1.x",
  "connect-sqlite3": "^0.x",
  "cors": "^2.x",
  "nodemailer": "^6.x"
}
```

### Email Configuration (for OTP delivery)
OTP emails are sent via **Nodemailer**. Configure SMTP credentials in a `.env` file (not committed to git):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```
For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) (not the regular Gmail password). Any SMTP provider (Outlook, SendGrid, etc.) works.

No frontend dependencies — pure vanilla JS, CSS, and HTML.
