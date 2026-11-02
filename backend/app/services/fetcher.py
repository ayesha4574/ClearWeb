"""
Safely downloads a webpage.

Why not just "download the page"? Because the address came from a stranger.
This file makes sure that, at every step, we only talk to the PUBLIC internet:

1. The address is checked before we start (see security/url_validator.py).
2. At the moment we connect, we look up the address AGAIN and check every
   answer. We then connect to exactly the address we checked. (A tricky
   website could otherwise answer "public" to our first question and
   "private" to the second.)
3. Redirects ("go to this other address") are followed one at a time, and each
   new address goes through the same checks.
4. We stop if the page is too big, too slow, or not a normal webpage.
"""

import socket
import time
from dataclasses import dataclass
from urllib.parse import urljoin

import certifi
import urllib3
from urllib3.connection import HTTPConnection, HTTPSConnection
from urllib3.connectionpool import HTTPConnectionPool, HTTPSConnectionPool
from urllib3.exceptions import (
    HTTPError,
    LocationParseError,
    MaxRetryError,
    ReadTimeoutError,
    SSLError,
)
from urllib3.util import connection as urllib3_connection

from app.security import url_validator
from app.security.url_validator import UnsafeURLError, validate_url

# ---- Limits (kept in one place so they are easy to find and change) ----
CONNECT_TIMEOUT = 5  # seconds to wait for a website to answer
READ_TIMEOUT = 10  # seconds to wait for each piece of the page
TOTAL_TIMEOUT = 20  # seconds for the whole download, redirects included
MAX_BYTES = 5_000_000  # biggest page we accept (5 MB, after unzipping)
MAX_REDIRECTS = 5

USER_AGENT = "ClearWebReader/0.1 (accessibility reader; +https://github.com/ayesha4574/ClearWeb)"
HTML_TYPES = {"text/html", "application/xhtml+xml"}
REDIRECT_CODES = {301, 302, 303, 307, 308}


class FetchError(Exception):
    """
    A problem we can explain to the user.
    code    = short label the website page can react to (e.g. "blocked")
    message = friendly sentence for the user
    status  = the HTTP status our own backend answers with
    """

    def __init__(self, code, message, status=502):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


@dataclass
class FetchedPage:
    final_url: str  # the address we ended up on (after redirects)
    body: bytes  # the raw page
    encoding: str  # character set announced by the website, or "" if unknown


# ---------------------------------------------------------------------------
# Safe connections: check the address at the moment we connect.
# ---------------------------------------------------------------------------

class _SafeConnectionMixin:
    def _new_conn(self):
        ips = url_validator.resolve_host(self._dns_host.rstrip("."))
        if not ips:
            raise UnsafeURLError("We could not find that website. Please check the address for typos.")
        for ip in ips:
            if not url_validator.is_public_ip(ip):
                raise UnsafeURLError(
                    "For safety, ClearWeb can only open public websites. "
                    "That address points to a private or internal location."
                )
        last_problem = None
        for ip in ips:
            try:
                # Connect to the exact IP we just checked, not to the name.
                return urllib3_connection.create_connection(
                    (ip, self.port),
                    self.timeout,
                    source_address=self.source_address,
                    socket_options=self.socket_options,
                )
            except OSError as problem:
                last_problem = problem
        raise last_problem


class _SafeHTTPConnection(_SafeConnectionMixin, HTTPConnection):
    pass


class _SafeHTTPSConnection(_SafeConnectionMixin, HTTPSConnection):
    pass


class _SafeHTTPPool(HTTPConnectionPool):
    ConnectionCls = _SafeHTTPConnection


class _SafeHTTPSPool(HTTPSConnectionPool):
    ConnectionCls = _SafeHTTPSConnection


def _make_manager():
    manager = urllib3.PoolManager(
        retries=False,  # we handle redirects ourselves, one safe step at a time
        cert_reqs="CERT_REQUIRED",  # websites must have a valid security certificate
        ca_certs=certifi.where(),
        num_pools=4,
    )
    manager.pool_classes_by_scheme = {"http": _SafeHTTPPool, "https": _SafeHTTPSPool}
    return manager


# ---------------------------------------------------------------------------
# Downloading
# ---------------------------------------------------------------------------

def _charset_from(content_type_header):
    for piece in content_type_header.split(";")[1:]:
        name, _, value = piece.strip().partition("=")
        if name.strip().lower() == "charset":
            return value.strip().strip('"').strip("'").lower()
    return ""


