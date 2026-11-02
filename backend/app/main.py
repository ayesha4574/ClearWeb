from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import extract, summarize, urls

# Load backend/.env if it exists
backend_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=backend_env)

app = FastAPI(title="ClearWeb API")

# CORS = a browser safety rule. By default, a website running on one address
# (our React page) is not allowed to talk to a server on another address
# (our backend). This list says: "these two addresses are allowed".
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
