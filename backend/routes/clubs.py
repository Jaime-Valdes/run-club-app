from fastapi import APIRouter, HTTPException
from database import supabase
from schemas import ClubCreate, ClubResponse, ClubMemberCreate, ClubMemberResponse

router = APIRouter(prefix="/clubs", tags=["clubs"])


@router.post("/", response_model=ClubResponse, status_code=201)
def create_club(club: ClubCreate):
    result = supabase.table("clubs").insert(club.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create club")
    return result.data[0]


@router.get("/", response_model=list[ClubResponse])
def list_clubs():
    result = supabase.table("clubs").select("*").execute()
    return result.data


@router.get("/{club_id}", response_model=ClubResponse)
def get_club(club_id: str):
    result = supabase.table("clubs").select("*").eq("id", club_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Club not found")
    return result.data[0]


@router.patch("/{club_id}", response_model=ClubResponse)
def update_club(club_id: str, updates: dict):
    result = supabase.table("clubs").update(updates).eq("id", club_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Club not found")
    return result.data[0]


@router.delete("/{club_id}", status_code=204)
def delete_club(club_id: str):
    result = supabase.table("clubs").delete().eq("id", club_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Club not found")


@router.post("/{club_id}/members", response_model=ClubMemberResponse, status_code=201)
def add_member(club_id: str, member: ClubMemberCreate):
    data = member.model_dump()
    data["club_id"] = club_id
    result = supabase.table("club_members").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to add member")
    return result.data[0]


@router.get("/{club_id}/members", response_model=list[ClubMemberResponse])
def list_members(club_id: str):
    result = (
        supabase.table("club_members")
        .select("*")
        .eq("club_id", club_id)
        .execute()
    )
    return result.data


@router.delete("/{club_id}/members/{user_id}", status_code=204)
def remove_member(club_id: str, user_id: str):
    result = (
        supabase.table("club_members")
        .delete()
        .eq("club_id", club_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Member not found")
