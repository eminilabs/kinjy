"""How wide and how tall is this picture, read from its header.

The feed needs a picture's shape before the picture arrives. Without it the
card has no box to reserve, so it opens at a placeholder height and then jumps
when the image lands - and the single-image layout, which clamps a photo to
4:5 or 1.91:1, has nothing to clamp. The client can measure the file itself
once it has downloaded it, but that is after the jump and it is not recorded,
so every reader pays for it again.

So the size is taken at upload, from the bytes the service already has in hand.

Header parsing rather than a decoder. Pillow would read every format and more,
but it is a large dependency whose job is to *decode* untrusted pixels, which
is the part with the history of memory-safety bugs. Nothing here decodes
anything: each reader walks a few fields of a header and returns two integers,
so a malicious file gets no more of a target than a wrong answer. The formats
are exactly the four the upload endpoint accepts.

Every reader returns None rather than raising when the bytes do not parse. A
picture whose size cannot be read is still a perfectly good picture; it simply
falls back to being measured in the browser, which is where it was before.
"""
from __future__ import annotations

import struct

# A JPEG's size lives in a frame header that follows an arbitrary run of other
# segments - comments, EXIF, colour profiles - and EXIF thumbnails alone can be
# tens of kilobytes. 64KB reaches the frame header on ordinary camera and phone
# files; beyond that the picture is simply measured in the browser instead.
HEAD_BYTES = 64 * 1024

# Nothing sane is outside this, and it keeps a corrupt header from being stored
# as a shape the layout would then try to honour.
_MAX_DIMENSION = 100_000


def _png(head: bytes) -> tuple[int, int] | None:
    # IHDR is always the first chunk: 8 bytes of signature, 4 of length, 4 of
    # type, then width and height as big-endian 32-bit integers.
    if len(head) < 24 or head[12:16] != b"IHDR":
        return None
    width, height = struct.unpack(">II", head[16:24])
    return width, height


def _gif(head: bytes) -> tuple[int, int] | None:
    # Logical screen width and height, little-endian 16-bit, right after the
    # 6-byte signature.
    if len(head) < 10:
        return None
    width, height = struct.unpack("<HH", head[6:10])
    return width, height


def _webp(head: bytes) -> tuple[int, int] | None:
    # Three encodings under one RIFF container, each storing the size
    # differently. VP8X carries a canvas size that overrides the frame's, so it
    # is checked first.
    if len(head) < 30:
        return None
    fourcc = head[12:16]
    if fourcc == b"VP8X":
        # 24-bit little-endian, stored as one less than the real value.
        width = int.from_bytes(head[24:27], "little") + 1
        height = int.from_bytes(head[27:30], "little") + 1
        return width, height
    if fourcc == b"VP8 ":
        # Lossy: a 3-byte start code, then 14 bits of each dimension.
        if head[23:26] != b"\x9d\x01\x2a":
            return None
        width, height = struct.unpack("<HH", head[26:30])
        return width & 0x3FFF, height & 0x3FFF
    if fourcc == b"VP8L":
        # Lossless: a signature byte, then 14 bits of width and 14 of height
        # packed across the next four, each stored as one less than the real
        # value.
        if head[20] != 0x2F:
            return None
        bits = int.from_bytes(head[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    return None


# The frame headers that carry a size. SOF0/1/2/3 and the rest are ordinary
# frames; DHT, DAC and the restart markers are not frames and must not be read
# as one, which is what the gaps in this range are.
_JPEG_SOF = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}


def _jpeg(head: bytes) -> tuple[int, int] | None:
    # Walk the segment chain to the first frame header. Each segment is a 0xFF
    # marker byte, a type, then a 16-bit length that counts itself.
    i = 2
    end = len(head)
    while i + 9 < end:
        if head[i] != 0xFF:
            # Not on a marker boundary: the chain is broken or padded. Skipping
            # forward would be guessing, so stop.
            return None
        marker = head[i + 1]
        # Padding: any number of 0xFF bytes may precede a marker.
        if marker == 0xFF:
            i += 1
            continue
        if marker in _JPEG_SOF:
            # Length, precision, then height and width - height first.
            height, width = struct.unpack(">HH", head[i + 5 : i + 9])
            return width, height
        length = struct.unpack(">H", head[i + 2 : i + 4])[0]
        if length < 2:
            return None
        i += 2 + length
    return None


_READERS = {
    "image/jpeg": _jpeg,
    "image/png": _png,
    "image/gif": _gif,
    "image/webp": _webp,
}


def readable(content_type: str) -> bool:
    return content_type in _READERS


def read(content_type: str, head: bytes) -> tuple[int, int] | None:
    """The picture's (width, height), or None when it cannot be read.

    ``head`` is the start of the file - ``HEAD_BYTES`` is enough for every
    format here. Never raises: a header that does not parse returns None.
    """
    reader = _READERS.get(content_type)
    if reader is None:
        return None
    try:
        size = reader(head)
    except (struct.error, IndexError, ValueError):
        return None
    if size is None:
        return None
    width, height = size
    if not (0 < width <= _MAX_DIMENSION and 0 < height <= _MAX_DIMENSION):
        return None
    return width, height
