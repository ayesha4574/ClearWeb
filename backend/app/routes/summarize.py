from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.summarizer import SummarizeError, summarize_article

router = APIRouter()


class SummaryRequest(BaseModel):
  paragraphs: List[str] = Field(..., min_length=1)
  title: Optional[str] = None
  length: str = Field(default="medium")


@router.post("/api/summarize")
def summarize_route(request: SummaryRequest):
  """
  Summarizes extracted article content using Google Gemini AI.
  Treats input text as untrusted and returns structured summary and takeaways.
  """
  try:
    return summarize_article(
      paragraphs=request.paragraphs,
      title=request.title,
      length=request.length,
    )
  except SummarizeError as exc:
    raise HTTPException(
      status_code=exc.status_code,
      detail={"code": exc.code, "message": exc.message},
    )
