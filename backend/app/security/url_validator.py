"""
URL safety checks (protection against "SSRF").

SSRF = Server-Side Request Forgery. Our backend will visit webpages for users.
A bad person could type an address like http://127.0.0.1:8000 or
http://169.254.169.254 to trick our server into reading private things
(our own computer, a company network, cloud secrets).

So BEFORE visiting any address, we check it here. We never trust the text the
user typed. Instead we ask the internet's phone book (DNS) where the name
really points, and we only allow addresses that are on the PUBLIC internet.
"""

import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urlsplit

MAX_URL_LENGTH = 2048
ALLOWED_SCHEMES = {"http", "https"}
ALLOWED_PORTS = {80, 443}

# IPv6 ranges that can secretly hide an IPv4 address inside them.
# Simplest and safest: block them completely.
BLOCKED_IPV6_NETWORKS = [
    ipaddress.ip_network("64:ff9b::/96"),  # NAT64
    ipaddress.ip_network("2002::/16"),  # 6to4
    ipaddress.ip_network("2001::/32"),  # Teredo
]


class UnsafeURLError(Exception):
    """Raised when an address is not allowed. The message is safe to show to users."""


@dataclass
class ValidatedURL:
    url: str  # the cleaned-up address
    host: str  # the website name, e.g. "www.bbc.com"
    port: int
    ip_addresses: list  # the public IP addresses the name points to


def resolve_host(host):
    """Ask DNS (the internet's phone book) which IP addresses a name points to."""
    try:
        results = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except (socket.gaierror, UnicodeError):
        raise UnsafeURLError(
            "We could not find that website. Please check the address for typos."
        )
    ips = []
    for result in results:
        ip = result[4][0].split("%")[0]  # remove IPv6 "scope" suffix if present
        if ip not in ips:
            ips.append(ip)
    return ips


def is_public_ip(ip_text):
    """True only if the IP address is on the public internet."""
    try:
        ip = ipaddress.ip_address(ip_text)
    except ValueError:
        return False

    # IPv6 address that is really an IPv4 address in disguise (::ffff:127.0.0.1)
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped is not None:
            return is_public_ip(str(ip.ipv4_mapped))
        if any(ip in network for network in BLOCKED_IPV6_NETWORKS):
            return False

    # is_global is False for private, loopback ("this computer"), link-local
    # (cloud secrets live here), shared, reserved and unspecified addresses.
    return ip.is_global and not ip.is_multicast


def validate_url(raw_url):
    """
    Check a user-typed address. Returns a ValidatedURL if it is safe,
    otherwise raises UnsafeURLError with a friendly explanation.
    """
    if not isinstance(raw_url, str):
        raise UnsafeURLError("Please enter a web address.")

    url = raw_url.strip()
    if not url:
        raise UnsafeURLError("Please enter a web address.")
    if len(url) > MAX_URL_LENGTH:
        raise UnsafeURLError("That address is too long.")

    # Spaces, backslashes and hidden control characters are used in tricks.
    if any(ch.isspace() or ch == "\\" or ord(ch) < 32 or ord(ch) == 127 for ch in url):
        raise UnsafeURLError("That address contains characters that are not allowed.")

    # Friendly: "www.bbc.com" works without typing https://
    if "://" not in url:
        url = "https://" + url

    try:
        parts = urlsplit(url)
        port = parts.port  # raises ValueError if the port is not a number
    except ValueError:
        raise UnsafeURLError("That does not look like a valid web address.")

    if parts.scheme.lower() not in ALLOWED_SCHEMES:
        raise UnsafeURLError("Only web addresses starting with http:// or https:// are allowed.")

    # Block "https://user:password@site.com" (a common disguise trick).
    if "@" in parts.netloc:
        raise UnsafeURLError("Addresses containing a username or password are not allowed.")

    host = (parts.hostname or "").rstrip(".").lower()
    if not host:
        raise UnsafeURLError("That does not look like a valid web address.")

    # Numbers written in unusual ways (2130706433, 0x7f000001, 0177.0.0.1,
    # 127.1) mean different things on different computers. We refuse them
    # unless they are a normal IP address like 8.8.8.8.
    last_label = host.rsplit(".", 1)[-1]
    if ":" not in host and (last_label.isdigit() or last_label.startswith("0x")):
        try:
            ipaddress.ip_address(host)
        except ValueError:
            raise UnsafeURLError(
                "That address is written in an unusual way. "
                "Please use the website's normal name."
            )

    if port is None:
        port = 443 if parts.scheme.lower() == "https" else 80
    if port not in ALLOWED_PORTS:
        raise UnsafeURLError("Only the standard web ports (80 and 443) are allowed.")

    # Turn names with special letters into the plain form DNS understands.
    try:
        host_ascii = host.encode("idna").decode("ascii")
    except UnicodeError:
        raise UnsafeURLError("That does not look like a valid web address.")

    # The key step: look up where the name REALLY points, and check ALL answers.
    ips = resolve_host(host_ascii)
    if not ips:
        raise UnsafeURLError("We could not find that website. Please check the address for typos.")
    for ip in ips:
        if not is_public_ip(ip):
            raise UnsafeURLError(
                "For safety, ClearWeb can only open public websites. "
                "That address points to a private or internal location."
            )

    return ValidatedURL(url=url, host=host_ascii, port=port, ip_addresses=ips)
