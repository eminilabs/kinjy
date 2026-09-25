"""Kinjy · media-service — uploads, provenance labelling, static serving."""
from __future__ import annotations

import hashlib
import logging
import os
import shutil
from pathlib import Path

from fastapi import Depends, File, Form, HTTPException, UploadFile, Request
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from common import mediasign, settings
from common.auth import CurrentUser, optional_principal
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import models

log = logging.getLogger("media-service")

MAX_BYTES = 200 * 1024 * 1024  # 200 MB
ALLOWED = {
    "image/jpeg": "image", "image/png": "image", "image/webp": "image", "image/gif": "image",
    "video/mp4": "video", "video/webm": "video",
    "audio/mpeg": "audio", "audio/ogg": "audio", "audio/wav": "audio",
    "application/pdf": "document",
}

# access is new. Existing rows default to public, which is correct for what
# is already there (avatars and marketing art); post media is marked restricted
# as it is attached.
MIGRATIONS = [
    f"ALTER TABLE {models.SCHEMA}.assets "
    "ADD COLUMN IF NOT EXISTS access VARCHAR(20) DEFAULT 'public'",
]

app = create_app(
    name="media-service",
    schema=models.SCHEMA,
    description="Uploads with content provenance labels and hash-based deduplication.",
    migrations=MIGRATIONS,
)

ROOT = Path(settings.MEDIA_ROOT)
ROOT.mkdir(parents=True, exist_ok=True)


@app.post("/media/upload", status_code=201, tags=["media"])
async def upload(
    principal: CurrentUser,
    file: UploadFile = File(...),
    provenance: str = Form(default="original"),
    alt_text: str | None = Form(default=None),
    derived_from: str | None = Form(default=None),
    db: OrmSession = Depends(get_db),
):
    if provenance not in models.Asset.PROVENANCE:
        raise HTTPException(
            status_code=400,
            detail=f"provenance must be one of: {', '.join(models.Asset.PROVENANCE)}",
        )
    kind = ALLOWED.get(file.content_type or "")
    if kind is None:
        raise HTTPException(status_code=415, detail=f"Unsupported content type: {file.content_type}")

    asset_id = new_id("mda")
    folder = ROOT / principal.user_id[:12]
    folder.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix[:10]
    destination = folder / f"{asset_id}{suffix}"

    digest = hashlib.sha256()
    written = 0
    with destination.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > MAX_BYTES:
                out.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"File exceeds the {MAX_BYTES // 1024 // 1024} MB limit")
            digest.update(chunk)
            out.write(chunk)

    sha = digest.hexdigest()
    # Same bytes already uploaded by this member: reuse instead of storing twice.
    existing = db.scalar(
        select(models.Asset).where(models.Asset.sha256 == sha, models.Asset.owner_id == principal.user_id)
    )
    if existing is not None:
        destination.unlink(missing_ok=True)
        return {"id": existing.id, "url": existing.url, "deduplicated": True}

    asset = models.Asset(
        id=asset_id,
        owner_id=principal.user_id,
        filename=file.filename or asset_id,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=written,
        sha256=sha,
        storage_path=str(destination),
        url=f"{settings.MEDIA_PUBLIC_BASE}/{asset_id}",
        kind=kind,
        provenance=provenance,
        provenance_signed=False,
        derived_from=derived_from,
        alt_text=alt_text,
    )
    db.add(asset)
    db.commit()

    return {
        "id": asset.id,
        "url": asset.url,
        "kind": asset.kind,
        "size_bytes": written,
        "provenance": asset.provenance,
        "provenance_signed": False,
        "note": "The provenance label is declared by the uploader. C2PA signing is not enabled yet.",
    }


@app.get("/media/{asset_id}", tags=["media"])
def serve(
    asset_id: str,
    request: Request,
    v: str | None = None,
    e: str | None = None,
    s: str | None = None,
    db: OrmSession = Depends(get_db),
):
    """Serve the bytes.

    A restricted asset needs a valid ticket. This endpoint deliberately does
    **not** decide whether the viewer is old enough - that decision was made by
    whichever service minted the ticket, which had the post, its classification
    and the viewer's tier in hand. Here it is arithmetic: is this signature
    ours, is it for this asset, has it expired, and does it match whoever is
    signed in.

    404 rather than 403 throughout. Distinguishing "no such asset" from "you
    may not have this one" tells somebody which ids are worth passing on.
    """
    asset = db.get(models.Asset, asset_id)
    if asset is None or not os.path.exists(asset.storage_path):
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.access == "restricted":
        principal = optional_principal(request.headers.get("authorization"))
        ok, reason = mediasign.verify(
            asset_id, v, e, s,
            authenticated_as=principal.user_id if principal else None,
        )
        if not ok:
            log.info("media %s refused: %s", asset_id, reason)
            raise HTTPException(status_code=404, detail="Asset not found")

    response = FileResponse(
        asset.storage_path, media_type=asset.content_type, filename=asset.filename
    )
    if asset.access == "restricted":
        # Never let a shared cache hold a restricted byte range: a CDN that
        # caches one viewer's authorised response serves it to the next.
        response.headers["Cache-Control"] = "private, no-store"
    return response


@app.post("/internal/media/{asset_id}/restrict", tags=["internal"])
def restrict_asset(asset_id: str, db: OrmSession = Depends(get_db)):
    """Mark an asset as needing a ticket.

    Called when the asset is attached to a post. Idempotent, and one-way on
    purpose: there is no internal route back to public, because the only reason
    to want one would be to clear a restriction somebody else applied.
    """
    asset = db.get(models.Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.access = "restricted"
    db.commit()
    return {"id": asset.id, "access": asset.access}


@app.post("/internal/media/sign", tags=["internal"])
def sign_assets(payload: dict):
    """Mint tickets for assets the caller has already authorised.

    The caller is responsible for the age decision; this only signs. It is on
    the private network for that reason - a public minting endpoint would be a
    public bypass.
    """
    asset_ids = [a for a in (payload.get("asset_ids") or []) if isinstance(a, str)][:100]
    viewer = payload.get("viewer_id")
    ttl = int(payload.get("ttl") or mediasign.DEFAULT_TTL_SECONDS)
    return {
        "tickets": {
            asset_id: mediasign.query_string(asset_id, viewer, ttl=ttl)
            for asset_id in asset_ids
        }
    }


@app.get("/media/{asset_id}/provenance", tags=["media"])
def provenance(asset_id: str, db: OrmSession = Depends(get_db)):
    asset = db.get(models.Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    chain = []
    cursor: models.Asset | None = asset
    seen = set()
    while cursor is not None and cursor.id not in seen:
        seen.add(cursor.id)
        chain.append({"id": cursor.id, "provenance": cursor.provenance, "created_at": cursor.created_at})
        cursor = db.get(models.Asset, cursor.derived_from) if cursor.derived_from else None

    return {
        "id": asset.id,
        "provenance": asset.provenance,
        "signed": asset.provenance_signed,
        "sha256": asset.sha256,
        "chain": chain,
        "labels": list(models.Asset.PROVENANCE),
    }


@app.delete("/media/{asset_id}", status_code=204, tags=["media"])
def delete(asset_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    asset = db.get(models.Asset, asset_id)
    if asset is None or (asset.owner_id != principal.user_id and not principal.is_admin):
        raise HTTPException(status_code=404, detail="Asset not found")
    Path(asset.storage_path).unlink(missing_ok=True)
    db.delete(asset)
    db.commit()
