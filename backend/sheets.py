import json
import logging
import os

from database import supabase

logger = logging.getLogger(__name__)


def sync_attendance_sheet():
    """Push full attendance data to Google Sheet. Runs in background after every check-in."""
    try:
        import gspread
        from google.oauth2.service_account import Credentials

        creds_json_str = os.environ.get("GOOGLE_CREDENTIALS_JSON")
        sheet_id = os.environ.get("GOOGLE_SHEET_ID")

        if not creds_json_str or not sheet_id:
            logger.warning("Google Sheets sync skipped: GOOGLE_CREDENTIALS_JSON or GOOGLE_SHEET_ID not set")
            return

        creds = Credentials.from_service_account_info(
            json.loads(creds_json_str),
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        ws = gspread.authorize(creds).open_by_key(sheet_id).sheet1

        users = supabase.table("users").select("id, name, email").execute().data
        attendance = supabase.table("attendance").select("user_id").execute().data
        race_results = supabase.table("race_results").select("user_id").execute().data

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

        logger.info(f"Google Sheet synced: {len(sorted_users)} members")

    except Exception as e:
        logger.error(f"Google Sheet sync failed: {e}")
