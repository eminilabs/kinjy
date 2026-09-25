"""Kaluta · realtime check.

Opens a real WebSocket through the gateway relay, subscribes to two topics, and
asserts that acting on a post actually delivers frames. Run it from inside the
compose network, where `gateway` resolves:

    docker compose exec -T social-service python /dev/stdin < realtime-test.py
"""
import asyncio, json, sys, urllib.request
import websockets

API = "http://gateway:8000/api"

def post(path, body=None, token=None):
    req = urllib.request.Request(API + path, method="POST",
        data=json.dumps(body or {}).encode(), headers={"Content-Type": "application/json"})
    if token: req.add_header("Authorization", "Bearer " + token)
    return json.loads(urllib.request.urlopen(req).read())

async def main():
    tok = post("/auth/login", {"email": "juma.demo@example.com", "password": "KalutaDemo123!"})["tokens"]["access_token"]
    p = post("/posts", {"body": "realtime probe"}, tok)
    pid = p["id"]

    got = []
    async with websockets.connect(f"ws://gateway:8000/api/ws?token={tok}") as ws:
        ready = json.loads(await asyncio.wait_for(ws.recv(), 5))
        await ws.send(json.dumps({"action": "subscribe", "topics": [f"post:{pid}", "feed"]}))
        sub = json.loads(await asyncio.wait_for(ws.recv(), 5))

        async def collect():
            try:
                while True:
                    got.append(json.loads(await ws.recv()))
            except Exception:
                pass
        task = asyncio.create_task(collect())
        await asyncio.sleep(0.4)

        post(f"/posts/{pid}/like", None, tok)
        post(f"/posts/{pid}/comments", {"body": "hello live"}, tok)
        post("/posts", {"body": "another public post"}, tok)
        await asyncio.sleep(2.0)
        task.cancel()

    print("  ready frame :", ready.get("type"), ready.get("topics"))
    print("  subscribed  :", sub.get("type"), sub.get("topics"))
    print("  events received:", len(got))
    for g in got:
        print("   -", g.get("type"), "on", g.get("topic"),
              {k: v for k, v in g.items() if k in ("likes_count", "comments_count", "post_id")})
    kinds = {g.get("type") for g in got}
    print("  PASS" if {"likes", "comment", "post"} <= kinds else "  MISSING: " + str({"likes","comment","post"} - kinds))

asyncio.run(main())
