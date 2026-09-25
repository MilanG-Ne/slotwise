"""Verify demo data and an authenticated session survive an app container restart."""
import http.cookiejar
import json
import subprocess
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8080"
client = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
)


def request(path, data=None, csrf=""):
    payload = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(
        BASE + path,
        data=payload,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrf,
        },
    )
    with client.open(req, timeout=5) as response:
        return json.load(response)


session = request("/api/session")
signed_in = request(
    "/api/login",
    {"email": "alex@example.test", "password": "demo-password"},
    session["csrf_token"],
)
bookings = request("/api/bookings?mine=1")["data"]
resources = request("/api/resources")["data"]
assert bookings, "The demo must contain reservations before restarting"
subprocess.run(["docker", "compose", "restart", "app"], check=True)
deadline = time.monotonic() + 90
while True:
    try:
        restored = request("/api/session")
        break
    except (urllib.error.URLError, TimeoutError):
        if time.monotonic() >= deadline:
            raise
        time.sleep(1)
assert restored["user"] == signed_in["user"], "The existing session must remain authenticated"
assert restored["csrf_token"] == signed_in["csrf_token"], "Session state must persist"
assert request("/api/bookings?mine=1")["data"] == bookings, "Reservations changed after restart"
assert request("/api/resources")["data"] == resources, "Resources changed after restart"
print("Restart preserved the authenticated session, reservations, and resources.")
