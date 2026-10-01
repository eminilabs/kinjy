"""Kinjy · messaging realtime check.

Two fresh members, a real conversation, and real sockets through the gateway
relay. Asserts the things that silently lose messages when they break:

  * a message reaches the recipient AND the sender's other tabs, live
  * a socket without a valid first-frame token is closed with 4401, and the
    gateway relays that code instead of a generic close
  * a socket is closed with 4401 when its access token expires
  * `?after=` returns what was sent while a socket was away

Run it inside messaging-service (it mints a short-lived token, which needs the
shared secret):

    docker compose exec -T messaging-service python - < messaging-test.py

(`python -`, not `python /dev/stdin`: only the former puts the working
directory, /app, on sys.path, which is where `common` lives.)

Leaves two `msgtest-*@example.com` members behind, like smoke-test.sh.
"""
import asyncio, json, os, time, urllib.error, urllib.request, uuid

import websockets
from jose import jwt

from common import settings

API = "http://gateway:8000/api"
WS = "ws://gateway:8000/api/ws"
PASSWORD = "KalutaDemo123!"
failures: list[str] = []


def call(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        return json.loads(urllib.request.urlopen(req).read() or "null")
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"{method} {path} -> {exc.code}: {exc.read().decode()[:300]}")


def check(label, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{'  — ' + detail if detail and not ok else ''}")
    if not ok:
        failures.append(label)


def register(tag):
    suffix = uuid.uuid4().hex[:8]
    # Registration requires a date of birth (it decides the age tier); an adult
    # here, so the age rules on messaging do not get in the way of this check.
    out = call("POST", "/auth/register", {"email": f"msgtest-{tag}-{suffix}@example.com",
        "password": PASSWORD, "display_name": f"Msgtest {tag}", "handle": f"msgtest.{tag}.{suffix}",
        "date_of_birth": "1990-01-15", "country": "FR"})
    return out["user"]["id"], out["tokens"]["access_token"]


async def open_socket(token):
    ws = await websockets.connect(WS)
    await ws.send(json.dumps({"action": "auth", "token": token}))
    ready = json.loads(await asyncio.wait_for(ws.recv(), 5))
    assert ready.get("type") == "ready", ready
    return ws


async def next_message(ws, timeout=3.0):
    """The next chat frame, skipping anything else on the socket."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            frame = json.loads(await asyncio.wait_for(ws.recv(), deadline - time.time()))
        except (asyncio.TimeoutError, ValueError):
            return None
        if frame.get("type") == "message":
            return frame
    return None


async def close_code(ws, timeout):
    try:
        while True:
            await asyncio.wait_for(ws.recv(), timeout)
    except websockets.ConnectionClosed as exc:
        return exc.rcvd.code if exc.rcvd else None
    except asyncio.TimeoutError:
        return None


async def main():
    a_id, a_tok = register("a")
    b_id, b_tok = register("b")
    call("POST", f"/connections/{b_id}", {}, a_tok)
    call("POST", f"/connections/{a_id}/respond?accept=true", None, b_tok)
    cid = call("POST", "/conversations", {"participant_ids": [b_id], "kind": "direct",
        "encrypted": False}, a_tok)["id"]
    print(f"conversation {cid} between {a_id} and {b_id}")

    print("live delivery")
    b_ws = await open_socket(b_tok)
    a_other_tab = await open_socket(a_tok)
    sent = call("POST", f"/conversations/{cid}/messages", {"body": "hello B"}, a_tok)
    got_b = await next_message(b_ws)
    got_a = await next_message(a_other_tab)
    check("recipient receives the message", bool(got_b) and got_b["message_id"] == sent["id"], str(got_b))
    check("frame carries its topic", bool(got_b) and got_b.get("topic") == f"user:{b_id}", str(got_b))
    check("sender's other tab receives it too", bool(got_a) and got_a["message_id"] == sent["id"], str(got_a))
    await a_other_tab.close()

    print("catch-up after a disconnect")
    last_seen = sent["id"]
    await b_ws.close()
    missed = [call("POST", f"/conversations/{cid}/messages", {"body": f"while away {i}"}, a_tok)["id"]
              for i in range(3)]
    page = call("GET", f"/conversations/{cid}/messages?after={last_seen}", None, b_tok)["items"]
    ids = [m["id"] for m in page]
    check("?after= returns every missed message", all(m in ids for m in missed), str(ids))
    check("?after= returns them oldest first", [i for i in ids if i in missed] == missed, str(ids))
    check("?after= returns nothing older", all(m["id"] in missed + [last_seen] for m in page), str(ids))

    print("authentication")
    ws = await websockets.connect(WS)
    await ws.send(json.dumps({"action": "auth", "token": "not-a-token"}))
    check("bad token closes with 4401 through the gateway", await close_code(ws, 5) == 4401)

    ws = await websockets.connect(WS)
    await ws.send(json.dumps({"action": "subscribe", "topics": ["feed"]}))
    check("a first frame that is not auth closes with 4401", await close_code(ws, 5) == 4401)

    short = jwt.encode({"sub": b_id, "typ": "access", "role": "member",
        "exp": int(time.time()) + 3}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    ws = await open_socket(short)
    code = await close_code(ws, 8)
    check("socket closes with 4401 when its token expires", code == 4401, f"got {code}")

    await phase_two()
    print("\nALL PASS" if not failures else f"\n{len(failures)} FAILED: {failures}")


async def frames_of(ws, kind, timeout=3.0):
    """Every frame of one type that arrives within `timeout`."""
    got, deadline = [], time.time() + timeout
    while time.time() < deadline:
        try:
            frame = json.loads(await asyncio.wait_for(ws.recv(), deadline - time.time()))
        except (asyncio.TimeoutError, ValueError):
            break
        except websockets.ConnectionClosed:
            break
        if frame.get("type") == kind:
            got.append(frame)
    return got


def unread_for(token, cid):
    return next(c for c in call("GET", "/conversations", None, token)["items"] if c["id"] == cid)


async def phase_two():
    a_id, a_tok = register("a2")
    b_id, b_tok = register("b2")
    c_id, c_tok = register("c2")  # a stranger to both
    call("POST", f"/connections/{b_id}", {}, a_tok)
    call("POST", f"/connections/{a_id}/respond?accept=true", None, b_tok)
    cid = call("POST", "/conversations", {"participant_ids": [b_id], "kind": "direct",
        "encrypted": False}, a_tok)["id"]

    print("idempotent send")
    b_ws = await open_socket(b_tok)
    first = call("POST", f"/conversations/{cid}/messages", {"body": "once", "client_id": "cid-1"}, a_tok)
    again = call("POST", f"/conversations/{cid}/messages", {"body": "once", "client_id": "cid-1"}, a_tok)
    frames = await frames_of(b_ws, "message", 2)
    check("a retried client_id returns the same message", again["id"] == first["id"] and again.get("duplicate"))
    check("…and is announced once", len(frames) == 1, f"{len(frames)} frames")
    check("the frame carries client_id", bool(frames) and frames[0].get("client_id") == "cid-1")

    print("read receipts")
    check("the sender has no unread from their own message", unread_for(a_tok, cid)["unread"] == 0)
    call("GET", f"/conversations/{cid}/messages", None, b_tok)
    check("fetching the thread does not mark it read", unread_for(b_tok, cid)["unread"] == 1)
    a_ws = await open_socket(a_tok)
    call("POST", f"/conversations/{cid}/read", None, b_tok)
    reads = await frames_of(a_ws, "read", 2)
    check("the other side is told it was read", any(r["user_id"] == b_id for r in reads), str(reads))
    check("unread clears after /read", unread_for(b_tok, cid)["unread"] == 0)
    check("read_state lists the reader", unread_for(a_tok, cid)["read_state"].get(b_id) is not None)

    print("typing")
    await a_ws.send(json.dumps({"action": "typing", "conversation_id": cid}))
    typed = await frames_of(b_ws, "typing", 2)
    check("typing reaches the other participant", any(t["user_id"] == a_id for t in typed), str(typed))
    c_ws = await open_socket(c_tok)
    await c_ws.send(json.dumps({"action": "typing", "conversation_id": cid}))
    check("a stranger cannot type into someone else's thread", not await frames_of(b_ws, "typing", 2))

    print("presence")
    seen = call("GET", f"/presence?ids={a_id}", None, b_tok)["items"]
    check("a connection sees who is online", seen.get(a_id, {}).get("online") is True, str(seen))
    hidden = call("GET", f"/presence?ids={a_id}", None, c_tok)["items"]
    check("a stranger is told nothing", a_id not in hidden, str(hidden))
    await a_ws.close()
    offline = await frames_of(b_ws, "presence", 9)
    check("going offline is announced after the grace period",
          any(p["user_id"] == a_id and p["online"] is False for p in offline), str(offline))
    await c_ws.close()

    print("offline notification")
    await b_ws.close()
    await asyncio.sleep(0.5)
    for body in ("are you there?", "hello?"):
        call("POST", f"/conversations/{cid}/messages", {"body": body}, a_tok)
    notes = [n for n in call("GET", "/notifications?unread_only=true", None, b_tok)["items"]
             if n["kind"] == "message" and n["link"] == f"/messages?c={cid}"]
    check("an offline recipient gets one notification per thread", len(notes) == 1, f"{len(notes)}")

    await attachments(a_id, a_tok, b_id, b_tok, c_tok, cid)


def upload(token, filename, content_type, data, purpose="chat"):
    boundary = uuid.uuid4().hex
    parts = []
    for name, value in (("purpose", purpose), ("provenance", "original")):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n".encode() + data + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    req = urllib.request.Request(API + "/media/upload", method="POST", data=b"".join(parts),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}",
                 "Authorization": "Bearer " + token})
    try:
        return 201, json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode()


def fetch_headers(url):
    # The asset URL is the public one (localhost:8200); from inside the network
    # the gateway answers the same path.
    path = url.split("/media/", 1)[1]
    response = urllib.request.urlopen(f"http://gateway:8000/media/{path}")
    return {k.lower(): v for k, v in response.headers.items()}


def send_raw(cid, body, token):
    req = urllib.request.Request(API + f"/conversations/{cid}/messages", method="POST",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json",
                                                 "Authorization": "Bearer " + token})
    try:
        return urllib.request.urlopen(req).status, None
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode()


async def attachments(a_id, a_tok, b_id, b_tok, c_tok, cid):
    print("attachments")
    png = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                        "1f15c4890000000d49444154789c6360000002000154a24f5f0000000049454e44ae426082")
    status, image = upload(a_tok, "pixel.png", "image/png", png)
    check("a photo uploads for chat", status == 201 and image["kind"] == "image", str(image))
    status, archive = upload(a_tok, "notes.zip", "application/zip", os.urandom(2048))
    check("any file type uploads for chat", status == 201 and archive["kind"] == "file", str(archive))
    status, _ = upload(a_tok, "notes.zip", "application/zip", os.urandom(2048), purpose="post")
    check("posts still refuse arbitrary types", status == 415, str(status))

    status, page = upload(a_tok, "evil.html", "text/html", b"<script>alert(document.cookie)</script>")
    headers = fetch_headers(page["url"]) if status == 201 else {}
    check("an HTML upload is served as a download, never rendered",
          headers.get("content-type") == "application/octet-stream"
          and headers.get("content-disposition", "").startswith("attachment"), str(headers))
    check("every served file is sandboxed and nosniff",
          "sandbox" in headers.get("content-security-policy", "")
          and headers.get("x-content-type-options") == "nosniff", str(headers))
    img_headers = fetch_headers(image["url"])
    check("a photo is served inline as itself",
          img_headers.get("content-type") == "image/png"
          and img_headers.get("content-disposition", "").startswith("inline"), str(img_headers))

    b_ws = await open_socket(b_tok)
    status, _ = send_raw(cid, {"media_id": archive["id"], "client_id": "att-1"}, a_tok)
    frames = await frames_of(b_ws, "message", 2)
    frame = frames[0] if frames else {}
    check("a file-only message is accepted", status == 201, str(status))
    check("the frame describes the attachment from media-service",
          frame.get("media_kind") == "file" and frame.get("media_name") == "notes.zip"
          and frame.get("media_size") == 2048 and frame.get("media_url") == archive["url"], str(frame))
    await b_ws.close()

    status, detail = send_raw(cid, {"media_id": archive["id"]}, c_tok)
    check("a stranger cannot post into the thread", status == 404, f"{status} {detail}")
    _, b_asset = upload(b_tok, "b.pdf", "application/pdf", b"%PDF-1.4 test")
    status, detail = send_raw(cid, {"media_id": b_asset["id"]}, a_tok)
    check("attaching someone else's upload is refused", status == 403, f"{status} {detail}")
    status, detail = send_raw(cid, {"media_id": "mda_doesnotexist"}, a_tok)
    check("an unknown attachment is refused", status == 400, f"{status} {detail}")
    status, detail = send_raw(cid, {"body": "   "}, a_tok)
    check("a message with neither text nor file is refused", status == 400, f"{status} {detail}")

    last = unread_for(b_tok, cid)["last_message"]
    check("the list previews the last message", last and last["preview"] == "Sent a file", str(last))

    print("privacy on an existing conversation")
    call("PATCH", "/preferences", {"who_can_message": "nobody"}, b_tok)
    status, detail = send_raw(cid, {"body": "still there?"}, a_tok)
    check("who_can_message=nobody stops an existing thread", status == 403, f"{status} {detail}")
    call("PATCH", "/preferences", {"who_can_message": "connections"}, b_tok)
    status, _ = send_raw(cid, {"body": "back again"}, a_tok)
    check("…and reopening it lets messages through", status == 201, str(status))
    call("POST", f"/users/{a_id}/block", {}, b_tok)
    status, detail = send_raw(cid, {"body": "hello?"}, a_tok)
    check("a block stops an existing thread", status == 403, f"{status} {detail}")
    status, detail = send_raw(cid, {"body": "and you?"}, b_tok)
    check("…in both directions", status == 403, f"{status} {detail}")
    b_ws = await open_socket(b_tok)
    hidden = call("GET", f"/presence?ids={b_id}", None, a_tok)["items"]
    check("a blocked member no longer sees presence", b_id not in hidden, str(hidden))
    a_ws = await open_socket(a_tok)
    await asyncio.sleep(2.1)  # past the per-thread typing throttle from earlier
    await b_ws.send(json.dumps({"action": "typing", "conversation_id": cid}))
    check("…nor typing", not await frames_of(a_ws, "typing", 2))
    await a_ws.close(); await b_ws.close()
    urllib.request.urlopen(urllib.request.Request(API + f"/users/{a_id}/block", method="DELETE",
        headers={"Authorization": "Bearer " + b_tok}))
    status, _ = send_raw(cid, {"body": "unblocked"}, a_tok)
    check("unblocking restores it", status == 201, str(status))


asyncio.run(main())
