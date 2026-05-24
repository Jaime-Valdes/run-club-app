from fastapi import APIRouter, HTTPException
from typing import Any
from database import supabase
from schemas import RaceCreate, RaceResponse, RaceResultCreate, RaceResultResponse, TrackResultCreate, TrackResultResponse

router = APIRouter(prefix="/races", tags=["races"])


@router.post("/", response_model=RaceResponse, status_code=201)
def create_race(race: RaceCreate, created_by: str = None):
    data = race.model_dump(mode="json")
    if created_by:
        data["created_by"] = created_by
    result = supabase.table("races").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create race")
    return result.data[0]


@router.get("/", response_model=list[RaceResponse])
def list_races(club_id: str):
    result = (
        supabase.table("races")
        .select("*")
        .eq("club_id", club_id)
        .order("date", desc=True)
        .execute()
    )
    return result.data


@router.get("/{race_id}", response_model=RaceResponse)
def get_race(race_id: str):
    result = supabase.table("races").select("*").eq("id", race_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Race not found")
    return result.data[0]


@router.post("/{race_id}/results", response_model=RaceResultResponse, status_code=201)
def save_result(race_id: str, body: RaceResultCreate):
    data = body.model_dump(mode="json")
    data["race_id"] = race_id
    result = (
        supabase.table("race_results")
        .upsert(data, on_conflict="race_id,user_id")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to save result")
    return result.data[0]


@router.get("/{race_id}/results", response_model=list[RaceResultResponse])
def get_results(race_id: str):
    result = (
        supabase.table("race_results")
        .select("*")
        .eq("race_id", race_id)
        .execute()
    )
    return result.data


@router.delete("/{race_id}/results/{user_id}", status_code=204)
def delete_result(race_id: str, user_id: str):
    supabase.table("race_results").delete().eq("race_id", race_id).eq("user_id", user_id).execute()


@router.get("/user/{user_id}/results", response_model=list[Any])
def get_user_results(user_id: str):
    result = (
        supabase.table("race_results")
        .select("*, races(id, title, date, distance, race_type, location)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/user/{user_id}/track-results", response_model=list[Any])
def get_user_track_results(user_id: str):
    result = (
        supabase.table("track_results")
        .select("*, races(id, title, date, distance, race_type, location)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{race_id}/track-results", response_model=list[Any])
def get_track_results(race_id: str):
    result = (
        supabase.table("track_results")
        .select("*")
        .eq("race_id", race_id)
        .execute()
    )
    return result.data


@router.post("/{race_id}/track-results", response_model=TrackResultResponse, status_code=201)
def save_track_result(race_id: str, body: TrackResultCreate):
    data = body.model_dump(mode="json")
    data["race_id"] = race_id
    result = (
        supabase.table("track_results")
        .upsert(data, on_conflict="race_id,user_id,event")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to save track result")
    return result.data[0]


@router.delete("/{race_id}/track-results/{user_id}/{event}", status_code=204)
def delete_track_result(race_id: str, user_id: str, event: str):
    supabase.table("track_results").delete().eq("race_id", race_id).eq("user_id", user_id).eq("event", event).execute()
