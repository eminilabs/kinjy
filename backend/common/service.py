"""Factory that builds a consistently-configured FastAPI app for every service.

Gives each service: CORS, request logging, a /health probe the Docker
healthcheck hits, uniform error envelopes, and schema creation on startup.
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Callable, Sequence

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from common import database, events, migrations as _migrations, settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s [%(name)s] %(message)s",
)
log = logging.getLogger("kaluta")


def create_app(
    *,
    name: str,
    schema: str,
    description: str = "",
    version: str = "0.1.0",
    on_startup: Sequence[Callable] = (),
    create_tables: bool = True,
    migrations: Sequence[str] = (),
) -> FastAPI:
    settings.SERVICE_NAME = name

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if create_tables:
            for attempt in range(1, 11):
                try:
                    database.create_all(schema)
                    break
                except Exception as exc:
                    log.warning("db not ready (%s/10): %s", attempt, exc)
                    time.sleep(2)
            else:
                log.error("could not reach the database; %s starts degraded", name)
            # Columns added after the first deploy: create_all cannot add them.
            _migrations.run(list(migrations), service=name)
        for hook in on_startup:
            result = hook()
            if hasattr(result, "__await__"):
                await result
        log.info("%s ready (schema=%s)", name, schema)
        yield
        await events.close()

    app = FastAPI(
        title=f"Kinjy · {name}",
        description=description,
        version=version,
        lifespan=lifespan,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL, settings.GATEWAY_URL, "http://localhost:3030"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def timing(request: Request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Service"] = name
        response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
        if elapsed_ms > 750:
            log.warning("slow %s %s %.0fms", request.method, request.url.path, elapsed_ms)
        return response

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):
        log.exception("unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error", "service": name})

    @app.get("/health", tags=["meta"])
    def health():
        return {"status": "ok", "service": name, "schema": schema, "env": settings.ENV}

    return app
