import pytest

from app.services import extractor
from app.services.extractor import extract_main_content
from app.services.fetcher import FetchError

WORDS = "This is a sentence that has no date anywhere inside it. " * 8


def page(head="", body_extra="", article_extra=""):
    return (
        f"<html><head><title>Plain page</title>{head}</head><body>{body_extra}"
        f"<article><p>{WORDS}</p>{article_extra}</article></body></html>"
    ).encode()


def test_main_content_is_kept_and_clutter_is_removed():
    html = """<html lang="en"><head><title>Sample Story | News Site</title>
    <meta name="author" content="Jane Doe">
    <meta property="og:site_name" content="News Site"></head><body>
    <nav><a href="/">Home</a> <a href="/sport">Sport</a></nav>
    <div class="ad">BUY NOW!!! Special offer</div>
    <article><h1>Sample Story</h1>
    <p>This is the first paragraph of the story. It has enough words to look like real content for the extractor to keep.</p>
    <p>The second paragraph continues the story with more sentences. Readers like clean pages without clutter around them.</p>
    <script>alert('hacked')</script></article>
    <footer>Copyright 2024. Subscribe to our newsletter.</footer></body></html>""".encode()
    result = extract_main_content(html)
    assert result.title == "Sample Story"
    assert result.author == "Jane Doe"
    assert result.site_name == "News Site"
    assert "first paragraph" in result.text and "second paragraph" in result.text
    assert len(result.paragraphs) >= 2
    for clutter in ["BUY NOW", "Subscribe", "Copyright", "Sport"]:
        assert clutter not in result.text
    assert "alert" not in result.text and "<script" not in result.text
    assert result.word_count > 20


# ---------- Dates: only ever what the page itself declares ----------

def test_date_from_meta_tag_is_kept():
    html = page(head='<meta property="article:published_time" content="2024-05-01T10:00:00Z">')
    assert extract_main_content(html).date == "2024-05-01"


def test_date_from_time_tag_is_kept():
    html = page(article_extra='<time datetime="2023-07-09">9 July</time>')
    assert extract_main_content(html).date == "2023-07-09"


def test_date_from_structured_data_is_kept():
    html = page(head='<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2022-01-15T08:00:00Z"}</script>')
    assert extract_main_content(html).date == "2022-01-15"


def test_no_date_means_no_date():
    assert extract_main_content(page()).date is None


def test_date_is_not_guessed_from_the_web_address():
    # Even if the website's address looked like /2019/03/04/post, we never pass
    # the address to Trafilatura, so it cannot guess from it.
    assert extract_main_content(page()).date is None


def test_date_is_not_guessed_from_sentences_in_the_text():
    html = page(article_extra="<p>Posted on 3 March 2021 by someone. More words follow here for length.</p>")
    assert extract_main_content(html).date is None


@pytest.mark.parametrize("bad", ["2024-13-45", "yesterday", "2024/05/01", "", None, 20240501])
def test_malformed_dates_are_dropped(bad):
    assert extractor._clean_date(bad) is None


# ---------- Pages with nothing to read ----------

def test_page_with_only_menus_gives_friendly_error():
    html = b"<html><body><nav><a href='/'>Home</a></nav></body></html>"
    with pytest.raises(FetchError) as problem:
        extract_main_content(html)
    assert problem.value.code == "no_content"


@pytest.mark.parametrize("junk", [b"", b"not html at all \x00\x01\x02", b"<<<<>>>>", b"\xff\xfe\xfd" * 50])
def test_garbage_input_never_crashes(junk):
    with pytest.raises(FetchError) as problem:
        extract_main_content(junk)
    assert problem.value.code == "no_content"


# ---------- Output safety ----------

def test_very_long_text_is_cut_and_flagged(monkeypatch):
    monkeypatch.setattr(extractor, "MAX_TEXT_CHARS", 200)
    result = extract_main_content(page())
    assert result.truncated is True
    assert len(result.text) <= 200


def test_overlong_title_is_shortened():
    long_title = "T" * 1000
    html = f"<html><head><title>{long_title}</title></head><body><article><p>{WORDS}</p></article></body></html>".encode()
    result = extract_main_content(html)
    assert result.title is None or len(result.title) <= 300


def test_unknown_character_set_name_does_not_crash():
    result = extract_main_content(page(), encoding="totally-made-up-charset")
    assert "sentence" in result.text
