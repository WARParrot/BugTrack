#!/usr/bin/env python3
"""
End-to-end smoke test for the BugTrack API (stdlib only).

Start the API with a bootstrap administrator, e.g.:

    Admin__Email=admin@example.org Admin__Password='Admin-Password-123' \
    Database__Path=/tmp/bugtrack-smoke.sqlite dotnet run --project src/BugTrack.Api

then:

    python3 scripts/smoke_test.py [BASE_URL] [ADMIN_EMAIL] [ADMIN_PASSWORD]
"""
import http.cookiejar
import json
import sys
import urllib.error
import urllib.request
import uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3001").rstrip("/")
ADMIN_EMAIL = sys.argv[2] if len(sys.argv) > 2 else "admin@example.org"
ADMIN_PASSWORD = sys.argv[3] if len(sys.argv) > 3 else "Admin-Password-123"

passed = failed = 0


class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def cookie(self):
        return next((f"{c.name}={c.value}" for c in self.jar if c.name == "bugtrack_session"), None)

    def call(self, method, path, body=None, raw_cookie=None, raw_body=None):
        data = raw_body if raw_body is not None else (json.dumps(body).encode() if body is not None else None)
        req = urllib.request.Request(BASE + path, data=data, method=method)
        if data is not None:
            req.add_header("Content-Type", "application/json")
        opener = self.opener
        if raw_cookie:  # replay a cookie without using the jar
            req.add_header("Cookie", raw_cookie)
            opener = urllib.request.build_opener()
        try:
            with opener.open(req) as r:
                status, text = r.status, r.read().decode()
        except urllib.error.HTTPError as e:
            status, text = e.code, e.read().decode()
        try:
            payload = json.loads(text) if text else None
        except ValueError:
            payload = text
        return status, payload


def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {name}")
    else:
        failed += 1
        print(f"  FAIL {name} {detail}")


def expect(name, result, status, key=None):
    got, payload = result
    ok = got == status
    if ok and key:
        ok = isinstance(payload, dict) and key in payload
    check(name, ok, f"(expected {status}{'/' + key if key else ''}, got {got}: {str(payload)[:200]})")
    return payload


def new_user(prefix):
    c = Client()
    email = f"{prefix}-{uuid.uuid4().hex[:8]}@example.org"
    payload = expect(f"register {prefix}", c.call("POST", "/api/auth/register",
                     {"fullName": prefix.title(), "email": email, "password": "Password-123"}), 201, "user")
    return c, email, payload["user"]


print("== health / auth")
anon = Client()
expect("health", anon.call("GET", "/api/health"), 200, "ok")
r = anon.call("GET", "/api/auth/me")
check("me without session -> 401 {error}", r[0] == 401 and "error" in r[1], str(r))
expect("bad email rejected", anon.call("POST", "/api/auth/register",
       {"fullName": "X", "email": "nope", "password": "Password-123"}), 400, "error")
expect("short password rejected", anon.call("POST", "/api/auth/register",
       {"fullName": "X", "email": "x@example.org", "password": "short"}), 400, "error")
expect("malformed JSON rejected", anon.call("POST", "/api/auth/login", raw_body=b"{not json"), 400, "error")

alice, alice_email, alice_u = new_user("alice")
bob, bob_email, bob_u = new_user("bob")
carol, carol_email, carol_u = new_user("carol")
expect("duplicate email -> 409", Client().call("POST", "/api/auth/register",
       {"fullName": "Dup", "email": alice_email.upper(), "password": "Password-123"}), 409, "error")
expect("wrong password -> 401", Client().call("POST", "/api/auth/login",
       {"email": alice_email, "password": "wrong-password"}), 401, "error")
expect("unknown email -> 401", Client().call("POST", "/api/auth/login",
       {"email": "ghost@example.org", "password": "Password-123"}), 401, "error")
u = expect("me", alice.call("GET", "/api/auth/me"), 200, "user")
check("me returns alice, no password hash", u["user"]["email"] == alice_email and "passwordHash" not in json.dumps(u))

