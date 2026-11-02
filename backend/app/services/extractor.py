"""
Turns a webpage into clean reading text using Trafilatura.

Rules we follow here:
- The page is untrusted. We only ever return PLAIN TEXT, never page code.
- We never invent facts. A date is returned only if the page itself declares
  one (in its metadata, a <time> tag or structured data). Trafilatura can also
  GUESS dates from the web address or from sentences in the text. We switch
  those guesses off, because a guess is not a fact.
"""

import datetime
import re
from dataclasses import dataclass, field

import trafilatura

from app.services.fetcher import FetchError

MAX_TEXT_CHARS = 300_000  # longest text we return
MIN_TEXT_CHARS = 50  # shorter than this = "we found no real article"
MAX_FIELD_CHARS = 300  # longest title / author / site name we return

# Only look at dates the page declares. No guessing from text.
DATE_SETTINGS = {"extensive_search": False, "original_date": True}


@dataclass
class ExtractedPage:
    title: str = None
    author: str = None
    date: str = None  # "YYYY-MM-DD" or None
    site_name: str = None
    text: str = ""
    paragraphs: list = field(default_factory=list)
    word_count: int = 0
    truncated: bool = False


def _clean_field(value):
    if not isinstance(value, str):
        return None
    value = " ".join(value.split())
    return value[:MAX_FIELD_CHARS] or None


def _clean_date(value):
    """Keep only a real calendar date written as YYYY-MM-DD. Otherwise None."""
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return None
    try:
        datetime.date.fromisoformat(value)
    except ValueError:
        return None
    return value


def _to_text(body, encoding):
    """Turn raw bytes into text, using the website's announced character set if valid."""
    if encoding:
        try:
            return body.decode(encoding, errors="replace")
        except LookupError:
            pass  # unknown character set name
    return body  # let Trafilatura detect the character set itself


def _group_paragraphs(text: str) -> list[str]:
    """Groups consecutive markdown table rows and list items into coherent blocks."""
    raw_lines = [line.strip() for line in text.split("\n") if line.strip()]
    blocks = []
    current_table = []
    current_list = []

    def flush():
        nonlocal current_table, current_list
        if current_table:
            blocks.append("\n".join(current_table))
            current_table = []
        if current_list:
            blocks.append("\n".join(current_list))
            current_list = []

    for line in raw_lines:
        is_table_row = line.startswith("|") and line.endswith("|")
        is_list_item = bool(line.startswith(("- ", "* ", "• ")) or re.match(r"^\d+\.\s", line))

        if is_table_row:
            if current_list:
                flush()
            current_table.append(line)
        elif is_list_item:
            if current_table:
                flush()
            current_list.append(line)
        else:
            flush()
            blocks.append(line)

    flush()
    return blocks


def extract_main_content(body, encoding=""):
    """Returns ExtractedPage, or raises FetchError("no_content") if there is no article."""
    try:
        document = trafilatura.bare_extraction(
            _to_text(body, encoding),
            with_metadata=True,
            include_comments=False,
            include_formatting=True,
            date_extraction_params=DATE_SETTINGS,
            # NOTE: we deliberately do NOT pass the page's web address. With it,
            # Trafilatura may read a "date" out of the address itself.
        )
    except Exception:
        document = None

    text = (getattr(document, "text", None) or "").strip()
    if len(text) < MIN_TEXT_CHARS:
        raise FetchError(
            "no_content",
            "We could not find a main article on that page. It may be mostly menus or "
            "links, need a login, or load its content with JavaScript.",
            422,
        )

    truncated = len(text) > MAX_TEXT_CHARS
    if truncated:
        text = text[:MAX_TEXT_CHARS]

    paragraphs = _group_paragraphs(text)
    return ExtractedPage(
        title=_clean_field(document.title),
        author=_clean_field(document.author),
        date=_clean_date(document.date),
        site_name=_clean_field(document.sitename),
        text=text,
        paragraphs=paragraphs,
        word_count=len(text.split()),
        truncated=truncated,
    )
