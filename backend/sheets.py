import json
import logging
import os
import threading
import time

from database import fetch_all, supabase

logger = logging.getLogger(__name__)

# How long to wait for more check-ins before writing. Each sync costs 3 Google
# write calls against a quota of 60 per minute, so a QR rush must share syncs.
SETTLE_SECONDS = 5

_sync_lock = threading.Lock()
_sync_running = False
_sync_requested = False


class SheetNotConfigured(Exception):
    pass


def push_attendance_to_sheet():
    """Rewrite the Google Sheet from current data and return the number of members written."""
    import gspread
    from google.oauth2.service_account import Credentials

    creds_json_str = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    sheet_id = os.environ.get("GOOGLE_SHEET_ID")

    if not creds_json_str:
        raise SheetNotConfigured("GOOGLE_CREDENTIALS_JSON not set")
    if not sheet_id:
        raise SheetNotConfigured("GOOGLE_SHEET_ID not set")

    creds = Credentials.from_service_account_info(
        json.loads(creds_json_str),
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    ws = gspread.authorize(creds).open_by_key(sheet_id).sheet1

    users = fetch_all(lambda: supabase.table("users").select("id, name, email").order("id"))
    attendance = fetch_all(lambda: supabase.table("attendance").select("user_id").order("id"))
    race_results = fetch_all(lambda: supabase.table("race_results").select("user_id").order("id"))

    practice_counts = {}
    for rec in attendance:
        uid = rec["user_id"]
        practice_counts[uid] = practice_counts.get(uid, 0) + 1

    race_counts = {}
    for rec in race_results:
        uid = rec["user_id"]
        race_counts[uid] = race_counts.get(uid, 0) + 1

    sorted_users = sorted(
        users,
        key=lambda u: -(practice_counts.get(u["id"], 0) + race_counts.get(u["id"], 0)),
    )

    rows = [["First Name", "Last Name", "Email", "Practices Attended", "Races Attended", "Total Attendances"]]
    for user in sorted_users:
        parts = user["name"].strip().split(" ")
        practices = practice_counts.get(user["id"], 0)
        races = race_counts.get(user["id"], 0)
        rows.append([
            parts[0],
            " ".join(parts[1:]),
            user.get("email", ""),
            practices,
            races,
            practices + races,
        ])

    ws.clear()
    ws.update(rows, "A1")
    ws.format("A1:F1", {"textFormat": {"bold": True}})

    return len(sorted_users)


def sync_attendance_sheet():
    """Background task run after every change.

    Only one sync runs at a time. Changes that arrive during a sync are picked
    up by one more pass, so the sheet always ends on the latest data.
    """
    global _sync_running, _sync_requested

    with _sync_lock:
        _sync_requested = True
        if _sync_running:
            return
        _sync_running = True

    while True:
        with _sync_lock:
            if not _sync_requested:
                _sync_running = False
                return
            _sync_requested = False

        time.sleep(SETTLE_SECONDS)
        try:
            members = push_attendance_to_sheet()
            logger.info(f"Google Sheet synced: {members} members")
        except SheetNotConfigured as e:
            logger.warning(f"Google Sheets sync skipped: {e}")
        except Exception as e:
            logger.error(f"Google Sheet sync failed: {e}")
