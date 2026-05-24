# NYU Run Club App

A web app for managing attendance and race records for the NYU Run Club.

## Features

**Attendance**
- Start a practice session and check members in from a list
- Display a QR code so members can check themselves in on their own phone
- Attendance Records dashboard — leaderboard by member, per-practice breakdowns, attendance stats filterable by date range

**Race Records**
- Log road/XC races and track meets with results per member
- Per-member race history, personal records (PRs) by distance/event, and progress charts
- Track meet support — log multiple events per athlete per meet (100m, 800m, relays, Long Jump, etc.)
- Club Records table — men's and women's all-time bests for every distance and track event
- Pending time badges to flag members with missing results

**Other**
- Gender-aware XC distances (men run 8k, women run 6k) — stored once, displayed correctly per athlete
- Mobile-friendly self check-in page optimized for iPhone

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)

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

## QR Code / Mobile Self Check-In

The attendance page shows a QR code members can scan to check themselves in. To make this work on phones on the same Wi-Fi network:

1. Find your Mac's local IP address:
   ```bash
   ipconfig getifaddr en0
   ```

2. Create `frontend/.env.local` with:
   ```
   VITE_NETWORK_HOST=<your-mac-ip>       # e.g. 192.168.1.42
   VITE_API_URL=http://<your-mac-ip>:8000
   ```

3. Restart the frontend (`npm run dev`). Vite will print a **Network** URL — that's what the QR code will encode. Make sure your phone and Mac are on the same Wi-Fi network.

> If your IP changes (new network), update `.env.local` and restart Vite.

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
