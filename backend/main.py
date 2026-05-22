"""FastAPI application for Run Club backend."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
from config import settings

from routes import users_router, clubs_router, runs_router, attendance_router

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


app.include_router(users_router)
app.include_router(clubs_router)
app.include_router(runs_router)
app.include_router(attendance_router)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
