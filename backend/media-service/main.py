"""Kinjy · media-service — uploads, provenance labelling, static serving."""
from __future__ import annotations

import hashlib
import os
import shutil
from pathlib import Path

from urllib.parse import quote

from fastapi import Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from common import crypto, settings
from common.auth import CurrentUser
from common.database import get_db
from common.ids import new_id
from common.service import create_app

import models

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

app = create_app(
    name="media-service",
    schema=models.SCHEMA,
    description="Uploads with content provenance labels and hash-based deduplication.",
    migrations=[
        f"ALTER TABLE {models.SCHEMA}.assets ADD COLUMN IF NOT EXISTS private BOOLEAN NOT NULL DEFAULT FALSE",
        f"ALTER TABLE {models.SCHEMA}.assets ADD COLUMN IF NOT EXISTS sealed_with VARCHAR(16)",
        f"ALTER TABLE {models.SCHEMA}.assets ALTER COLUMN filename TYPE TEXT",
    ],
    on_startup=[lambda: crypto.require_in_production("media-service")],
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
    # A chat attachment is private, and sealed on disk whenever a key is set.
    # Posts stay as they are: they are public by nature.
    private = purpose == "chat"
    seal = private and crypto.enabled()

    # A sealed file keeps no extension on disk: ".pdf" beside a random id
    # already says what the encryption is hiding.
    suffix = "" if seal else Path(file.filename or "").suffix[:10]
    destination = folder / f"{asset_id}{suffix}"

    digest = hashlib.sha256()
    written = 0
    with destination.open("wb") as out:
        sink = crypto.FileSealer(out, asset_id) if seal else out
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > MAX_BYTES:
                out.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"File exceeds the {MAX_BYTES // 1024 // 1024} MB limit")
            digest.update(chunk)
            sink.write(chunk)
        if seal:
            sink.close()

    sha = crypto.private_fingerprint(digest.hexdigest()) if private else digest.hexdigest()
    # Same bytes already uploaded by this member: reuse instead of storing twice.
    # Only within the same visibility — a private attachment must never come
    # back as a post's public image, nor a public one quietly become private.
    existing = db.scalar(
        select(models.Asset).where(
            models.Asset.sha256 == sha,
            models.Asset.owner_id == principal.user_id,
            models.Asset.private.is_(private),
        )
    )
    if existing is not None:
        destination.unlink(missing_ok=True)
        return {**_describe(existing), "deduplicated": True}

    asset = models.Asset(
        id=asset_id,
        owner_id=principal.user_id,
        filename=(
            crypto.seal_text(file.filename or asset_id, f"asset:{asset_id}:filename")[1]
            if seal
            else file.filename or asset_id
        ),
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
        private=private,
        sealed_with=crypto.keyring().active_id if seal else None,
    )
    db.add(asset)
    db.commit()

    return {
        **_describe(asset),
        "note": "The provenance label is declared by the uploader. C2PA signing is not enabled yet.",
    }


def _filename(asset: models.Asset) -> str:
    if not asset.sealed_with:
        return asset.filename
    try:
        return crypto.open_text(asset.sealed_with, asset.filename, f"asset:{asset.id}:filename")
    except crypto.DecryptionError:
        return "attachment"


def _describe(asset: models.Asset) -> dict:
    return {
        "id": asset.id,
        "url": asset.url,
        "kind": asset.kind,
        "content_type": asset.content_type,
        "filename": _filename(asset),
        "private": asset.private,
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
    exp: str | None = None,
    sig: str | None = None,
    db: OrmSession = Depends(get_db),
):
    asset = db.get(models.Asset, asset_id)
    if asset is None or not os.path.exists(asset.storage_path):
        raise HTTPException(status_code=404, detail="Asset not found")
    # A private attachment needs a link signed for it. Without one — or with an
    # expired or forged one — it does not exist, as far as this answer says:
    # 403 would confirm the id is real.
    if asset.private and not crypto.media_signature_valid(asset.id, exp, sig):
        raise HTTPException(status_code=404, detail="Asset not found")

    inline = asset.kind in INLINE_KINDS and not asset.content_type.startswith("image/svg")
    media_type = asset.content_type if inline else "application/octet-stream"
    headers = _serve_headers(asset.content_type if inline else None)
    if asset.private:
        # Signed links are personal; no shared cache may keep one's response.
        headers["Cache-Control"] = "private, max-age=3600"

    if not asset.sealed_with:
        return FileResponse(
            asset.storage_path,
            media_type=media_type,
            filename=_filename(asset),
            content_disposition_type="inline" if inline else "attachment",
            headers=headers,
        )
    return _serve_sealed(asset, request, media_type, inline, headers)


def _serve_sealed(asset: models.Asset, request: Request, media_type: str, inline: bool, headers: dict) -> Response:
    """Decrypt on the way out, honouring Range.

    Range is not optional: Safari will not play a video whose server cannot
    answer a byte range, and seeking anywhere in a clip needs it everywhere.
    """
    size = asset.size_bytes
    disposition = "inline" if inline else "attachment"
    headers = {
        **headers,
        "Accept-Ranges": "bytes",
        "Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(_filename(asset))}",
    }
    start, end, status = 0, size - 1, 200
    wanted = request.headers.get("range", "")
    if wanted.startswith("bytes=") and size:
        first, _, last = wanted[6:].split(",")[0].strip().partition("-")
        try:
            if first:
                start, end = int(first), (int(last) if last else size - 1)
            else:  # "bytes=-500": the last 500 bytes
                start, end = max(0, size - int(last)), size - 1
        except ValueError:
            start, end = 0, size - 1
        else:
            end = min(end, size - 1)
            if start > end:
                return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
            status = 206
            headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    headers["Content-Length"] = str(end - start + 1 if size else 0)
    return StreamingResponse(
        crypto.open_file_range(asset.storage_path, asset.id, size, start, end) if size else iter(()),
        status_code=status,
        media_type=media_type,
        headers=headers,
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


@app.get("/media/{asset_id}/provenance", tags=["media"])
def provenance(asset_id: str, db: OrmSession = Depends(get_db)):
    asset = db.get(models.Asset, asset_id)
    # Provenance is a public record for public media; a private attachment has
    # none to show, and its fingerprint is not for outsiders.
    if asset is None or asset.private:
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
