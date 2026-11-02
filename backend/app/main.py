import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import extract, simplify, summarize, urls

# Load backend/.env if it exists
backend_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=backend_env)

app = FastAPI(title="ClearWeb API")

# Configure CORS: allow local development origins and any production origins specified in ALLOWED_ORIGINS
default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
extra_origins = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
allowed_origins = list(dict.fromkeys(default_origins + extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """A tiny page that just says the backend is alive."""
    return {"status": "ok"}


app.include_router(urls.router)
app.include_router(extract.router)
app.include_router(summarize.router)
app.include_router(simplify.router)
