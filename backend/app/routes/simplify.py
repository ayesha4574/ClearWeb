from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.simplifier import SimplifyError, simplify_article

router = APIRouter()


class SimplifyRequest(BaseModel):
  paragraphs: List[str] = Field(..., min_length=1)
  title: Optional[str] = None
  level: str = Field(default="simple")


@router.post("/api/simplify")
def simplify_route(request: SimplifyRequest):
  """
  Rewrites extracted article content in simpler, more accessible language using Gemini AI.
  Treats input text as untrusted and returns structured simplified paragraphs.
  """
  try:
    return simplify_article(
      paragraphs=request.paragraphs,
      title=request.title,
      level=request.level,
    )
  except SimplifyError as exc:
    raise HTTPException(
      status_code=exc.status_code,
      detail={"code": exc.code, "message": exc.message},
    )
