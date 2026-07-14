# NYU Run Club App

A web app for managing attendance and race records for the NYU Run Club.

## Features

**Attendance**
- Start a practice or race session and check members in from a list
- Display a QR code so members can scan and check themselves in on their own phone (one check-in per device — refreshing the page does not allow checking in other members)
- Add new members on the spot (first name, last name, Net ID) — they're created in the database and checked in immediately
- Checked-in members float to the top of the list alphabetically, with a divider separating them from members not yet checked in
- Attendance Records dashboard — leaderboard by member, per-practice breakdowns, attendance stats filterable by date range

**Race Records**
- Log road/XC races and track meets with results per member
- Per-member race history, personal records (PRs) by distance/event, and progress charts
- Track meet support — log multiple events per athlete per meet (100m, 800m, relays, Long Jump, etc.)
- Club Records table — men's and women's all-time bests for every distance and track event
- Pending time badges to flag members with missing results

**Spreadsheet Exports**
- Export full attendance leaderboard (First Name, Last Name, Practices Attended, Races Attended, Total Attendances) as an `.xlsx` file from the Attendance Records page
- Export individual practice attendee lists directly from the practice drill-down view
- Export individual race results from any race detail page
- **Google Sheets auto-sync** — a shared Google Sheet updates automatically in the background after every check-in and race result change (no manual action needed). Trigger a full backfill at any time by visiting `/sync-sheet` on the backend.

**Other**
- Gender-aware XC distances (men run 8k, women run 6k) — stored once, displayed correctly per athlete
- Fully responsive — works on desktop and mobile (iPhone)
- Self check-in confirmation screen with animated success state

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel (frontend) + Railway (backend)

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project with the schema set up (see below)

### 1. Clone the repo

```bash
git clone <repo-url>
cd run-club-app
```

### 2. Set up the database

In your Supabase project, open the **SQL Editor** and run the contents of [`schema.sql`](schema.sql). Then disable Row Level Security on all tables (Table Editor → select table → RLS toggle off).

### 3. Set up backend environment variables

Create a `.env` file in the project root:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
ENVIRONMENT=development
DEBUG=True
```

### 4. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 main.py
```

The API will be available at `http://localhost:8000`.

### 5. Start the frontend

In a new terminal tab:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Deployment

The app is deployed on **Vercel** (frontend) and **Railway** (backend).

### Required environment variables

**Railway (backend):**
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase anon/service key |
| `GOOGLE_CREDENTIALS_JSON` | Full JSON content of your Google service account key file |
| `GOOGLE_SHEET_ID` | ID of the Google Sheet to sync attendance data to |

**Vercel (frontend):**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Your Railway backend URL (e.g. `https://your-app.up.railway.app`) |

---

## QR Code / Mobile Self Check-In

In production (deployed to Vercel + Railway), the QR code works on any device over cellular or Wi-Fi — no configuration needed.

For local development with mobile testing on the same Wi-Fi network:

1. Find your Mac's local IP address:
   ```bash
   ipconfig getifaddr en0
   ```

2. Create `frontend/.env.local` with:
   ```
   VITE_NETWORK_HOST=<your-mac-ip>       # e.g. 192.168.1.42
   VITE_API_URL=http://<your-mac-ip>:8000
   ```

3. Restart the frontend (`npm run dev`). Vite will print a **Network** URL — that's what the QR code will encode.

> If your IP changes (new network), update `.env.local` and restart Vite.

---

## Google Sheets Auto-Sync

The app can automatically keep a Google Sheet up to date with full attendance data after every check-in.

### Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project
2. Enable the **Google Sheets API** (APIs & Services → Library)
3. Create a **Service Account** (APIs & Services → Credentials → Create Credentials → Service Account)
4. Under the service account's **Keys** tab, create a new JSON key and download it
5. Create a Google Sheet and share it with the service account's `client_email` (Editor access)
6. Add `GOOGLE_CREDENTIALS_JSON` (full JSON file contents) and `GOOGLE_SHEET_ID` (from the sheet URL) as Railway environment variables

### Manual backfill

To populate the sheet with all existing data (e.g. after initial setup), visit:

```
https://your-railway-url.up.railway.app/sync-sheet
```

This returns `{"status": "synced", "members": N, "rows_written": N}` on success.

### Sheet format

| First Name | Last Name | Email | Practices Attended | Races Attended | Total Attendances |
|---|---|---|---|---|---|

Sorted by Total Attendances descending. Updates automatically after every check-in, check-out, and race result change.

---

## Database Schema

See [`schema.sql`](schema.sql) for the full schema. Tables:

| Table | Description |
|---|---|
| `clubs` | Club info (name, location) |
| `users` | Members (name, email, gender) |
| `runs` | Practice sessions |
| `attendance` | Check-in records per run per member |
| `races` | Road/XC races and track meets |
| `race_results` | Finishing time per road/XC race per member |
| `track_results` | Per-event results for track meets |
