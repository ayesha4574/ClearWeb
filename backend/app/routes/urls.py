from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.security.url_validator import UnsafeURLError, validate_url

router = APIRouter()


class UrlRequest(BaseModel):
    url: str


@router.post("/api/validate-url")
def validate_url_route(request: UrlRequest):
    """Checks that a web address is safe to open. Does NOT visit the website."""
    try:
        checked = validate_url(request.url)
    except UnsafeURLError as problem:
        raise HTTPException(status_code=400, detail=str(problem))
    return {"ok": True, "url": checked.url, "host": checked.host}
