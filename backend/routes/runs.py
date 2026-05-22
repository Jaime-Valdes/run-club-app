from fastapi import APIRouter, HTTPException
from database import supabase
from schemas import RunCreate, RunResponse

router = APIRouter(prefix="/runs", tags=["runs"])


@router.post("/", response_model=RunResponse, status_code=201)
def create_run(run: RunCreate, created_by: str = None):
    data = run.model_dump(mode="json")
    if created_by:
        data["created_by"] = created_by
    result = supabase.table("runs").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create run")
    return result.data[0]


@router.get("/", response_model=list[RunResponse])
def list_runs(club_id: str):
    result = (
        supabase.table("runs")
        .select("*")
        .eq("club_id", club_id)
        .order("date", desc=True)
        .execute()
    )
    return result.data


@router.get("/{run_id}", response_model=RunResponse)
def get_run(run_id: str):
    result = supabase.table("runs").select("*").eq("id", run_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")
    return result.data[0]


@router.delete("/{run_id}", status_code=204)
def delete_run(run_id: str):
    result = supabase.table("runs").delete().eq("id", run_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")
