"""Work that takes longer than a request has, run where the request is not waiting for it.

A carousel is a few seconds of drawing; a long video is a minute or more of encoding; a
translation by a language model is seconds to minutes. The gateway gives a request thirty
seconds, so none of these can be done inside ``POST /creators/publish``: the endpoint writes
the row as ``queued`` and hands its id here, and the screen polls the job until nothing is
pending. (A text in the creator's own language is only rearranged, and is still made in
the request.)

The queue is the database. A row's ``status`` says where its render is, which is
why there is nothing else to lose when the process restarts: :func:`recover`
fails whatever was in flight, with a reason, rather than leaving a creator
looking at "rendering" forever (the failure this module's sibling, derive.py,
was written to end).

Two worker threads, on purpose. Encoding is CPU-bound and shares a machine with
twelve other services; more threads would only make each render, and everything
else, slower.
"""
from __future__ import annotations

import json
import logging
from concurrent.futures import ThreadPoolExecutor

import httpx
from sqlalchemy import select, update

from common.database import SessionLocal

import derive
import models
import render

log = logging.getLogger("creator-service.media")

MEDIA_URL = "http://media-service:8000"
WORKERS = 2

# What a creator may have waiting or rendering at once. The engine runs on the
# platform's own machine: without a cap, one request for every format in every
# language is twenty renders, and a few of those are the whole queue.
MAX_PENDING_PER_CREATOR = 12

_pool = ThreadPoolExecutor(max_workers=WORKERS, thread_name_prefix="render")


def submit(output_ids: list[int]) -> None:
    for output_id in output_ids:
        _pool.submit(_guarded, output_id)


def job_status(statuses: set[str] | list[str]) -> str:
    """A job's state from its outputs'. ``running`` while any render is still
    waiting; ``done`` when something was made; ``partial`` when nothing was."""
    states = set(statuses)
    if states & {"queued", "running"}:
        return "running"
    return "done" if states & {"ready", "done"} else "partial"


def settle(db, job_id: str) -> None:
    """Recompute a job's status from its outputs. The caller commits."""
    job = db.get(models.PublishingJob, job_id)
    if job is None:
        return
    # Sessions here do not flush by themselves: without this the query below
    # reads the output as it was before this render finished, and the job stays
    # "running" for ever after its last render lands.
    db.flush()
    job.status = job_status(
        db.scalars(select(models.PublishingOutput.status).where(models.PublishingOutput.job_id == job_id)).all()
    )


def recover() -> None:
    """On startup: nothing is rendering, so whatever says it is has been
    interrupted. Failed with a reason the creator can act on - make it again."""
    with SessionLocal() as db:
        rows = db.execute(
            select(models.PublishingOutput.id, models.PublishingOutput.job_id).where(
                models.PublishingOutput.status.in_(("queued", "running")),
                models.PublishingOutput.target.in_(render.MEDIA_TARGETS + derive.TEXT_TARGETS),
            )
        ).all()
        if not rows:
            return
        db.execute(
            update(models.PublishingOutput)
            .where(models.PublishingOutput.id.in_([r.id for r in rows]))
            .values(status="failed", error="Interrupted when the service restarted. Make it again.")
        )
        for job_id in {r.job_id for r in rows}:
            settle(db, job_id)
        db.commit()
        log.warning("failed %d render(s) that a restart interrupted", len(rows))


def _guarded(output_id: int) -> None:
    try:
        run(output_id)
    except Exception:  # a worker thread must never die with a row left 'running'
        log.exception("render %s crashed", output_id)
        try:
            with SessionLocal() as db:
                out = db.get(models.PublishingOutput, output_id)
                if out is not None and out.status in ("queued", "running"):
                    out.status, out.error = "failed", "The render failed unexpectedly. Try again."
                    settle(db, out.job_id)
                    db.commit()
        except Exception:
            log.exception("could not mark render %s failed", output_id)


# --- one render ----------------------------------------------------------------

