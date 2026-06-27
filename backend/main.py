"""FastAPI application for Run Club backend."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
from config import settings

from routes import users_router, clubs_router, runs_router, attendance_router, races_router

app = FastAPI(
    title="Run Club API",
    description="Backend API for managing run clubs and events",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(APIError)
async def postgrest_error_handler(request: Request, exc: APIError):
    return JSONResponse(
        status_code=400,
        content={"detail": exc.message, "code": exc.code},
    )


@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Welcome to Run Club API"}


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/sync-sheet")
def manual_sync():
    """Manually trigger a Google Sheet sync. Surfaces errors for debugging."""
    import json
    import os
    try:
        import gspread
        from google.oauth2.service_account import Credentials
        from database import supabase

        creds_json_str = os.environ.get("GOOGLE_CREDENTIALS_JSON")
        sheet_id = os.environ.get("GOOGLE_SHEET_ID")

        if not creds_json_str:
            return {"error": "GOOGLE_CREDENTIALS_JSON not set"}
        if not sheet_id:
            return {"error": "GOOGLE_SHEET_ID not set"}

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
            rows.append([parts[0], " ".join(parts[1:]), user.get("email", ""), practices, races, practices + races])

        ws.clear()
        ws.update(rows, "A1")
        ws.format("A1:F1", {"textFormat": {"bold": True}})

        return {"status": "synced", "members": len(sorted_users), "rows_written": len(rows)}

    except Exception as e:
        return {"error": type(e).__name__, "detail": str(e)}


app.include_router(users_router)
app.include_router(clubs_router)
app.include_router(runs_router)
app.include_router(attendance_router)
app.include_router(races_router)


if __name__ == "__main__":
    import uvicorn
    import os

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=settings.debug,
    )
