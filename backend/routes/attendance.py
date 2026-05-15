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
        .select("*, runs(id, title, date, distance_km)")
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
