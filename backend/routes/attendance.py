from fastapi import APIRouter, HTTPException
from database import supabase
from schemas import AttendanceCreate, AttendanceResponse, AttendanceWithUser, AttendanceWithRun

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/", response_model=AttendanceResponse, status_code=201)
def check_in(attendance: AttendanceCreate):
    result = supabase.table("attendance").insert(attendance.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to check in")
    return result.data[0]


@router.delete("/", status_code=204)
def check_out(run_id: str, user_id: str):
    result = (
        supabase.table("attendance")
        .delete()
        .eq("run_id", run_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Attendance record not found")


@router.get("/run/{run_id}", response_model=list[AttendanceWithUser])
def get_attendance_for_run(run_id: str):
    """Get all attendees for a specific run."""
    result = (
        supabase.table("attendance")
        .select("*, users(id, name, email)")
        .eq("run_id", run_id)
        .execute()
    )
    return result.data


@router.get("/user/{user_id}", response_model=list[AttendanceWithRun])
def get_attendance_for_user(user_id: str):
    """Get all runs a specific user has attended."""
    result = (
        supabase.table("attendance")
        .select("*, runs(id, title, date, notes)")
        .eq("user_id", user_id)
        .order("checked_in_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/user/{user_id}/count")
def get_attendance_count(user_id: str):
    """Get total number of runs a user has attended."""
    result = (
        supabase.table("attendance")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    return {"user_id": user_id, "total_attended": result.count}


@router.get("/counts")
def get_all_attendance_counts():
    """Get attendance counts for all users in a single query."""
    result = supabase.table("attendance").select("user_id").execute()
    counts = {}
    for row in result.data:
        uid = row["user_id"]
        counts[uid] = counts.get(uid, 0) + 1
    return counts


@router.get("/all")
def get_all_attendance(club_id: str):
    """All attendance records for a club (user_id + run_id) in one query."""
    runs_res = supabase.table("runs").select("id").eq("club_id", club_id).execute()
    run_ids = [r["id"] for r in runs_res.data]
    if not run_ids:
        return []
    result = supabase.table("attendance").select("user_id, run_id").in_("run_id", run_ids).execute()
    return result.data