def run(output_id: int) -> None:
    with SessionLocal() as db:
        out = db.get(models.PublishingOutput, output_id)
        if out is None or out.status != "queued":
            return
        job = db.get(models.PublishingJob, out.job_id)
        if job is None:
            return
        target, lang, owner = out.target, out.lang, job.creator_id
        source, source_lang, job_id = job.source_text or "", job.source_lang, job.id
        out.status = "running"
        db.commit()

    result = _render(target, lang, source, source_lang, owner)

    with SessionLocal() as db:
        # The creator may have deleted the job while it was rendering. The files
        # are then nobody's: remove them instead of keeping what no row names.
        out = db.get(models.PublishingOutput, output_id, populate_existing=True)
        if out is None:
            release(owner, [m["id"] for m in result.get("media", [])])
            return
        out.status = result["status"]
        out.error = result.get("error")
        out.simulated = bool(result.get("simulated"))
        if result["status"] == "ready":
            out.content = result["content"]
            if "media" in result:
                out.media = json.dumps(result["media"])
            out.provenance = result["provenance"]
        settle(db, job_id)
        db.commit()


def _render(target: str, lang: str, source: str, source_lang: str, owner: str) -> dict:
    """Make one output (its text, or its files). Never raises: the answer is the row's new state."""
    if target in derive.TEXT_TARGETS:
        return derive.make_text(target, lang, source, source_lang, owner)

    text, translated = source, lang != source_lang
    if translated:
        done = derive.translate(source, lang, source_lang, owner)
        if done.withheld:
            return {"status": "unsupported", "error": derive.NOT_FOR_MINORS}
        if done.error:
            return {"status": "failed", "error": done.error}
        text = done.text
        if done.simulated or not text:
            # A voice would read "[fr] My market vlog" aloud and a slide would
            # print it. The stand-in AI marks text rather than translating it,
            # which an article can show as such and a recording cannot.
            return {
                "status": "unsupported",
                "error": "needs a real translation provider; the stand-in AI only marks the text",
            }
    try:
        pieces = render.make(target, text, lang)
    except render.RenderError as exc:
        return {"status": "failed", "error": str(exc)[:300]}
    except Exception:
        log.exception("%s render in %s failed", target, lang)
        return {"status": "failed", "error": "The render failed unexpectedly. Try again."}

    # What the files are, in the platform's own terms: a slide arrangement of the
    # creator's words is an edit of them (assisted, if a model translated them); a
    # synthetic voice is a machine's output whatever it was reading.
    if target == "carousel":
        provenance = "ai_assisted" if translated else "edited"
    else:
        provenance = "ai_generated"

    stored: list[dict] = []
    try:
        for piece in pieces:
            stored.append(_store(piece, owner, provenance))
    except Exception as exc:
        log.error("could not store a %s render for %s: %s", target, owner, exc)
        release(owner, [m["id"] for m in stored])
        return {"status": "failed", "error": "The file was made but could not be saved. Try again."}

    return {
        "status": "ready",
        "content": render.narration_of(text),
        "media": stored,
        "provenance": provenance,
    }


def _store(piece: render.Piece, owner: str, provenance: str) -> dict:
    response = httpx.post(
        f"{MEDIA_URL}/internal/media/ingest",
        data={"owner_id": owner, "provenance": provenance, "alt_text": piece.alt},
        files={"file": (piece.filename, piece.data, piece.content_type)},
        timeout=120,
    )
    response.raise_for_status()
    asset = response.json()
    return {
        "id": asset["id"],
        "kind": asset["kind"],
        "content_type": asset["content_type"],
        "alt": piece.alt,
        "width": piece.width,
        "height": piece.height,
        "seconds": piece.seconds,
    }


# --- letting files go -----------------------------------------------------------

SOCIAL_URL = "http://social-service:8000"


def release(owner: str, media_ids: list[str]) -> None:
    """Delete rendered files that no post carries. Best effort, and logged: the
    creator asked for the job to go, and a file left behind is recoverable where
    a delete button that fails is not.

    A file a post took stays: it is that post's now, and removing the job from
    the history must not blank a published post.
    """
    ids = [m for m in dict.fromkeys(media_ids) if m]
    if not ids:
        return
    try:
        response = httpx.post(f"{SOCIAL_URL}/internal/media-in-use", json={"media_ids": ids}, timeout=5)
        response.raise_for_status()
        keep = set(response.json().get("in_use", []))
    except Exception as exc:
        # If we cannot tell, we do not delete: the cost of being wrong is a post
        # without its picture.
        log.error("could not ask which files a post carries; keeping %d: %s", len(ids), exc)
        return
    for media_id in ids:
        if media_id in keep:
            continue
        try:
            httpx.post(
                f"{MEDIA_URL}/internal/media/{media_id}/discard-post-media", json={"owner_id": owner}, timeout=10
            ).raise_for_status()
        except Exception as exc:
            log.warning("could not delete rendered file %s: %s", media_id, exc)
