from supabase import create_client, Client
from config import settings


def get_supabase_client() -> Client:
    """Initialize and return Supabase client."""
    supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
    return supabase


# Initialize Supabase client
supabase = get_supabase_client()