def _fail_for_status(status):
    if status in (401, 403, 429):
        raise FetchError(
            "blocked",
            f"This website did not allow ClearWeb to read the page (code {status}). "
            "Some sites block automatic readers. Try a different page or website.",
        )
    if status in (404, 410):
        raise FetchError(
            "not_found",
            "That page was not found on the website. Please check the address.",
        )
    raise FetchError(
        "site_error",
        f"The website had a problem and did not give us the page (code {status}). "
        "Please try again later.",
    )


def _read_body(response, deadline):
    declared = response.headers.get("Content-Length", "")
    if declared.isdigit() and int(declared) > MAX_BYTES:
        raise FetchError("too_large", "That page is too large for ClearWeb to read.", 422)
    chunks = []
    total = 0
    while True:
        # read1 hands us whatever has arrived so far. (Waiting for a big full
        # chunk would let a website drip data very slowly and keep us waiting.)
        chunk = response.read1(16384, decode_content=True)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_BYTES:
            raise FetchError("too_large", "That page is too large for ClearWeb to read.", 422)
        if time.monotonic() > deadline:
            raise FetchError("timeout", "The website took too long to send the page.", 504)
        chunks.append(chunk)
    return b"".join(chunks)


def fetch_page(raw_url):
    """Safely download a page. Returns FetchedPage, or raises FetchError."""
    deadline = time.monotonic() + TOTAL_TIMEOUT

    try:
        current = validate_url(raw_url).url
    except UnsafeURLError as problem:
        raise FetchError("bad_url", str(problem), 400)

    manager = _make_manager()
    try:
        for _hop in range(MAX_REDIRECTS + 1):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise FetchError("timeout", "The website took too long to answer.", 504)

            try:
                response = manager.request(
                    "GET",
                    current,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
                        "Accept-Encoding": "gzip, deflate",
                    },
                    redirect=False,
                    preload_content=False,
                    timeout=urllib3.Timeout(
                        connect=min(CONNECT_TIMEOUT, remaining),
                        read=min(READ_TIMEOUT, remaining),
                    ),
                )
            except UnsafeURLError as problem:
                # Raised by our connection check (e.g. a name that now points somewhere private)
                raise FetchError("unsafe_address", str(problem), 400)
            except LocationParseError:
                raise FetchError("bad_url", "That does not look like a valid web address.", 400)
            except MaxRetryError as problem:
                reason = problem.reason
                if isinstance(reason, SSLError):
                    raise FetchError(
                        "tls_error",
                        "We could not make a secure connection to that website. "
                        "Its security certificate may be invalid.",
                    )
                if isinstance(reason, ReadTimeoutError) or isinstance(reason, socket.timeout):
                    raise FetchError("timeout", "The website took too long to answer.", 504)
                if isinstance(reason, urllib3.exceptions.ConnectTimeoutError):
                    raise FetchError("timeout", "The website took too long to answer.", 504)
                raise FetchError("unreachable", "We could not connect to that website.")
            except (ReadTimeoutError, socket.timeout, TimeoutError):
                raise FetchError("timeout", "The website took too long to answer.", 504)
            except SSLError:
                raise FetchError(
                    "tls_error",
                    "We could not make a secure connection to that website. "
                    "Its security certificate may be invalid.",
                )
            except HTTPError:
                raise FetchError("unreachable", "We could not connect to that website.")

            try:
                # --- redirect: check the new address like a brand-new one ---
                if response.status in REDIRECT_CODES:
                    location = response.headers.get("Location", "")
                    if not location:
                        raise FetchError("site_error", "The website sent us somewhere, but did not say where.")
                    try:
                        current = validate_url(urljoin(current, location)).url
                    except UnsafeURLError:
                        raise FetchError(
                            "unsafe_redirect",
                            "That website tried to send us to an address that is not allowed, "
                            "so ClearWeb stopped.",
                            400,
                        )
                    continue

                if not 200 <= response.status < 300:
                    _fail_for_status(response.status)

                content_type_header = response.headers.get("Content-Type", "")
                content_type = content_type_header.split(";")[0].strip().lower()
                if content_type and content_type not in HTML_TYPES:
                    raise FetchError(
                        "unsupported_type",
                        "ClearWeb can only read normal webpages. "
                        "That address is a different kind of file (for example a PDF, image or video).",
                        422,
                    )

                try:
                    body = _read_body(response, deadline)
                except (ReadTimeoutError, socket.timeout, TimeoutError):
                    raise FetchError("timeout", "The website took too long to send the page.", 504)
                except HTTPError:
                    raise FetchError("unreachable", "The connection to that website was interrupted.")

                return FetchedPage(
                    final_url=current,
                    body=body,
                    encoding=_charset_from(content_type_header),
                )
            finally:
                response.release_conn()

        raise FetchError(
            "too_many_redirects",
            "That website sent us around in circles (too many redirects).",
            502,
        )
    finally:
        manager.clear()
