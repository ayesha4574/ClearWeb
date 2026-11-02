from fastapi.testclient import TestClient

from app.main import app
from app.routes import extract as extract_route
from app.services.fetcher import FetchError, FetchedPage

client = TestClient(app)


def post(url):
    return client.post("/api/extract", json={"url": url})


def test_full_journey_through_a_real_download(local_site):
    response = post(local_site + "/redirect-ok")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["url"] == local_site + "/ok"
    assert data["title"] == "Test Story"
    assert data["author"] == "Jane Doe"
    assert data["date"] == "2024-05-01"
    assert data["site_name"] == "Test Site"
    assert any("first paragraph" in p for p in data["paragraphs"])
    assert "BUY NOW" not in " ".join(data["paragraphs"])
    assert "hacked" not in response.text
    assert "<script" not in response.text


def test_unsafe_address_gets_400_with_a_code():
    response = post("http://169.254.169.254/")
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "bad_url"
    assert "ClearWeb" in response.json()["detail"]["message"]


def test_unsafe_redirect_gets_400(local_site):
    response = post(local_site + "/redirect-metadata")
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "unsafe_redirect"


def test_blocked_website_gets_friendly_error(local_site):
    response = post(local_site + "/403")
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "blocked"


def test_page_with_no_article_gets_422(local_site):
    response = post(local_site + "/empty-page")
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "no_content"


def test_pdf_gets_422(local_site):
    response = post(local_site + "/pdf")
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "unsupported_type"


def test_timeout_gets_504(monkeypatch):
    def too_slow(url):
        raise FetchError("timeout", "The website took too long to answer.", 504)

    monkeypatch.setattr(extract_route, "fetch_page", too_slow)
    response = post("https://example.com")
    assert response.status_code == 504
    assert response.json()["detail"]["code"] == "timeout"


def test_missing_url_gets_422():
    assert client.post("/api/extract", json={}).status_code == 422


def test_error_messages_do_not_leak_internal_details(local_site):
    response = post(local_site + "/500")
    text = response.text
    for secret in ["Traceback", "127.0.0.1", "urllib3", "File \""]:
        assert secret not in text


def test_old_endpoints_still_work():
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.post("/api/validate-url", json={"url": "http://127.0.0.1"}).status_code == 400
