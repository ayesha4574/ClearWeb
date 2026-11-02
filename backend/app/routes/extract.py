from fastapi import APIRouter, HTTPException

from app.routes.urls import UrlRequest
from app.services.extractor import extract_main_content
from app.services.fetcher import FetchError, fetch_page

router = APIRouter()


@router.post("/api/extract")
def extract_route(request: UrlRequest):
    """Safely downloads a webpage and returns its main content as plain text."""
    try:
        page = fetch_page(request.url)
        content = extract_main_content(page.body, page.encoding)
    except FetchError as problem:
        raise HTTPException(
            status_code=problem.status,
            detail={"code": problem.code, "message": problem.message},
        )
    return {
        "ok": True,
        "url": page.final_url,
        "title": content.title,
        "author": content.author,
        "date": content.date,
        "site_name": content.site_name,
        "word_count": content.word_count,
        "truncated": content.truncated,
        "paragraphs": content.paragraphs,
    }
