import threading

from supabase import create_client, Client
from config import settings


def get_supabase_client() -> Client:
    """Initialize and return Supabase client."""
    supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
    return supabase


class _PerThreadClient:
    """Gives each worker thread its own client.

    A client holds one HTTP/2 connection, and FastAPI runs simultaneous requests
    on different threads. Sharing it makes them fail with httpx.ReadError.
    """

    def __init__(self):
        self._local = threading.local()

    def table(self, name: str):
        if not hasattr(self._local, "client"):
            self._local.client = get_supabase_client()
        return self._local.client.table(name)


supabase = _PerThreadClient()

PAGE_SIZE = 1000


def fetch_all(build_query):
    """Return every row of a select. Supabase caps each response at 1000 rows by default.

    build_query must return a fresh, ordered query on each call, since .range() mutates it.
    """
    rows = []
    while True:
        page = build_query().range(len(rows), len(rows) + PAGE_SIZE - 1).execute().data
        if not page:
            return rows
        rows.extend(page)
