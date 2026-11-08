"""FastAPI application for Run Club backend."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
from config import settings
from sheets import SheetNotConfigured, push_attendance_to_sheet

from routes import users_router, clubs_router, runs_router, attendance_router, races_router

app = FastAPI(
    title="Run Club API",
    description="Backend API for managing run clubs and events",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(APIError)
async def postgrest_error_handler(request: Request, exc: APIError):
    return JSONResponse(
        status_code=400,
        content={"detail": exc.message, "code": exc.code},
    )


@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Welcome to Run Club API"}


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/sync-sheet")
def manual_sync():
    """Manually trigger a Google Sheet sync. Surfaces errors for debugging."""
    try:
        members = push_attendance_to_sheet()
    except SheetNotConfigured as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": type(e).__name__, "detail": str(e)}
    return {"status": "synced", "members": members, "rows_written": members + 1}


app.include_router(users_router)
app.include_router(clubs_router)
app.include_router(runs_router)
app.include_router(attendance_router)
app.include_router(races_router)


if __name__ == "__main__":
    import uvicorn
    import os

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=settings.debug,
    )
