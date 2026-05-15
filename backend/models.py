"""Database models for the Run Club app."""

from datetime import datetime
from typing import Optional


class User:
    """User model for run club members."""
    
    def __init__(
        self,
        id: str,
        email: str,
        name: str,
        created_at: datetime,
        updated_at: datetime,
    ):
        self.id = id
        self.email = email
        self.name = name
        self.created_at = created_at
        self.updated_at = updated_at


class Club:
    """Run club model."""
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        location: str,
        owner_id: str,
        created_at: datetime,
        updated_at: datetime,
    ):
        self.id = id
        self.name = name
        self.description = description
        self.location = location
        self.owner_id = owner_id
        self.created_at = created_at
        self.updated_at = updated_at


class Run:
    """Run event model."""
    
    def __init__(
        self,
        id: str,
        club_id: str,
        title: str,
        description: Optional[str],
        date: datetime,
        distance_km: float,
        pace: str,
        created_by: str,
        created_at: datetime,
        updated_at: datetime,
    ):
        self.id = id
        self.club_id = club_id
        self.title = title
        self.description = description
        self.date = date
        self.distance_km = distance_km
        self.pace = pace
        self.created_by = created_by
        self.created_at = created_at
        self.updated_at = updated_at
