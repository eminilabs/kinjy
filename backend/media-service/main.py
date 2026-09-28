"""Kinjy · media-service — uploads, provenance labelling, static serving."""
from __future__ import annotations

import hashlib
import logging
import math
import os
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session as OrmSession

from common import mediasign, settings
from common.auth import CurrentUser, optional_principal
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import models
import profileimages
import uploadcenter

log = logging.getLogger("media-service")

MAX_BYTES = 200 * 1024 * 1024  # 200 MB

# What a *post* may carry: formats every browser renders, because a post is
# something people view rather than download.
ALLOWED = {
    "image/jpeg": "image", "image/png": "image", "image/webp": "image", "image/gif": "image",
    "video/mp4": "video", "video/webm": "video",
    "audio/mpeg": "audio", "audio/ogg": "audio", "audio/wav": "audio",
    "application/pdf": "document",
}

# A chat attachment may be any file at all — a spreadsheet, a zip, a voice
# note. The types a browser can play or show get a player; everything else is
# a download.
CHAT_PLAYABLE = {
    **ALLOWED,
    "image/avif": "image",
    "video/quicktime": "video", "video/ogg": "video",
    "audio/webm": "audio", "audio/mp4": "audio", "audio/aac": "audio", "audio/x-m4a": "audio",
    "audio/wave": "audio", "audio/x-wav": "audio", "audio/flac": "audio",
}
PURPOSES = ("post", "chat")

# The only kinds ever served inline. Anything else — HTML, SVG, XML, scripts,
# unknown bytes — goes out as an opaque download: this service answers on the
# app's own origin, so a file a browser would *render* there could run script
# with the member's session. SVG is deliberately absent from every list.
INLINE_KINDS = {"image", "video", "audio", "document"}
# access is new. Existing rows default to public, which is correct for what
# is already there (avatars and marketing art); post media is marked restricted
# as it is attached.
MIGRATIONS = [
    f"ALTER TABLE {models.SCHEMA}.assets "
    "ADD COLUMN IF NOT EXISTS access VARCHAR(20) DEFAULT 'public'",
    f"ALTER TABLE {models.SCHEMA}.assets ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'local'",
    f"ALTER TABLE {models.SCHEMA}.assets ADD COLUMN IF NOT EXISTS external_id VARCHAR(80)",
    f"ALTER TABLE {models.SCHEMA}.assets ADD COLUMN IF NOT EXISTS purpose VARCHAR(20)",
    f"ALTER TABLE {models.SCHEMA}.assets ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ready'",
    f"ALTER TABLE {models.SCHEMA}.assets ADD COLUMN IF NOT EXISTS status_checks INTEGER DEFAULT 0",
    f"ALTER TABLE {models.SCHEMA}.assets ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ",
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
    purpose: str = Form(default="post"),
    db: OrmSession = Depends(get_db),
):
    if provenance not in models.Asset.PROVENANCE:
        raise HTTPException(
            status_code=400,
            detail=f"provenance must be one of: {', '.join(models.Asset.PROVENANCE)}",
        )
    if purpose not in PURPOSES:
        raise HTTPException(status_code=400, detail=f"purpose must be one of: {', '.join(PURPOSES)}")
    content_type = (file.content_type or "application/octet-stream").split(";")[0].strip().lower()
    if purpose == "chat":
        kind = CHAT_PLAYABLE.get(content_type, "file")
    else:
        kind = ALLOWED.get(content_type)
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
        return {**_describe(existing), "deduplicated": True}

    asset = models.Asset(
        id=asset_id,
        owner_id=principal.user_id,
        filename=file.filename or asset_id,
        content_type=content_type,
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
        **_describe(asset),
        "note": "The provenance label is declared by the uploader. C2PA signing is not enabled yet.",
    }


def _describe(asset: models.Asset) -> dict:
    return {
        "id": asset.id,
        "url": asset.url,
        "kind": asset.kind,
        "content_type": asset.content_type,
        "filename": asset.filename,
        "size_bytes": asset.size_bytes,
        "provenance": asset.provenance,
        "provenance_signed": asset.provenance_signed,
    }


