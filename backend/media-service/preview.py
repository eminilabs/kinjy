"""A display-sized copy of a picture, so a feed does not ship the original.

What this fixes, measured on production on 2026-10-11: 166 stored images, a
median of 375 kB, a mean of 750 kB, the largest 6 MB at 3456x4608 - every one
of them sent whole into a column 560 px wide. A phone on a mobile network pays
for the full camera file to look at a thumbnail, and then pays again for the
next post.

So each picture gets one derivative, built once at upload and kept on the media
volume beside nothing else. Two consequences beyond the size:

- the feed is served from this machine's disk rather than relayed from object
  storage, so the bytes do not cross the internet twice before a member sees
  them;
- the original is still there, untouched, and is what opens in the lightbox and
  what a download gives. Nothing is lost, only deferred.

Not every picture gets one. An animated GIF would lose its animation, and a
file already smaller than the derivative would be made worse by it; both are
left alone and served as they are.
"""
from __future__ import annotations

import logging
from pathlib import Path

log = logging.getLogger("media-service")

# The long edge of the derivative. The feed column is ~560 px and the lightbox
# is capped at the viewport, so 1440 covers a 2x phone screen and a desktop
# card with room to spare - and a picture opened full-screen still looks like a
# photograph rather than an upscale.
MAX_EDGE = 1440

# WebP at this quality is visually indistinguishable from the JPEG it replaces
# at roughly a fifth of the bytes. Every browser this app supports reads it.
QUALITY = 80

# Formats worth deriving from. HEIC never reaches here (refused at upload), and
# SVG is not a raster image.
SOURCES = {"image/jpeg", "image/png", "image/webp"}

PREVIEW_CONTENT_TYPE = "image/webp"
PREVIEW_SUFFIX = ".webp"


def wanted(content_type: str, size_bytes: int) -> bool:
    """Is a derivative worth building for this upload?

    Below the threshold the original is already feed-sized, and a second copy
    would cost storage to save nothing.
    """
    return content_type in SOURCES and size_bytes > 120 * 1024


def build(source: Path, destination: Path) -> int | None:
    """Write the derivative. Returns its size, or None if there is no point.

    Never raises: a picture that Pillow cannot read is still a perfectly good
    upload, and the member should not be told their photo failed because the
    thumbnailer did.
    """
    try:
        from PIL import Image, ImageOps
    except ImportError:  # pragma: no cover - the image always ships Pillow
        log.warning("Pillow is not installed; no preview was built")
        return None

    try:
        with Image.open(source) as image:
            if getattr(image, "is_animated", False):
                return None
            # The camera's rotation lives in EXIF, and EXIF is about to be
            # dropped. Without this an iPhone photo arrives on its side.
            image = ImageOps.exif_transpose(image)
            image.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
            # No EXIF in the copy: it carries GPS coordinates, a device serial
            # and a timestamp, none of which a reader of the feed is owed.
            # RGBA survives, so a PNG with transparency stays transparent.
            image.save(destination, "WEBP", quality=QUALITY, method=4)
    except Exception as exc:  # noqa: BLE001 - any decode failure is the same answer
        log.warning("no preview for %s: %s", source.name, exc)
        destination.unlink(missing_ok=True)
        return None

    size = destination.stat().st_size
    if size >= source.stat().st_size:
        # A picture that was already well compressed. Keeping a larger copy and
        # calling it a preview would be a slow path pretending to be a fast one.
        destination.unlink(missing_ok=True)
        return None
    return size
