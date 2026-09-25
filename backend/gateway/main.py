"""Kinjy · gateway

Single public entry point. The browser only ever talks to this origin, so the
frontend needs no per-service URLs and no cross-origin dance.

Routing is prefix-based and declared in ROUTES below. Two rules matter:

* ``/internal/*`` is never proxied. Those endpoints trust their caller and must
  stay on the private network — exposing one would let anyone post to the ledger.
* The Authorization header is forwarded untouched; the gateway does not mint,
  inspect or rewrite tokens. Each service verifies for itself.
"""
from __future__ import annotations

import logging

import httpx
import asyncio

import websockets
from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from common import settings

log = logging.getLogger("gateway")

# prefix -> upstream. Longest prefix wins, so "/api/ads" beats "/api/a".
ROUTES: dict[str, str] = {
    "/api/auth": "http://auth-service:8000",
    "/api/admin/users": "http://auth-service:8000",
    "/api/users": "http://user-service:8000",
    "/api/circles": "http://user-service:8000",
    "/api/connections": "http://user-service:8000",
    "/api/wellbeing": "http://user-service:8000",
    "/api/preferences": "http://user-service:8000",
    "/api/posts": "http://social-service:8000",
    "/api/feed": "http://social-service:8000",
    "/api/shorts": "http://social-service:8000",
    "/api/algorithms": "http://social-service:8000",
    "/api/communities": "http://community-service:8000",
    "/api/forums": "http://community-service:8000",
    "/api/discover": "http://community-service:8000",
    "/api/threads": "http://community-service:8000",
    "/api/family": "http://family-service:8000",
    "/api/memorials": "http://memorial-service:8000",
    "/api/conversations": "http://messaging-service:8000",
    "/api/notifications": "http://messaging-service:8000",
    "/api/creators": "http://creator-service:8000",
    "/api/live": "http://creator-service:8000",
    "/api/subscriptions": "http://creator-service:8000",
    "/api/badges": "http://creator-service:8000",
    "/api/commerce": "http://commerce-service:8000",
    "/api/ads": "http://commerce-service:8000",
    "/api/ledger": "http://ledger-service:8000",
    "/api/wallet": "http://ledger-service:8000",
    "/api/commissions": "http://ledger-service:8000",
    "/api/leaders-pool": "http://ledger-service:8000",
    "/api/leaders": "http://ledger-service:8000",
    "/api/payments": "http://payment-service:8000",
    "/api/kyc": "http://payment-service:8000",
    "/api/ai": "http://ai-service:8000",
    "/api/assistant": "http://ai-service:8000",
    "/api/media": "http://media-service:8000",
    "/media": "http://media-service:8000",
}

# Admin routes fan out to whichever service owns them.
ADMIN_ROUTES: dict[str, str] = {
    "/api/admin/journals": "http://ledger-service:8000",
    "/api/admin/trial-balance": "http://ledger-service:8000",
    "/api/admin/reconcile": "http://ledger-service:8000",
    "/api/admin/leaders-pool": "http://ledger-service:8000",
    "/api/admin/referral-pool": "http://auth-service:8000",
    "/api/admin/disputes": "http://commerce-service:8000",
    "/api/admin/contact-risk": "http://messaging-service:8000",
    "/api/admin/age": "http://auth-service:8000",
    "/api/admin/refunds": "http://payment-service:8000",
    "/api/admin/payouts": "http://payment-service:8000",
    "/api/admin/memorials": "http://memorial-service:8000",
    "/api/admin/ads": "http://commerce-service:8000",
    "/api/admin/assistant": "http://ai-service:8000",
    "/api/admin/ai": "http://ai-service:8000",
}

ALL_ROUTES = {**ROUTES, **ADMIN_ROUTES}
SORTED_PREFIXES = sorted(ALL_ROUTES, key=len, reverse=True)

HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length",
}

app = FastAPI(title="Kinjy · gateway", version="0.1.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3030", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_client: httpx.AsyncClient | None = None


@app.on_event("startup")
async def _startup() -> None:
    global _client
    _client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=5.0), follow_redirects=False)


@app.on_event("shutdown")
async def _shutdown() -> None:
    if _client is not None:
        await _client.aclose()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gateway", "routes": len(ALL_ROUTES)}


