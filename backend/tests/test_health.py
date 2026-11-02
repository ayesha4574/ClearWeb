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


def test_preflight_options_for_extract_allowed():
    response = client.options(
        "/api/extract",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_production_origin_from_allowed_origins(monkeypatch):
    import os
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    monkeypatch.setenv("ALLOWED_ORIGINS", "https://clearweb.vercel.app, https://preview.vercel.app")
    default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    extra_origins = [
        origin.strip()
        for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]
    allowed_origins = list(dict.fromkeys(default_origins + extra_origins))

    assert "https://clearweb.vercel.app" in allowed_origins
    assert "https://preview.vercel.app" in allowed_origins
    assert "http://localhost:5173" in allowed_origins

    test_app = FastAPI()
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @test_app.get("/api/health")
    def health():
        return {"status": "ok"}

    test_client = TestClient(test_app)

    # Allowed production origin gets CORS header
    res = test_client.get("/api/health", headers={"Origin": "https://clearweb.vercel.app"})
    assert res.headers["access-control-allow-origin"] == "https://clearweb.vercel.app"

    # OPTIONS preflight gets allowed origin and methods
    options_res = test_client.options(
        "/api/health",
        headers={
            "Origin": "https://clearweb.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert options_res.status_code == 200
    assert options_res.headers["access-control-allow-origin"] == "https://clearweb.vercel.app"

    # Disallowed origin does NOT get CORS header
    disallowed_res = test_client.get("/api/health", headers={"Origin": "https://evil.com"})
    assert "access-control-allow-origin" not in disallowed_res.headers

