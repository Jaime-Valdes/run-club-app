# NYU Run Club App

A web app for managing attendance and operations for the NYU Run Club.

## Features

- **Attendance tracking** — start a practice session and check members in/off a list
- **QR code self check-in** — display a QR code at practice so members can check themselves in on their own phone
- **Records dashboard** — leaderboard by member, per-practice breakdowns, and attendance stats filtered by week/month/year

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project with the database schema set up

### 1. Clone the repo

```bash
git clone <repo-url>
cd run-club-app
```

### 2. Set up environment variables

Create a `.env` file at the project root:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
```

### 3. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 main.py
```

The API will be available at `http://localhost:8000`.

### 4. Start the frontend

In a new terminal tab:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Open the app

Navigate to `http://localhost:5173` in your browser. Both the backend and frontend need to be running at the same time.

---

## Database Schema

The app uses the following Supabase tables: `users`, `clubs`, `club_members`, `runs`, `attendance`, `personal_records`.

Row Level Security (RLS) should be disabled on all tables for local development.
