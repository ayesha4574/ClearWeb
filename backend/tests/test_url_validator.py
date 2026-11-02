import socket

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.security import url_validator
from app.security.url_validator import UnsafeURLError, is_public_ip, validate_url

client = TestClient(app)

real_resolve_host = url_validator.resolve_host  # saved before tests replace it

PUBLIC_IP = "93.184.216.34"


@pytest.fixture(autouse=True)
def fake_internet(monkeypatch):
    """
    Pretend to be the internet's phone book (DNS), so tests are repeatable.
    Names we invent below "point" to whatever IP we choose.
    """
    phone_book = {
        "example.com": [PUBLIC_IP],
        "www.example.com": [PUBLIC_IP],
        "xn--bcher-kva.example": [PUBLIC_IP],
        "sneaky.example": ["127.0.0.1"],  # public-looking name -> private address!
        "mixed.example": [PUBLIC_IP, "10.0.0.5"],  # one good answer, one bad
        "metadata.example": ["169.254.169.254"],
        "v6local.example": ["::1"],
        "v6mapped.example": ["::ffff:127.0.0.1"],
        "empty.example": [],
        "0177.0.0.1": ["177.0.0.1"],  # what a Mac thinks this means
    }

    def fake_resolver(host):
        if host in phone_book:
            return phone_book[host]
        # Real behaviour for IP-address-style hosts and everything else:
        if host == "localhost":
            return ["127.0.0.1", "::1"]
        try:
            return real_resolve(host)
        except UnsafeURLError:
            raise

    real_resolve = real_resolve_host
    monkeypatch.setattr(url_validator, "resolve_host", fake_resolver)


# ---------- Addresses that SHOULD be accepted ----------

@pytest.mark.parametrize(
    "typed, expected_url",
    [
        ("https://example.com", "https://example.com"),
        ("http://example.com/page?x=1", "http://example.com/page?x=1"),
        ("example.com", "https://example.com"),  # no https:// typed
        ("  https://example.com/a  ", "https://example.com/a"),  # extra spaces
        ("https://EXAMPLE.com:443/x", "https://EXAMPLE.com:443/x"),
        ("https://example.com.", "https://example.com."),  # trailing dot
        ("https://www.example.com/news/story-1", "https://www.example.com/news/story-1"),
    ],
)
def test_good_addresses_are_accepted(typed, expected_url):
    result = validate_url(typed)
    assert result.url == expected_url
    assert result.ip_addresses == [PUBLIC_IP]


def test_international_names_are_accepted():
    result = validate_url("https://bücher.example")
    assert result.host == "xn--bcher-kva.example"


def test_normal_ip_address_is_accepted():
    result = validate_url("https://8.8.8.8/")
    assert result.host == "8.8.8.8"


# ---------- Addresses that MUST be blocked ----------

@pytest.mark.parametrize(
    "bad",
    [
        # pointing at this computer
        "http://localhost",
        "http://localhost:8000",
        "http://127.0.0.1",
        "https://127.0.0.1/admin",
        "http://[::1]/",
        "http://0.0.0.0",
        # disguised versions of 127.0.0.1
        "http://2130706433/",  # same number written as one big number
        "http://0x7f000001/",  # hexadecimal
        "http://0177.0.0.1/",  # octal
        "http://127.1/",  # shortened
        "http://[::ffff:127.0.0.1]/",  # IPv4 hidden inside IPv6
        # private networks (homes, offices)
        "http://10.0.0.1/",
        "http://192.168.1.1/",
        "http://172.16.0.1/",
        "http://100.64.0.1/",  # shared carrier address space
        # cloud "secrets" address
        "http://169.254.169.254/latest/meta-data/",
        "http://[fd00::1]/",
        "http://[fe80::1]/",
        # IPv6 ranges that can hide IPv4 addresses
        "http://[64:ff9b::7f00:1]/",
        "http://[2002:7f00:1::]/",
        # multicast / broadcast
        "http://224.0.0.1/",
        "http://255.255.255.255/",
    ],
)
def test_private_and_internal_addresses_are_blocked(bad):
    with pytest.raises(UnsafeURLError):
        validate_url(bad)


