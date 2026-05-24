"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    name: str
    gender: Optional[str] = "man"


class UserCreate(UserBase):
    """Schema for creating a user."""
    pass


class UserUpdate(BaseModel):
    """Schema for partial user update."""
    gender: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClubBase(BaseModel):
    """Base club schema."""
    name: str
    description: str
    location: str


class ClubCreate(ClubBase):
    owner_id: Optional[str] = None


class ClubResponse(ClubBase):
    id: str
    owner_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClubMemberCreate(BaseModel):
    club_id: str
    user_id: str
    role: str = "member"


class ClubMemberResponse(BaseModel):
    id: str
    club_id: str
    user_id: str
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class RunBase(BaseModel):
    """Base run schema."""
    title: str
    date: datetime
    notes: Optional[str] = None


class RunCreate(RunBase):
    """Schema for creating a run."""
    club_id: str


class RunResponse(RunBase):
    """Schema for run response."""
    id: str
    club_id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    run_id: str
    user_id: str
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: str
    run_id: str
    user_id: str
    checked_in_at: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class AttendanceWithUser(AttendanceResponse):
    users: dict


class AttendanceWithRun(AttendanceResponse):
    runs: dict


class RaceBase(BaseModel):
    title: str
    date: datetime
    race_type: str  # 'road_xc' | 'track'
    distance: str
    location: Optional[str] = None
    notes: Optional[str] = None


class RaceCreate(RaceBase):
    club_id: str


class RaceResponse(RaceBase):
    id: str
    club_id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RaceResultCreate(BaseModel):
    race_id: str
    user_id: str
    time_display: Optional[str] = None
    notes: Optional[str] = None


class RaceResultResponse(BaseModel):
    id: str
    race_id: str
    user_id: str
    time_display: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TrackResultCreate(BaseModel):
    race_id: str
    user_id: str
    event: str
    result_display: Optional[str] = None


class TrackResultResponse(BaseModel):
    id: str
    race_id: str
    user_id: str
    event: str
    result_display: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
