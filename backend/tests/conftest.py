"""
Shared test helpers.

`local_site` starts a tiny pretend website on your own computer that behaves
badly on purpose (sends us to private addresses, sends huge pages, and so on),
so we can check that ClearWeb handles each danger.

ClearWeb normally refuses addresses like 127.0.0.1. For these tests ONLY, we
let 127.0.0.1 count as "public" and allow the test port. Every other
private address (169.254.x.x, 10.x.x.x, ...) stays blocked, so redirect
tests still exercise the real safety checks.
"""

import gzip
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from app.security import url_validator

ARTICLE = """<!doctype html><html lang="en"><head><title>Test Story | Test Site</title>
<meta name="author" content="Jane Doe">
<meta property="article:published_time" content="2024-05-01T10:00:00Z">
<meta property="og:site_name" content="Test Site"></head><body>
<nav><a href="/">Home</a> <a href="/sport">Sport</a></nav>
<div class="ad">BUY NOW!!! Special offer</div>
<article><h1>Test Story</h1>
<p>This is the first paragraph of the story. It has enough words to look like real content for the extractor to keep.</p>
<p>The second paragraph continues the story with more sentences. Readers like clean pages without clutter around them.</p>
%EXTRA%
<script>alert('hacked')</script></article>
<footer>Copyright 2024. Subscribe to our newsletter.</footer></body></html>"""


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # keep test output quiet

    def _send(self, status, body=b"", headers=None):
        self.send_response(status)
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        if body:
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def do_GET(self):
        base = f"http://127.0.0.1:{self.server.server_address[1]}"
        html = {"Content-Type": "text/html; charset=utf-8"}
        path = self.path

        if path == "/ok":
            body = ARTICLE.replace("%EXTRA%", "").encode()
            self._send(200, body, {**html, "Content-Length": str(len(body))})
        elif path == "/ua":
            ua = self.headers.get("User-Agent", "")
            body = ARTICLE.replace("%EXTRA%", f"<p>The browser name we received was: {ua}</p>").encode()
            self._send(200, body, {**html, "Content-Length": str(len(body))})
        elif path == "/latin1":
            text = ARTICLE.replace("%EXTRA%", "<p>We went to a lovely café near the river for lunch today.</p>")
            body = text.encode("latin-1")
            self._send(200, body, {"Content-Type": "text/html; charset=iso-8859-1", "Content-Length": str(len(body))})
        elif path == "/no-content-type":
            body = ARTICLE.replace("%EXTRA%", "").encode()
            self._send(200, body, {"Content-Length": str(len(body))})
        elif path == "/pdf":
            self._send(200, b"%PDF-1.4 fake", {"Content-Type": "application/pdf"})
        elif path == "/redirect-ok":
            self._send(302, headers={"Location": "/ok"})
        elif path == "/redirect-chain":
            self._send(301, headers={"Location": "/redirect-ok"})
        elif path == "/redirect-metadata":
            self._send(302, headers={"Location": "http://169.254.169.254/latest/meta-data/"})
        elif path == "/redirect-private-10":
            self._send(302, headers={"Location": "http://10.0.0.1/"})
        elif path == "/redirect-file":
            self._send(302, headers={"Location": "file:///etc/passwd"})
        elif path == "/redirect-bad-port":
            self._send(302, headers={"Location": "http://127.0.0.1:22/"})
        elif path == "/redirect-loop":
            self._send(302, headers={"Location": "/redirect-loop"})
        elif path == "/redirect-nowhere":
            self._send(302)
        elif path in ("/403", "/404", "/429", "/500", "/503", "/410", "/401"):
            self._send(int(path[1:]), b"nope", html)
        elif path == "/big":
            body = b"<html><body><p>" + b"word " * 5000 + b"</p></body></html>"
            self._send(200, body, {**html, "Content-Length": str(len(body))})
        elif path == "/big-no-length":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            try:
                for _ in range(50):
                    self.wfile.write(b"<p>" + b"word " * 100 + b"</p>")
            except (BrokenPipeError, ConnectionResetError):
                pass
        elif path == "/zipbomb":
            body = gzip.compress(b"<p>" + b"a" * 3_000_000 + b"</p>")
            self._send(200, body, {**html, "Content-Encoding": "gzip", "Content-Length": str(len(body))})
        elif path == "/gzip-ok":
            body = gzip.compress(ARTICLE.replace("%EXTRA%", "").encode())
            self._send(200, body, {**html, "Content-Encoding": "gzip", "Content-Length": str(len(body))})
        elif path == "/dribble":
            # slow but honest: five pieces, 0.2 seconds apart
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            try:
                self.wfile.write(b"<html><head><title>Dribble</title></head><body><article>")
                self.wfile.flush()
                for number in range(1, 6):
                    time.sleep(0.2)
                    self.wfile.write(f"<p>Piece number {number} of the slowly delivered page, with enough words to count.</p>".encode())
                    self.wfile.flush()
                self.wfile.write(b"</article></body></html>")
            except (BrokenPipeError, ConnectionResetError):
                pass
        elif path == "/slow":
            time.sleep(3)
            self._send(200, b"<p>late</p>", html)
        elif path == "/trickle":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            try:
                for _ in range(40):
                    self.wfile.write(b"<p>drip</p>")
                    self.wfile.flush()
                    time.sleep(0.3)
            except (BrokenPipeError, ConnectionResetError):
                pass
        elif path == "/empty-page":
            body = b"<html><body><nav><a href='/'>Home</a></nav></body></html>"
            self._send(200, body, {**html, "Content-Length": str(len(body))})
        else:
            self._send(404, b"unknown test path", html)


@pytest.fixture
def local_site(monkeypatch):
    server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    server.daemon_threads = True
    port = server.server_address[1]
    threading.Thread(target=lambda: server.serve_forever(poll_interval=0.05), daemon=True).start()

    real_is_public_ip = url_validator.is_public_ip
    monkeypatch.setattr(
        url_validator, "is_public_ip", lambda ip: ip == "127.0.0.1" or real_is_public_ip(ip)
    )
    monkeypatch.setattr(url_validator, "ALLOWED_PORTS", {80, 443, port})

    yield f"http://127.0.0.1:{port}"

    server.shutdown()
    server.server_close()