@app.get("/internal/assets/{asset_id}", tags=["internal"])
def internal_asset(asset_id: str, db: OrmSession = Depends(get_db)):
    """What an asset is and who owns it — for services attaching one to something.

    messaging-service stores what this says rather than what the client
    claims, so a message cannot label a zip as a photo or attach another
    member's upload.
    """
    asset = db.get(models.Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {**_describe(asset), "owner_id": asset.owner_id}


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
    if asset is None or asset.status != "ready":
        raise HTTPException(status_code=404, detail="Asset not found")
    # Profile images on UploadCenter are public by construction; their CDN is
    # the place to fetch them from.
    if asset.provider == "uploadcenter" and asset.access == "public":
        if not profileimages.cdn_url_allowed(asset.url, uploadcenter.cdn_hosts()):
            raise HTTPException(status_code=404, detail="Asset not found")
        return RedirectResponse(asset.url, status_code=302)
    if not os.path.exists(asset.storage_path):
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
    inline = asset.kind in INLINE_KINDS and not asset.content_type.startswith("image/svg")
    return FileResponse(
        asset.storage_path,
        media_type=asset.content_type if inline else "application/octet-stream",
        filename=asset.filename,
        content_disposition_type="inline" if inline else "attachment",
        headers=_serve_headers(asset.content_type if inline else None),
    )


def _serve_headers(inline_type: str | None) -> dict[str, str]:
    # Never let a browser second-guess the type into something runnable, and
    # even if it did, give the document no script and no origin. The one
    # exception is PDF: Chrome refuses to open a PDF under a sandbox policy,
    # and its viewer does not run the file's scripts in this origin anyway.
    headers = {"X-Content-Type-Options": "nosniff"}
    if inline_type != "application/pdf":
        headers["Content-Security-Policy"] = (
            "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'"
        )
    return headers
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
    _discard_bytes(asset)
    db.delete(asset)
    db.commit()


def _discard_bytes(asset: models.Asset) -> None:
    """Delete the stored bytes. A remote failure is logged, never raised: the
    member asked for the row to go, and an orphaned remote file is recoverable
    from UploadCenter's console where a stuck delete button is not."""
    _discard_stored(asset.provider, asset.external_id, asset.storage_path)


def _discard_stored(provider: str, external_id: str | None, storage_path: str | None) -> None:
    """_discard_bytes on plain values, for a background task that runs after
    the request's session is closed."""
    if provider == "uploadcenter" and external_id:
        try:
            uploadcenter.delete_file(external_id)
        except uploadcenter.UploadCenterError as exc:
            log.warning("could not delete uploadcenter file %s: %s", external_id, exc)
    elif storage_path:
        Path(storage_path).unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Profile images (avatar, cover)
#
# Three steps, the same for both storages so the client has one flow:
#   1. presign  - the member declares purpose, type and size; refused here
#                 before anything is stored.
#   2. PUT      - the bytes come to this service, which checks them, then
#                 stores them: on the media volume (local mode, no key) or on
#                 UploadCenter, server to server. The browser cannot upload to
#                 UploadCenter itself: its storage refuses CORS preflights.
#   3. complete - 200 once the stored file is ready, 202 while UploadCenter
#                 is still scanning it.
# Only a ready asset can be put on a profile; user-service asks
# /internal/media/{id} before accepting one.
# ---------------------------------------------------------------------------

MAX_UNFINISHED_PROFILE_UPLOADS = 10
PENDING_WINDOW = timedelta(hours=1)


class ProfileImageRequest(BaseModel):
    purpose: str
    filename: str = Field(min_length=1, max_length=255)
    mime_type: str
    size_bytes: int


def _own_profile_image(db: OrmSession, asset_id: str, owner_id: str, lock: bool = False) -> models.Asset:
    asset = db.get(models.Asset, asset_id, with_for_update=lock)
    if asset is None or asset.owner_id != owner_id or asset.purpose is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    return asset


def _profile_image_out(asset: models.Asset) -> dict:
    return {
        "asset_id": asset.id,
        "purpose": asset.purpose,
        "status": asset.status,
        "url": asset.url or None,
        "storage": asset.provider,
    }


def _still_processing(asset: models.Asset, retry_after: int = 2) -> JSONResponse:
    """202: not ready yet, ask again in ``retry_after`` seconds."""
    return JSONResponse(status_code=202, content={**_profile_image_out(asset), "retry_after_seconds": retry_after})


_UNFINISHED = ("pending", "uploading", "processing")
MAX_EXPIRED_PER_REQUEST = 20


def _expire_abandoned_uploads(db: OrmSession, owner_id: str) -> list[tuple[str, str | None, str | None]]:
    """Fail this member's uploads left unfinished for longer than PENDING_WINDOW.

    A tab closed mid-upload, a scan the browser stopped polling, a service
    restarted between claiming an upload and storing it: each leaves a row that
    never becomes ready, and possibly a stored file nothing will ever show.
    Swept here, on the member's next upload, rather than by a timer - the same
    choice as messaging-service's expiry: no scheduler to run or forget.

    Returns what to delete from storage, for after the response.
    """
    cutoff = datetime.now(timezone.utc) - PENDING_WINDOW
    stale = db.scalars(
        select(models.Asset)
        .where(
            models.Asset.owner_id == owner_id,
            models.Asset.purpose.is_not(None),
            models.Asset.status.in_(_UNFINISHED),
            models.Asset.created_at < cutoff,
        )
        .limit(MAX_EXPIRED_PER_REQUEST)
        .with_for_update(skip_locked=True)
    ).all()
    stored = []
    for asset in stale:
        asset.status = "failed"
        stored.append((asset.provider, asset.external_id, asset.storage_path))
    if stale:
        db.commit()
        log.info("expired %d abandoned profile uploads for %s", len(stale), owner_id)
    return stored


@app.post("/media/profile-images/presign", status_code=201, tags=["profile images"])
def presign_profile_image(
    payload: ProfileImageRequest,
    principal: CurrentUser,
    background: BackgroundTasks,
    db: OrmSession = Depends(get_db),
):
    problem = profileimages.check_request(payload.purpose, payload.mime_type, payload.size_bytes)
    if problem:
        raise HTTPException(status_code=422, detail=problem)

    for stored in _expire_abandoned_uploads(db, principal.user_id):
        background.add_task(_discard_stored, *stored)

    # Each presign creates a row. A member changing their picture needs a
    # handful; a script needs thousands.
    since = datetime.now(timezone.utc) - PENDING_WINDOW
    unfinished = db.scalar(
        select(func.count()).select_from(models.Asset).where(
            models.Asset.owner_id == principal.user_id,
            models.Asset.purpose.is_not(None),
            models.Asset.status.in_(_UNFINISHED),
            models.Asset.created_at >= since,
        )
    )
    if unfinished >= MAX_UNFINISHED_PROFILE_UPLOADS:
        raise HTTPException(status_code=429, detail="Too many unfinished uploads. Please try again later.")

    filename = Path(payload.filename).name[:255] or "image"
    asset = models.Asset(
        id=new_id("mda"),
        owner_id=principal.user_id,
        filename=filename,
        content_type=payload.mime_type,
        size_bytes=payload.size_bytes,
        sha256="",
        storage_path="",
        url="",
        kind="image",
        access="public",
        purpose=payload.purpose,
        status="pending",
        provider="uploadcenter" if uploadcenter.enabled() else "local",
    )
    db.add(asset)
    db.commit()
    return {
        "asset_id": asset.id,
        "storage": asset.provider,
        "method": "PUT",
        "headers": {"Content-Type": payload.mime_type},
        "upload": {"path": f"/media/profile-images/{asset.id}/content"},
    }


async def _read_body(request: Request, limit: int) -> bytes:
    """The request body, refused as soon as it passes the limit."""
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > limit:
            raise HTTPException(status_code=413, detail=f"The image must be at most {limit // profileimages.MB} MB")
    return bytes(data)


def _send_to_uploadcenter(filename: str, data: bytes, mime_type: str) -> str:
    """Presign, upload and complete on UploadCenter; returns its file id."""
    signed = uploadcenter.presign(filename, len(data), mime_type, visibility="public")
    if not profileimages.upload_url_allowed(signed.get("upload_url")):
        log.warning("uploadcenter returned an upload URL that is not https; refusing to send")
        raise uploadcenter.UploadCenterError("The file storage returned an unusable upload address")
    uploadcenter.put_bytes(signed["upload_url"], data, mime_type)
    uploadcenter.complete(signed["file_id"])
    return signed["file_id"]


@app.put("/media/profile-images/{asset_id}/content", status_code=204, tags=["profile images"])
async def receive_profile_image(
    asset_id: str, request: Request, principal: CurrentUser, db: OrmSession = Depends(get_db),
):
    """Receive the bytes, check them, then store them.

    At most 10 MB (a cover), so the body is held in memory: that is what lets
    the bytes be checked before anything reaches storage.
    """
    asset = _own_profile_image(db, asset_id, principal.user_id)
    if asset.status != "pending":
        raise HTTPException(status_code=409, detail="This upload does not accept content")

    data = await _read_body(request, profileimages.LIMITS[asset.purpose])

    # The declared type was checked at presign; the bytes are checked here. A
    # file that is not the image it claims to be is refused, not stored.
    if not data or profileimages.sniff(data[:16]) != asset.content_type:
        asset.status = "failed"
        db.commit()
        raise HTTPException(status_code=422, detail="This file is not the image it claims to be")

    # Claimed atomically before storing, so two PUTs racing on the same upload
    # cannot both store a file (one of them would be orphaned). A conditional
    # UPDATE rather than SELECT ... FOR UPDATE: this handler is async and the
    # session is not, so waiting on a row lock would stall every request.
    claimed = db.execute(
        update(models.Asset)
        .where(models.Asset.id == asset.id, models.Asset.status == "pending")
        .values(status="uploading")
    ).rowcount
    db.commit()
    if not claimed:
        raise HTTPException(status_code=409, detail="This upload does not accept content")

    if asset.provider == "uploadcenter":
        try:
            asset.external_id = await run_in_threadpool(_send_to_uploadcenter, asset.filename, data, asset.content_type)
        except uploadcenter.UploadCenterError as exc:
            # Back to pending: the member can send the same upload again.
            asset.status = "pending"
            db.commit()
            raise HTTPException(status_code=502, detail=str(exc))
    else:
        folder = ROOT / principal.user_id[:12]
        folder.mkdir(parents=True, exist_ok=True)
        destination = folder / asset.id
        destination.write_bytes(data)
        asset.storage_path = str(destination)

    asset.size_bytes = len(data)
    asset.sha256 = hashlib.sha256(data).hexdigest()
    asset.status = "processing"
    db.commit()


@app.post("/media/profile-images/{asset_id}/complete", tags=["profile images"])
def complete_profile_image(asset_id: str, principal: CurrentUser, db: OrmSession = Depends(get_db)):
    """Idempotent. 200 when ready, 202 while UploadCenter is still scanning.

    The row is locked for the duration so two concurrent calls cannot both
    drive the same upload through complete().
    """
    asset = _own_profile_image(db, asset_id, principal.user_id, lock=True)
    if asset.status == "ready":
        return _profile_image_out(asset)
    if asset.status == "failed":
        raise HTTPException(status_code=422, detail="This image was rejected. Please choose another one.")

    if asset.status != "processing":
        raise HTTPException(status_code=409, detail="The image has not been uploaded yet")

    if asset.provider == "local":
        asset.url = f"{settings.MEDIA_PUBLIC_BASE}/{asset.id}"
        asset.status = "ready"
        db.commit()
        return _profile_image_out(asset)

    # Every check below is a call to UploadCenter. Answered from here when the
    # last one was too recent, refused for good after too many.
    now = datetime.now(timezone.utc)
    delay = profileimages.status_check_delay(asset.last_checked_at, asset.status_checks or 0, now)
    if delay is None:
        asset.status = "failed"
        db.commit()
        _discard_bytes(asset)
        log.info("profile image %s never became ready; given up", asset.id)
        raise HTTPException(status_code=422, detail="This image took too long to process. Please try another one.")
    if delay > 0:
        db.commit()
        return _still_processing(asset, retry_after=math.ceil(delay))
    asset.status_checks = (asset.status_checks or 0) + 1
    asset.last_checked_at = now

    try:
        record = uploadcenter.get_file(asset.external_id)
    except uploadcenter.UploadCenterError as exc:
        db.commit()  # the check counts even when UploadCenter did not answer
        raise HTTPException(status_code=502, detail=str(exc))

    if profileimages.is_failed(record):
        asset.status = "failed"
        db.commit()
        log.info("uploadcenter rejected %s (%s): status=%s", asset.id, asset.external_id, record.get("status"))
        raise HTTPException(status_code=422, detail="This image was rejected. Please choose another one.")
    problem = profileimages.stored_file_problem(record, asset.purpose)
    if problem:
        asset.status = "failed"
        db.commit()
        _discard_bytes(asset)
        raise HTTPException(status_code=422, detail=problem)

    if not profileimages.is_ready(record):
        db.commit()
        return _still_processing(asset)

    url = record["url"]
    if not profileimages.cdn_url_allowed(url, uploadcenter.cdn_hosts()):
        log.error("uploadcenter returned an unexpected url host for %s; check UPLOADCENTER_CDN_HOSTS", asset.id)
        asset.status = "failed"
        db.commit()
        raise HTTPException(status_code=502, detail="The file storage returned an unexpected address")

    # UploadCenter reports the type the browser declared. The bytes are checked
    # here, the first time this service sees any of them, with the same rule the
    # local path applies.
    try:
        head = uploadcenter.read_head(url)
    except uploadcenter.UploadCenterError:
        # CDN propagation can lag the "ready" status by a moment.
        db.commit()
        return _still_processing(asset)
    if profileimages.sniff(head) != asset.content_type:
        asset.status = "failed"
        db.commit()
        _discard_bytes(asset)
        raise HTTPException(status_code=422, detail="This file is not the image it claims to be")

    asset.url = url
    asset.size_bytes = int(record.get("size_bytes") or asset.size_bytes)
    asset.status = "ready"
    db.commit()
    return _profile_image_out(asset)


class DiscardIn(BaseModel):
    owner_id: str


@app.post("/internal/media/{asset_id}/discard", status_code=204, tags=["internal"])
def discard_profile_image(asset_id: str, payload: DiscardIn, db: OrmSession = Depends(get_db)):
    """Delete a profile image its owner has replaced or removed.

    Only profile images, and only for the owner named by the caller: an
    internal caller with a wrong id cannot delete somebody's post media.
    Unknown or already deleted is not an error - the outcome is the same.
    """
    asset = db.get(models.Asset, asset_id)
    if asset is None:
        return
    if asset.owner_id != payload.owner_id or asset.purpose is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    _discard_bytes(asset)
    db.delete(asset)
    db.commit()


@app.get("/internal/media/{asset_id}", tags=["internal"])
def internal_asset(asset_id: str, db: OrmSession = Depends(get_db)):
    """What user-service needs before putting an asset on a profile."""
    asset = db.get(models.Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {
        "id": asset.id,
        "owner_id": asset.owner_id,
        "purpose": asset.purpose,
        "status": asset.status,
        "access": asset.access,
        "url": asset.url or None,
        "storage": asset.provider,
    }
