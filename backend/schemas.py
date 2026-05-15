"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    name: str


class UserCreate(UserBase):
    """Schema for creating a user."""
    pass


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
    """Schema for creating a club."""
    pass


class ClubResponse(ClubBase):
    """Schema for club response."""
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RunBase(BaseModel):
    """Base run schema."""
    title: str
    description: Optional[str] = None
    date: datetime
    distance_km: float
    pace: str


class RunCreate(RunBase):
    """Schema for creating a run."""
    club_id: str


class RunResponse(RunBase):
    """Schema for run response."""
    id: str
    club_id: str
    created_by: str
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
