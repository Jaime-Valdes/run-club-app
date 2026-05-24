from fastapi import APIRouter, HTTPException
from database import supabase
from schemas import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate):
    result = supabase.table("users").insert(user.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create user")
    return result.data[0]


@router.get("/", response_model=list[UserResponse])
def list_users():
    result = supabase.table("users").select("*").execute()
    return result.data


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str):
    result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, data: UserUpdate):
    payload = data.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("users").update(payload).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str):
    result = supabase.table("users").delete().eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
