import socket
import time

import pytest

from app.security import url_validator
from app.services import fetcher
from app.services.extractor import extract_main_content
from app.services.fetcher import FetchError, fetch_page


def code_of(url):
    """Fetch a page that should fail, and return the error code."""
    with pytest.raises(FetchError) as problem:
        fetch_page(url)
    return problem.value.code


# ---------- Normal pages ----------

def test_fetches_a_normal_page(local_site):
    page = fetch_page(local_site + "/ok")
    assert b"first paragraph of the story" in page.body
    assert page.final_url == local_site + "/ok"
    assert page.encoding == "utf-8"


def test_we_introduce_ourselves_honestly(local_site):
    page = fetch_page(local_site + "/ua")
    assert b"ClearWebReader" in page.body


def test_page_without_content_type_is_still_read(local_site):
    page = fetch_page(local_site + "/no-content-type")
    assert b"first paragraph" in page.body


def test_old_style_character_sets_are_read_correctly(local_site):
    page = fetch_page(local_site + "/latin1")
    content = extract_main_content(page.body, page.encoding)
    assert "café" in content.text


# ---------- Redirects ----------

def test_safe_redirect_is_followed(local_site):
    page = fetch_page(local_site + "/redirect-ok")
    assert page.final_url == local_site + "/ok"
    assert b"first paragraph" in page.body


def test_chain_of_redirects_is_followed(local_site):
    page = fetch_page(local_site + "/redirect-chain")
    assert page.final_url == local_site + "/ok"


@pytest.mark.parametrize(
    "path",
    ["/redirect-metadata", "/redirect-private-10", "/redirect-file", "/redirect-bad-port"],
)
def test_redirect_to_unsafe_place_is_stopped(local_site, path):
    assert code_of(local_site + path) == "unsafe_redirect"


def test_redirect_loop_is_stopped(local_site):
    assert code_of(local_site + "/redirect-loop") == "too_many_redirects"


def test_redirect_without_destination_gives_friendly_error(local_site):
    assert code_of(local_site + "/redirect-nowhere") == "site_error"


# ---------- Addresses that are refused before we connect ----------

@pytest.mark.parametrize(
    "url",
    ["http://127.0.0.1/", "http://localhost/", "file:///etc/passwd", "http://169.254.169.254/", "http://2130706433/"],
)
def test_unsafe_addresses_are_refused_up_front(url):
    assert code_of(url) == "bad_url"


def test_name_that_changes_its_answer_is_blocked(monkeypatch):
    """
    "DNS rebinding": the website answers 'public address' when we first check
    it, then 'private address' when we actually connect. The connect-time
    check must catch the second answer.
    """
    answers = [["93.184.216.34"], ["127.0.0.1"], ["127.0.0.1"]]
    calls = []

    def rebinding_resolver(host):
        calls.append(host)
        return answers[min(len(calls) - 1, len(answers) - 1)]

    monkeypatch.setattr(url_validator, "resolve_host", rebinding_resolver)
    assert code_of("https://rebind.example/") == "unsafe_address"
    assert len(calls) == 2  # once for the up-front check, once when connecting


def test_connection_failure_gives_friendly_error(local_site, monkeypatch):
    # find a port nobody is listening on
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    free_port = sock.getsockname()[1]
    sock.close()
    monkeypatch.setattr(url_validator, "ALLOWED_PORTS", {80, 443, free_port})
    assert code_of(f"http://127.0.0.1:{free_port}/") == "unreachable"


# ---------- Websites that say no ----------

@pytest.mark.parametrize(
    "path, expected",
    [
        ("/401", "blocked"),
        ("/403", "blocked"),
        ("/429", "blocked"),
        ("/404", "not_found"),
        ("/410", "not_found"),
        ("/500", "site_error"),
        ("/503", "site_error"),
    ],
)
def test_error_codes_become_friendly_errors(local_site, path, expected):
    assert code_of(local_site + path) == expected


def test_non_webpage_files_are_refused(local_site):
    assert code_of(local_site + "/pdf") == "unsupported_type"


# ---------- Size and time limits ----------

def test_page_that_announces_it_is_too_big_is_refused(local_site, monkeypatch):
    monkeypatch.setattr(fetcher, "MAX_BYTES", 2000)
    assert code_of(local_site + "/big") == "too_large"


def test_page_that_does_not_announce_its_size_is_cut_off(local_site, monkeypatch):
    monkeypatch.setattr(fetcher, "MAX_BYTES", 2000)
    assert code_of(local_site + "/big-no-length") == "too_large"


def test_zip_bomb_is_refused(local_site, monkeypatch):
    # tiny download that unzips to 3 MB
    monkeypatch.setattr(fetcher, "MAX_BYTES", 100_000)
    assert code_of(local_site + "/zipbomb") == "too_large"


def test_slow_website_times_out(local_site, monkeypatch):
    monkeypatch.setattr(fetcher, "READ_TIMEOUT", 0.5)
    assert code_of(local_site + "/slow") == "timeout"


def test_website_that_trickles_forever_times_out_quickly(local_site, monkeypatch):
    monkeypatch.setattr(fetcher, "TOTAL_TIMEOUT", 1.5)
    started = time.monotonic()
    assert code_of(local_site + "/trickle") == "timeout"
    # The trickle would last 12 seconds. We must give up close to our own limit.
    assert time.monotonic() - started < 4


def test_slow_but_honest_page_is_still_read_completely(local_site):
    page = fetch_page(local_site + "/dribble")
    for number in range(1, 6):
        assert f"Piece number {number}".encode() in page.body


def test_compressed_page_is_unzipped(local_site):
    page = fetch_page(local_site + "/gzip-ok")
    assert b"first paragraph of the story" in page.body