def test_public_looking_name_pointing_to_private_ip_is_blocked():
    # The most important test: the NAME looks fine, but DNS says it is private.
    with pytest.raises(UnsafeURLError):
        validate_url("https://sneaky.example")


@pytest.mark.parametrize(
    "name", ["mixed.example", "metadata.example", "v6local.example", "v6mapped.example"]
)
def test_if_any_dns_answer_is_private_it_is_blocked(name):
    with pytest.raises(UnsafeURLError):
        validate_url(f"https://{name}")


def test_name_with_no_dns_answer_is_blocked():
    with pytest.raises(UnsafeURLError):
        validate_url("https://empty.example")


@pytest.mark.parametrize(
    "bad",
    [
        "file:///etc/passwd",
        "ftp://example.com/file",
        "javascript:alert(1)",
        "data:text/html,<h1>hi</h1>",
        "gopher://example.com",
        "ws://example.com",
        "https://user:pass@example.com",  # username/password trick
        "https://example.com@127.0.0.1",  # looks like example.com, is 127.0.0.1
        "https://example.com\\@127.0.0.1",  # backslash trick
        "https://exam ple.com",  # space
        "https://example.com/\nHost: evil",  # hidden newline
        "https://example.com:8080",  # unusual port
        "https://example.com:22",
        "https://example.com:abc",  # port is not a number
        "https://",  # no website name
        "http://:80",
        "",
        "   ",
    ],
)
def test_other_unsafe_or_invalid_inputs_are_blocked(bad):
    with pytest.raises(UnsafeURLError):
        validate_url(bad)


def test_very_long_address_is_blocked():
    with pytest.raises(UnsafeURLError):
        validate_url("https://example.com/" + "a" * 3000)


def test_non_text_input_is_blocked():
    with pytest.raises(UnsafeURLError):
        validate_url(None)
    with pytest.raises(UnsafeURLError):
        validate_url(12345)


# ---------- The IP checker on its own ----------

@pytest.mark.parametrize("ip", [PUBLIC_IP, "8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
def test_public_ips_are_public(ip):
    assert is_public_ip(ip) is True


@pytest.mark.parametrize(
    "ip", ["127.0.0.1", "10.1.2.3", "192.168.0.9", "169.254.1.1", "0.0.0.0", "::1", "::", "not-an-ip"]
)
def test_non_public_ips_are_not_public(ip):
    assert is_public_ip(ip) is False


# ---------- DNS failures ----------

def test_unknown_website_gives_friendly_error(monkeypatch):
    def failing_getaddrinfo(*args, **kwargs):
        raise socket.gaierror("no such host")

    monkeypatch.setattr(socket, "getaddrinfo", failing_getaddrinfo)
    with pytest.raises(UnsafeURLError) as problem:
        real_resolve_host("does-not-exist.example")
    assert "could not find" in str(problem.value)


# ---------- The web endpoint ----------

def test_endpoint_accepts_good_address():
    response = client.post("/api/validate-url", json={"url": "example.com"})
    assert response.status_code == 200
    assert response.json() == {"ok": True, "url": "https://example.com", "host": "example.com"}


def test_endpoint_blocks_private_address_with_friendly_message():
    response = client.post("/api/validate-url", json={"url": "http://127.0.0.1:8000"})
    assert response.status_code == 400
    assert isinstance(response.json()["detail"], str)
    assert "ClearWeb" in response.json()["detail"] or "allowed" in response.json()["detail"]


def test_endpoint_blocks_disguised_address():
    response = client.post("/api/validate-url", json={"url": "http://2130706433"})
    assert response.status_code == 400


def test_endpoint_rejects_missing_url():
    response = client.post("/api/validate-url", json={})
    assert response.status_code == 422


def test_endpoint_does_not_leak_the_ip_address_it_found():
    response = client.post("/api/validate-url", json={"url": "https://sneaky.example"})
    assert response.status_code == 400
    assert "127.0.0.1" not in response.text
