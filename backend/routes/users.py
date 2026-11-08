from fastapi import APIRouter, BackgroundTasks, HTTPException
from postgrest.exceptions import APIError
from database import fetch_all, supabase
from schemas import DseStatusImport, UserCreate, UserUpdate, UserResponse
from sheets import sync_attendance_sheet

router = APIRouter(prefix="/users", tags=["users"])

# Ids go in the request URL, so large updates are split up.
DSE_UPDATE_BATCH = 100


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate):
    try:
        result = supabase.table("users").insert(user.model_dump()).execute()
    except APIError as e:
        if e.code == "23505":
            net_id = user.email.split("@")[0]
            raise HTTPException(
                status_code=409,
                detail=f"A member with NetID {net_id} is already in the system. Search for them in the list instead.",
            )
        raise
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create user")
    return result.data[0]


@router.get("/", response_model=list[UserResponse])
def list_users():
    return fetch_all(lambda: supabase.table("users").select("*").order("id"))


def _set_dse_status(user_ids: list[str], status: str | None):
    for start in range(0, len(user_ids), DSE_UPDATE_BATCH):
        batch = user_ids[start:start + DSE_UPDATE_BATCH]
        supabase.table("users").update({"dse_status": status}).in_("id", batch).execute()


@router.post("/dse-statuses")
def import_dse_statuses(body: DseStatusImport):
    """Replace all DSE statuses with a freshly imported roster."""
    if not body.statuses:
        raise HTTPException(status_code=400, detail="No roster statuses to import")

    ids_by_status: dict[str, list[str]] = {}
    for user_id, status in body.statuses.items():
        ids_by_status.setdefault(status, []).append(user_id)
    for status, user_ids in ids_by_status.items():
        _set_dse_status(user_ids, status)

    users = fetch_all(lambda: supabase.table("users").select("id, dse_status").order("id"))
    to_clear = [u["id"] for u in users if u["dse_status"] and u["id"] not in body.statuses]
    _set_dse_status(to_clear, None)

    for user_id, email in body.links.items():
        supabase.table("users").update({"dse_email": email}).eq("id", user_id).execute()
    return {"updated": len(body.statuses), "cleared": len(to_clear)}


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str):
    result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, data: UserUpdate, background_tasks: BackgroundTasks):
    payload = data.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = supabase.table("users").update(payload).eq("id", user_id).execute()
    except APIError as e:
        if e.code == "23505":
            raise HTTPException(status_code=409, detail="Another member already uses that email.")
        raise
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    background_tasks.add_task(sync_attendance_sheet)
    return result.data[0]


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, background_tasks: BackgroundTasks):
    result = supabase.table("users").delete().eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    background_tasks.add_task(sync_attendance_sheet)
