from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_says_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_react_page_is_allowed_to_talk_to_backend():
    response = client.get(
        "/api/health", headers={"Origin": "http://localhost:5173"}
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_unknown_website_is_not_allowed():
    response = client.get(
        "/api/health", headers={"Origin": "http://evil.example.com"}
    )
    assert "access-control-allow-origin" not in response.headers
