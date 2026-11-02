from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import urls

app = FastAPI(title="ClearWeb API")

# CORS = a browser safety rule. By default, a website running on one address
# (our React page) is not allowed to talk to a server on another address
# (our backend). This list says: "these two addresses are allowed".
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """A tiny page that just says the backend is alive."""
    return {"status": "ok"}


app.include_router(urls.router)