@app.get("/api/status")
async def status():
    """Health of every upstream — the one call an ops dashboard needs."""
    upstreams = sorted(set(ALL_ROUTES.values()))
    results = {}
    for url in upstreams:
        name = url.split("//")[1].split(":")[0]
        try:
            response = await _client.get(f"{url}/health", timeout=3)
            results[name] = {"status": "ok" if response.status_code == 200 else "degraded"}
        except Exception as exc:
            results[name] = {"status": "down", "error": type(exc).__name__}
    healthy = sum(1 for r in results.values() if r["status"] == "ok")
    return {"healthy": healthy, "total": len(results), "services": results}


# --- WebSocket relay ---------------------------------------------------------
# Real-time chat has to reach messaging-service, and the browser only ever talks
# to this origin. Starlette will not proxy a socket for us, so the gateway holds
# both ends and pumps frames between them until either side closes.
WS_ROUTES: dict[str, str] = {
    "/api/ws": "ws://messaging-service:8000/ws",
}


@app.websocket("/api/ws")
async def websocket_relay(client: WebSocket, token: str = ""):
    upstream_url = f"{WS_ROUTES['/api/ws']}?token={token}"
    await client.accept()

    try:
        async with websockets.connect(upstream_url, open_timeout=8) as upstream:

            async def to_upstream() -> None:
                while True:
                    await upstream.send(await client.receive_text())

            async def to_client() -> None:
                async for message in upstream:
                    await client.send_text(
                        message if isinstance(message, str) else message.decode()
                    )

            pump_up = asyncio.create_task(to_upstream())
            pump_down = asyncio.create_task(to_client())
            done, pending = await asyncio.wait(
                {pump_up, pump_down}, return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
            # Surface a genuine upstream failure instead of a silent close.
            for task in done:
                if task.exception() and not isinstance(
                    task.exception(), (WebSocketDisconnect, asyncio.CancelledError)
                ):
                    log.warning("ws relay ended: %s", task.exception())
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        log.warning("ws relay could not reach messaging-service: %s", exc)
        # 1011 = the gateway itself failed, which is what happened.
        await client.close(code=1011)


def _resolve(path: str) -> tuple[str, str] | None:
    for prefix in SORTED_PREFIXES:
        if path == prefix or path.startswith(prefix + "/"):
            upstream = ALL_ROUTES[prefix]
            # Strip the /api namespace; services expose their routes unprefixed.
            downstream = path[4:] if path.startswith("/api/") else path
            return upstream, downstream
    return None


@app.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy(full_path: str, request: Request):
    path = "/" + full_path

    if "/internal/" in path or path.endswith("/internal"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    resolved = _resolve(path)
    if resolved is None:
        return JSONResponse(
            status_code=404,
            content={"detail": f"No route for {path}", "available": SORTED_PREFIXES[:20]},
        )

    upstream, downstream = resolved
    # Values are stripped because a client can legally send a header with
    # trailing whitespace ("Bearer ") that httpx then refuses to forward — an
    # unsanitised pass-through turns a malformed request into a gateway 500.
    headers = {
        k: v.strip()
        for k, v in request.headers.items()
        if k.lower() not in HOP_BY_HOP and v.strip()
    }
    headers["X-Forwarded-For"] = request.client.host if request.client else ""
    headers["X-Forwarded-Host"] = request.headers.get("host", "")

    try:
        response = await _client.request(
            request.method,
            f"{upstream}{downstream}",
            content=await request.body(),
            headers=headers,
            params=request.query_params,
        )
    except httpx.LocalProtocolError as exc:
        return JSONResponse(status_code=400, content={"detail": f"Malformed request: {exc}"})
    except httpx.ConnectError:
        return JSONResponse(
            status_code=503,
            content={"detail": f"{upstream.split('//')[1].split(':')[0]} is unavailable"},
        )
    except httpx.TimeoutException:
        return JSONResponse(status_code=504, content={"detail": "Upstream timed out"})

    out_headers = {k: v for k, v in response.headers.items() if k.lower() not in HOP_BY_HOP}
    return Response(
        content=response.content,
        status_code=response.status_code,
        headers=out_headers,
        media_type=response.headers.get("content-type"),
    )