admin = Client()
expect("admin login", admin.call("POST", "/api/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}), 200, "user")

print("== projects & members")
expect("non-admin cannot create project", alice.call("POST", "/api/projects", {"name": "P"}), 403, "error")
expect("empty project name rejected", admin.call("POST", "/api/projects", {"name": "   "}), 400, "error")
project = expect("admin creates project", admin.call("POST", "/api/projects", {"name": "Shop", "description": "d"}), 201, "project")["project"]
pid = project["id"]
check("creator is PROJECT_MANAGER", project["members"][0]["role"] == "PROJECT_MANAGER")
expect("invalid project id -> 400", admin.call("GET", "/api/projects/not-a-uuid"), 400, "error")
expect("stranger cannot read project", carol.call("GET", f"/api/projects/{pid}"), 403, "error")
expect("add developer", admin.call("POST", f"/api/projects/{pid}/members", {"email": alice_email, "role": "DEVELOPER"}), 201, "project")
expect("add tester", admin.call("POST", f"/api/projects/{pid}/members", {"email": bob_email, "role": "TESTER"}), 201, "project")
expect("duplicate member -> 409", admin.call("POST", f"/api/projects/{pid}/members", {"email": bob_email, "role": "TESTER"}), 409, "error")
expect("unknown role -> 400", admin.call("POST", f"/api/projects/{pid}/members", {"email": carol_email, "role": "BOSS"}), 400, "error")
expect("numeric role -> 400", admin.call("POST", f"/api/projects/{pid}/members", {"email": carol_email, "role": 1}), 400, "error")
expect("unknown user -> 404", admin.call("POST", f"/api/projects/{pid}/members", {"email": "ghost@example.org", "role": "TESTER"}), 404, "error")
expect("non-manager cannot add members", alice.call("POST", f"/api/projects/{pid}/members", {"email": carol_email, "role": "TESTER"}), 403, "error")
check("alice sees the project", any(p["id"] == pid for p in alice.call("GET", "/api/projects")[1]["projects"]))
check("carol sees no projects", carol.call("GET", "/api/projects")[1]["projects"] == [])
expect("link https repo", admin.call("PUT", f"/api/projects/{pid}/repository", {"name": "web", "url": "https://git.example.org/shop/web.git"}), 200, "project")
expect("link ssh repo (replaces)", admin.call("PUT", f"/api/projects/{pid}/repository", {"name": "web", "url": "ssh://git@git.example.org/shop/web.git"}), 200, "project")
expect("repo url with password rejected", admin.call("PUT", f"/api/projects/{pid}/repository", {"name": "web", "url": "https://u:p@git.example.org/x.git"}), 400, "error")
expect("repo url with bad scheme rejected", admin.call("PUT", f"/api/projects/{pid}/repository", {"name": "web", "url": "ftp://git.example.org/x.git"}), 400, "error")
p = admin.call("GET", f"/api/projects/{pid}")[1]["project"]
check("repository link was replaced, not duplicated", p["repository"]["url"].startswith("ssh://"))

print("== ticket workflow")
expect("empty ticket title rejected", admin.call("POST", f"/api/projects/{pid}/tickets", {"title": "", "description": "d", "priority": "LOW"}), 400, "error")
expect("missing priority rejected", admin.call("POST", f"/api/projects/{pid}/tickets", {"title": "t", "description": "d"}), 400, "error")
expect("stranger cannot create ticket", carol.call("POST", f"/api/projects/{pid}/tickets", {"title": "t", "description": "d", "priority": "LOW"}), 403, "error")
t = expect("create ticket", admin.call("POST", f"/api/projects/{pid}/tickets",
           {"title": "Crash on login", "description": "boom", "stepsToReproduce": "1. open", "priority": "HIGH"}), 201, "ticket")["ticket"]
tid = t["id"]
check("new ticket is OPEN, unassigned", t["status"] == "OPEN" and t["assignee"] is None and t["deadline"] is None and t["release"] is None)
expect("stranger cannot read ticket", carol.call("GET", f"/api/tickets/{tid}"), 403, "error")
expect("unknown ticket -> 404", admin.call("GET", f"/api/tickets/{uuid.uuid4()}"), 404, "error")
expect("developer cannot assign", alice.call("POST", f"/api/tickets/{tid}/assign", {"userId": alice_u["id"]}), 403, "error")
expect("cannot assign a tester as developer", admin.call("POST", f"/api/tickets/{tid}/assign", {"userId": bob_u["id"]}), 403, "error")
expect("assign unknown user -> 404", admin.call("POST", f"/api/tickets/{tid}/assign", {"userId": str(uuid.uuid4())}), 404, "error")
expect("not-assigned developer cannot take", alice.call("POST", f"/api/tickets/{tid}/take"), 403, "error")
t = expect("assign to alice", admin.call("POST", f"/api/tickets/{tid}/assign", {"userId": alice_u["id"]}), 200, "ticket")["ticket"]
check("assignee is alice", t["assignee"]["id"] == alice_u["id"])
expect("cannot submit fix before taking", alice.call("POST", f"/api/tickets/{tid}/submit-fix", {"url": "https://git.example.org/mr/1"}), 409, "error")
t = expect("take on", alice.call("POST", f"/api/tickets/{tid}/take"), 200, "ticket")["ticket"]
check("IN_PROGRESS", t["status"] == "IN_PROGRESS")
expect("javascript: url rejected", alice.call("POST", f"/api/tickets/{tid}/submit-fix", {"url": "javascript:alert(1)"}), 400, "error")
expect("url with credentials rejected", alice.call("POST", f"/api/tickets/{tid}/submit-fix", {"url": "https://u:p@git.example.org/mr/1"}), 400, "error")
t = expect("submit fix", alice.call("POST", f"/api/tickets/{tid}/submit-fix", {"url": "https://git.example.org/mr/1"}), 200, "ticket")["ticket"]
check("READY_FOR_REVIEW + MR url", t["status"] == "READY_FOR_REVIEW" and t["mergeRequestUrl"] == "https://git.example.org/mr/1")
expect("developer cannot close", alice.call("POST", f"/api/tickets/{tid}/close"), 403, "error")
expect("reopen needs a reason", bob.call("POST", f"/api/tickets/{tid}/reopen", {"reason": "  "}), 400, "error")
t = expect("tester reopens", bob.call("POST", f"/api/tickets/{tid}/reopen", {"reason": "still broken"}), 200, "ticket")["ticket"]
check("REOPENED", t["status"] == "REOPENED")
expect("take again", alice.call("POST", f"/api/tickets/{tid}/take"), 200, "ticket")
expect("decline returns ticket to OPEN", alice.call("POST", f"/api/tickets/{tid}/decline", {"reason": "no capacity"}), 200, "ticket")
expect("reassign after decline", admin.call("POST", f"/api/tickets/{tid}/assign", {"userId": alice_u["id"]}), 200, "ticket")
expect("take again 2", alice.call("POST", f"/api/tickets/{tid}/take"), 200, "ticket")
expect("submit again", alice.call("POST", f"/api/tickets/{tid}/submit-fix", {"url": "https://git.example.org/mr/2"}), 200, "ticket")
expect("cannot archive before closing", admin.call("POST", f"/api/tickets/{tid}/archive"), 409, "error")
t = expect("tester closes", bob.call("POST", f"/api/tickets/{tid}/close"), 200, "ticket")["ticket"]
check("CLOSED", t["status"] == "CLOSED")
expect("tester cannot archive", bob.call("POST", f"/api/tickets/{tid}/archive"), 403, "error")
t = expect("manager archives", admin.call("POST", f"/api/tickets/{tid}/archive"), 200, "ticket")["ticket"]
check("ARCHIVED", t["status"] == "ARCHIVED")
expect("archived: no comments", admin.call("POST", f"/api/tickets/{tid}/comments", {"text": "x"}), 409, "error")
expect("archived: no priority change", admin.call("PUT", f"/api/tickets/{tid}/priority", {"priority": "LOW"}), 409, "error")
events = expect("history", admin.call("GET", f"/api/tickets/{tid}/events"), 200, "events")["events"]
types = [e["type"] for e in events]
expected = ["CREATED", "ASSIGNED", "TAKEN", "FIX_SUBMITTED", "REOPENED", "TAKEN", "DECLINED", "ASSIGNED",
            "TAKEN", "FIX_SUBMITTED", "CLOSED", "ARCHIVED"]
check("history is complete and chronological", types == expected, str(types))
check("event notes carry details", events[1]["note"] == "Alice" and any(e["note"] == "no capacity" for e in events))

print("== manager-only properties, releases")
t2 = admin.call("POST", f"/api/projects/{pid}/tickets", {"title": "Slow page", "description": "d", "priority": "LOW"})[1]["ticket"]
t2id = t2["id"]
expect("tester cannot change priority", bob.call("PUT", f"/api/tickets/{t2id}/priority", {"priority": "CRITICAL"}), 403, "error")
t2 = expect("manager sets priority", admin.call("PUT", f"/api/tickets/{t2id}/priority", {"priority": "CRITICAL"}), 200, "ticket")["ticket"]
check("priority CRITICAL", t2["priority"] == "CRITICAL")
expect("bad deadline rejected", admin.call("PUT", f"/api/tickets/{t2id}/deadline", {"deadline": "tomorrow"}), 400, "error")
t2 = expect("manager sets deadline", admin.call("PUT", f"/api/tickets/{t2id}/deadline", {"deadline": "2030-01-01T12:00:00Z"}), 200, "ticket")["ticket"]
check("deadline is ISO UTC", t2["deadline"].startswith("2030-01-01T12:00:00") and t2["deadline"].endswith("Z"), t2["deadline"])
expect("non-admin cannot create release", alice.call("POST", "/api/releases", {"version": "1.0.0", "releasedAt": "2030-02-01"}), 403, "error")
expect("bad release date rejected", admin.call("POST", "/api/releases", {"version": "9.9.9", "releasedAt": "2030-02-31"}), 400, "error")
version = "1." + uuid.uuid4().hex[:6]
expect("admin creates release", admin.call("POST", "/api/releases", {"version": version, "releasedAt": "2030-02-01"}), 201, "release")
expect("duplicate release -> 409", admin.call("POST", "/api/releases", {"version": version, "releasedAt": "2030-02-01"}), 409, "error")
check("releases listed", any(r["version"] == version and r["releasedAt"] == "2030-02-01" for r in alice.call("GET", "/api/releases")[1]["releases"]))
expect("unknown release -> 404", admin.call("PUT", f"/api/tickets/{t2id}/release", {"version": "nope"}), 404, "error")
t2 = expect("assign release", admin.call("PUT", f"/api/tickets/{t2id}/release", {"version": version}), 200, "ticket")["ticket"]
check("ticket has release", t2["release"]["version"] == version)
tickets = admin.call("GET", f"/api/projects/{pid}/tickets")[1]["tickets"]
check("project ticket list", {x["id"] for x in tickets} == {tid, t2id})

print("== comments & attachments")
c1 = expect("root comment", alice.call("POST", f"/api/tickets/{t2id}/comments", {"text": "looking"}), 201, "comment")["comment"]
c2 = expect("reply", bob.call("POST", f"/api/tickets/{t2id}/comments", {"text": "thanks", "parentId": c1["id"]}), 201, "comment")["comment"]
expect("reply to reply", alice.call("POST", f"/api/tickets/{t2id}/comments", {"text": "np", "parentId": c2["id"]}), 201, "comment")
expect("unknown parent -> 400", alice.call("POST", f"/api/tickets/{t2id}/comments", {"text": "x", "parentId": str(uuid.uuid4())}), 400, "error")
expect("malformed parentId -> 400", alice.call("POST", f"/api/tickets/{t2id}/comments", {"text": "x", "parentId": "missing"}), 400, "error")
expect("stranger cannot comment", carol.call("POST", f"/api/tickets/{t2id}/comments", {"text": "x"}), 403, "error")
expect("empty comment rejected", alice.call("POST", f"/api/tickets/{t2id}/comments", {"text": " "}), 400, "error")
parent = c2["id"]
for i in range(150):  # deep thread must round-trip through JSON
    parent = alice.call("POST", f"/api/tickets/{t2id}/comments", {"text": f"d{i}", "parentId": parent})[1]["comment"]["id"]
t2 = expect("deep thread loads", alice.call("GET", f"/api/tickets/{t2id}"), 200, "ticket")["ticket"]
check("one root comment, nested replies", len(t2["comments"]) == 1 and t2["comments"][0]["replies"][0]["replies"][0]["text"] == "np")
expect("attachment", alice.call("POST", f"/api/tickets/{t2id}/attachments", {"type": "LOG", "url": "https://files.example.org/log.txt"}), 201, "attachment")
expect("attachment with credentials rejected", alice.call("POST", f"/api/tickets/{t2id}/attachments", {"type": "LOG", "url": "https://u:p@files.example.org/log.txt"}), 400, "error")
expect("attachment bad type rejected", alice.call("POST", f"/api/tickets/{t2id}/attachments", {"type": "VIDEO", "url": "https://files.example.org/a"}), 400, "error")
t2 = alice.call("GET", f"/api/tickets/{t2id}")[1]["ticket"]
check("attachment stored with uploader", len(t2["attachments"]) == 1 and t2["attachments"][0]["uploader"]["id"] == alice_u["id"])

print("== notifications")
ns = expect("alice notifications", alice.call("GET", "/api/notifications"), 200, "notifications")["notifications"]
check("alice was notified (newest first)", len(ns) >= 1 and ns[0]["isRead"] is False)
expect("mark read", alice.call("POST", f"/api/notifications/{ns[0]['id']}/read"), 204)
expect("cannot mark someone else's notification", bob.call("POST", f"/api/notifications/{ns[0]['id']}/read"), 404, "error")
unread = alice.call("GET", "/api/notifications?unreadOnly=true")[1]["notifications"]
check("unreadOnly filter", all(n["isRead"] is False for n in unread) and len(unread) == len(ns) - 1)

print("== membership guards")
t3 = admin.call("POST", f"/api/projects/{pid}/tickets", {"title": "Guard", "description": "d", "priority": "LOW"})[1]["ticket"]
admin.call("POST", f"/api/tickets/{t3['id']}/assign", {"userId": alice_u["id"]})
expect("cannot remove assignee of active ticket", admin.call("DELETE", f"/api/projects/{pid}/members/{alice_u['id']}"), 409, "error")
expect("cannot demote assignee of active ticket", admin.call("PATCH", f"/api/projects/{pid}/members/{alice_u['id']}", {"role": "TESTER"}), 409, "error")
me_admin = admin.call("GET", "/api/auth/me")[1]["user"]
expect("cannot remove last manager", admin.call("DELETE", f"/api/projects/{pid}/members/{me_admin['id']}"), 409, "error")
expect("cannot demote last manager", admin.call("PATCH", f"/api/projects/{pid}/members/{me_admin['id']}", {"role": "TESTER"}), 409, "error")
expect("remove tester", admin.call("DELETE", f"/api/projects/{pid}/members/{bob_u['id']}"), 204)
expect("removed member loses access", bob.call("GET", f"/api/projects/{pid}"), 403, "error")

print("== limits & sessions")
big = json.dumps({"name": "x" * 70000}).encode()
r = admin.call("POST", "/api/projects", raw_body=big)
check("oversized body rejected", r[0] in (400, 413), str(r[0]))
old_cookie = alice.cookie()
check("session cookie issued", old_cookie is not None)
expect("replayed cookie works before logout", Client().call("GET", "/api/auth/me", raw_cookie=old_cookie), 200, "user")
expect("logout", alice.call("POST", "/api/auth/logout"), 204)
r = Client().call("GET", "/api/auth/me", raw_cookie=old_cookie)
check("old cookie is invalid after logout", r[0] == 401, str(r))
expect("login again works", alice.call("POST", "/api/auth/login", {"email": alice_email, "password": "Password-123"}), 200, "user")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
