"""The Studio's media pipeline: slides, a voice, a video.

What it makes, from the one piece of writing a creator handed the engine:

* **carousel** - the text cut into slides, each a PNG.
* **audio** - the text read aloud, one MP3.
* **short_video / long_video** - the same slides, the same voice, an MP4: each
  slide is on screen exactly as long as it takes to read it, so the words on the
  screen are the words being said.

What it does not do, so nobody mistakes it for more: it does not write, it does
not dub, and it does not edit footage. The voice is espeak-ng - a synthetic one,
understandable and plainly a machine - because it runs on this server with no
account and no key. Everything below is arranged so a better voice (a neural
model, a cloud service) replaces :func:`speak` and nothing else.

The creator's words are never altered, except that a slide leaves out what the
font cannot draw (emoji) and the voice leaves out web addresses.

Every limit here refuses rather than truncates. A video that silently stopped at
its ninetieth second would be a different text published under the creator's name.
"""
from __future__ import annotations

import functools
import io
import logging
import re
import shutil
import subprocess
import tempfile
import time
import wave
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("creator-service.render")

try:  # Present only in images built with MEDIA_TOOLS=1.
    from PIL import Image, ImageDraw, ImageFont, features as pil_features
except ImportError:  # pragma: no cover - exercised by the formats readout
    Image = ImageDraw = ImageFont = pil_features = None


class RenderError(Exception):
    """A render that cannot be made, with a reason the creator can read."""


# --- what this server can make -----------------------------------------------

FONT_LATIN = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_LATIN_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_CJK = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"

# One voice per language the platform supports (common.settings.SUPPORTED_LANGS).
VOICES = {"en": "en-us", "sw": "sw", "fr": "fr", "ar": "ar", "zh": "cmn"}

MEDIA_TARGETS = ("carousel", "audio", "short_video", "long_video")

# Seconds of narration a format holds. A refusal, not a cut: see the module note.
MAX_SECONDS = {"audio": 25 * 60, "short_video": 90, "long_video": 10 * 60}
MAX_CAROUSEL_SLIDES = 20

# A render is background work with a hard stop: nothing a creator types should be
# able to keep a worker for longer than this.
SPEAK_TIMEOUT = 30
ENCODE_TIMEOUT = 300

PAUSE_BETWEEN_SLIDES = 0.5   # seconds of silence after each slide's narration
MIN_SLIDE_SECONDS = 2.0      # a slide with next to nothing to say still gets read


@functools.lru_cache(maxsize=1)
def _missing() -> dict[str, str]:
    """What is not installed, keyed by the tool, with the words to say so."""
    out: dict[str, str] = {}
    if Image is None or not Path(FONT_LATIN).exists():
        out["slides"] = "this server cannot draw slides (Pillow or its fonts are not installed)"
    if shutil.which("espeak-ng") is None:
        out["voice"] = "this server has no text-to-speech voice installed"
    if shutil.which("ffmpeg") is None:
        out["encoder"] = "this server has no video encoder installed"
    return out


def unavailable(target: str) -> str | None:
    """Why ``target`` cannot be made here, or ``None`` when it can.

    Asked of the machine, not of a list: an image built without the tools - a
    developer's old one, a deploy that missed the build arg - then says so on the
    Studio's screen instead of accepting a job it can only fail.
    """
    missing = _missing()
    needs = {
        "carousel": ("slides",),
        "audio": ("voice", "encoder"),
        "short_video": ("slides", "voice", "encoder"),
        "long_video": ("slides", "voice", "encoder"),
    }.get(target)
    if needs is None:
        return None
    for tool in needs:
        if tool in missing:
            return missing[tool]
    return None


# --- cutting the text into slides ---------------------------------------------

_CJK = "぀-ヿ㐀-鿿가-힯＀-￯"
_CJK_CHAR = re.compile(f"[{_CJK}]")
_SENTENCE_BREAK = re.compile(r"(?<=[.!?…؟])\s+|(?<=[。！？])")
_URL = re.compile(r"https?://\S+|www\.\S+", re.I)
# Emoji, pictographs and the joiners between them: DejaVu has no glyph for them
# and would draw an empty box in their place.
_UNDRAWABLE = re.compile("[\U0001F000-\U0001FFFF☀-➿⬀-⯿︀-️‍⃣]")
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _weight(text: str) -> int:
    """How much room text takes: a Chinese character is about two Latin ones."""
    return sum(2 if _CJK_CHAR.match(c) else 1 for c in text)


def _hard_split(text: str, limit: int) -> list[str]:
    """Break text that is longer than a slide, at a space where there is one."""
    pieces: list[str] = []
    while _weight(text) > limit:
        used = 0
        end = last_space = 0
        for index, char in enumerate(text):
            used += 2 if _CJK_CHAR.match(char) else 1
            if used > limit:
                break
            end = index + 1
            if char == " ":
                last_space = index
        at = last_space or end
        pieces.append(text[:at].strip())
        text = text[at:].strip()
    if text:
        pieces.append(text)
    return pieces


def _pack(parts: list[str], limit: int) -> list[str]:
    """Sentences gathered into as few slides as stay under the limit."""
    chunks: list[str] = []
    current = ""
    for part in parts:
        for piece in _hard_split(part, limit):
            if current and _weight(current) + 1 + _weight(piece) > limit:
                chunks.append(current)
                current = piece
            else:
                joiner = "" if not current or _CJK_CHAR.match(current[-1]) else " "
                current = f"{current}{joiner}{piece}"
    if current:
        chunks.append(current)
    return chunks


@dataclass(frozen=True)
class Slide:
    text: str
    cover: bool = False


def split_slides(text: str, limit: int) -> list[Slide]:
    """One slide per line the creator wrote, the first line the cover.

    A line longer than a slide holds is cut at sentence ends (and at spaces
    when a single sentence is still too long). Nothing is dropped and nothing
    is merged: a paragraph is one idea, and the creator decides where they end.
    """
    lines = [_CONTROL.sub("", line).strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    slides: list[Slide] = []
    for index, line in enumerate(lines):
        parts = [p.strip() for p in _SENTENCE_BREAK.split(line) if p and p.strip()]
        for n, chunk in enumerate(_pack(parts, limit)):
            slides.append(Slide(chunk, cover=index == 0 and n == 0))
    return slides


# --- drawing -------------------------------------------------------------------

# The app's own palette (ink and gold, from the dark theme), so a slide looks
# like it came from the same place as the screen it is made on.
INK = (11, 14, 29)
GOLD = (217, 166, 72)
TEXT_HI = (244, 242, 238)
TEXT_MID = (167, 172, 191)


@dataclass(frozen=True)
class Layout:
    size: tuple[int, int]
    budget: int          # most weight of text one slide holds
    body: int            # largest body font, px
    cover: int           # largest cover font, px
    smallest: int        # the font never shrinks below this; the text is split instead


CAROUSEL = Layout((1080, 1350), budget=320, body=60, cover=84, smallest=36)
VERTICAL = Layout((720, 1280), budget=240, body=52, cover=68, smallest=30)
LANDSCAPE = Layout((1280, 720), budget=200, body=52, cover=68, smallest=30)


def _raqm() -> bool:
    return bool(pil_features and pil_features.check("raqm"))


def _font(lang: str, size: int, bold: bool):
    if lang == "zh":
        path = FONT_CJK
    else:
        path = FONT_LATIN_BOLD if bold else FONT_LATIN
    engine = ImageFont.Layout.RAQM if _raqm() else ImageFont.Layout.BASIC
    return ImageFont.truetype(path, size, layout_engine=engine)


def _tokens(line: str) -> list[str]:
    """Words and spaces, with every CJK character a token of its own: Chinese has
    no spaces to break at."""
    return re.findall(rf"\s+|[{_CJK}]|[^\s{_CJK}]+", line)


def _wrap(text: str, font, width: int, rtl: bool, lang: str) -> list[str]:
    def length(s: str) -> float:
        return font.getlength(s, direction="rtl", language=lang) if rtl else font.getlength(s)

    lines: list[str] = []
    for paragraph in text.split("\n"):
        current = ""
        for token in _tokens(paragraph):
            candidate = current + token
            if length(candidate.strip()) <= width:
                current = candidate
                continue
            if current.strip():
                lines.append(current.strip())
                current = token.lstrip()
            else:
                current = token.lstrip()
            # One token wider than the slide (a long web address): break it by
            # character rather than let it run off the edge.
            while length(current) > width and len(current) > 1:
                cut = len(current) - 1
                while cut > 1 and length(current[:cut]) > width:
                    cut -= 1
                lines.append(current[:cut])
                current = current[cut:]
        if current.strip():
            lines.append(current.strip())
    return lines


def render_slide(slide: Slide, number: int, total: int, lang: str, layout: Layout) -> bytes:
    """One slide as PNG bytes. Raises RenderError when the text cannot be drawn."""
    rtl = lang == "ar"
    if rtl and not _raqm():
        # Unshaped Arabic is a row of disconnected letters: wrong, and wrong in
        # a way an Arabic reader sees at once. Better to say no.
        raise RenderError("Arabic slides need a text-shaping library this server does not have")

    width, height = layout.size
    margin = round(width * 0.09)
    box_w = width - 2 * margin
    top = round(height * 0.1)
    bottom = height - round(height * 0.1)
    box_h = bottom - top

    text = _UNDRAWABLE.sub("", slide.text).strip()
    if not text:
        text = "·"  # a slide of only emoji still has to be a slide

    start = layout.cover if slide.cover else layout.body
    lines: list[str] = []
    font = None
    line_h = 0
    for size in range(start, layout.smallest - 1, -4):
        font = _font(lang, size, bold=slide.cover)
        line_h = round(size * 1.38)
        lines = _wrap(text, font, box_w, rtl, lang)
        if len(lines) * line_h <= box_h:
            break
    else:
        raise RenderError("A paragraph is too long to fit on a slide")

    image = Image.new("RGB", layout.size, INK)
    draw = ImageDraw.Draw(image)
    anchor = "ra" if rtl else "la"
    x = width - margin if rtl else margin
    block = len(lines) * line_h
    y = top + (box_h - block) // 2

    # The gold rule above the text: the one mark every slide shares.
    bar_x = width - margin - 96 if rtl else margin
    draw.rectangle((bar_x, y - 44, bar_x + 96, y - 38), fill=GOLD)
    for line in lines:
        kwargs = {"direction": "rtl", "language": lang} if rtl else {}
        draw.text((x, y), line, font=font, fill=TEXT_HI, anchor=anchor, **kwargs)
        y += line_h

    if total > 1:
        small = _font(lang, max(24, round(min(width, height) * 0.03)), bold=False)
        # On the baseline, a fixed distance above the edge: a descender or a short
        # frame (landscape is only 720 tall) must not push it off the slide.
        draw.text((x, height - round(height * 0.055)), f"{number} / {total}", font=small, fill=TEXT_MID, anchor=anchor[0] + "s")

    out = io.BytesIO()
    image.save(out, format="PNG", optimize=True)
    return out.getvalue()


# --- the voice -----------------------------------------------------------------

def _speakable(text: str) -> str:
    """What the voice is given: the words, without web addresses or pictographs
    it would either spell out letter by letter or skip with a stumble."""
    text = _URL.sub(" ", text)
    text = _UNDRAWABLE.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def speak(text: str, lang: str) -> bytes:
    """Text to WAV bytes, in the language's voice. Empty text is silence.

    The only function that knows which engine is talking. Swap it and the rest
    of the pipeline - slide timing, the audio track, the video - is unchanged.
    """
    said = _speakable(text)
    if not said:
        return _silence(MIN_SLIDE_SECONDS)
    voice = VOICES.get(lang)
    if voice is None:
        raise RenderError(f"There is no voice for '{lang}'")
    with tempfile.TemporaryDirectory(prefix="speak-") as tmp:
        target = Path(tmp) / "voice.wav"
        try:
            run = subprocess.run(
                ["espeak-ng", "-v", voice, "-s", "155", "-w", str(target), "--stdin"],
                input=said.encode("utf-8"),
                capture_output=True,
                timeout=SPEAK_TIMEOUT,
            )
        except subprocess.TimeoutExpired as exc:
            raise RenderError("The voice took too long to read this") from exc
        if run.returncode != 0 or not target.exists() or target.stat().st_size < 64:
            raise RenderError("The voice could not read this text")
        return target.read_bytes()


_RATE = 22050  # espeak-ng's native rate; silence is made to match it


def _silence(seconds: float, rate: int = _RATE) -> bytes:
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * round(seconds * rate))
    return out.getvalue()


def _seconds(wav: bytes) -> float:
    with wave.open(io.BytesIO(wav)) as w:
        return w.getnframes() / float(w.getframerate())


def _padded(wav: bytes, minimum: float = MIN_SLIDE_SECONDS) -> tuple[bytes, float]:
    """A narration with its pause, and never shorter than ``minimum`` (a slide
    stays up long enough to be seen; a recording has no such need).
    Returns the WAV and its length in seconds."""
    with wave.open(io.BytesIO(wav)) as w:
        params = w.getparams()
        frames = w.readframes(w.getnframes())
    seconds = params.nframes / float(params.framerate)
    extra = max(PAUSE_BETWEEN_SLIDES, minimum - seconds)
    frames += b"\x00" * (params.sampwidth * params.nchannels * round(extra * params.framerate))
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setparams(params._replace(nframes=0))
        w.writeframes(frames)
    return out.getvalue(), seconds + extra


def _join(wavs: list[bytes]) -> bytes:
    with wave.open(io.BytesIO(wavs[0])) as first:
        params = first.getparams()
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setparams(params._replace(nframes=0))
        for wav in wavs:
            with wave.open(io.BytesIO(wav)) as part:
                w.writeframes(part.readframes(part.getnframes()))
    return out.getvalue()


def _ffmpeg(args: list[str], what: str) -> None:
    try:
        run = subprocess.run(
            ["ffmpeg", "-nostdin", "-y", "-loglevel", "error", *args],
            capture_output=True,
            timeout=ENCODE_TIMEOUT,
        )
    except subprocess.TimeoutExpired as exc:
        raise RenderError(f"The {what} took too long to encode") from exc
    if run.returncode != 0:
        # The encoder's own message is for the log, not for a creator.
        log.error("ffmpeg (%s) failed: %s", what, run.stderr.decode("utf-8", "replace")[-600:])
        raise RenderError(f"The {what} could not be encoded")


# --- the three formats ---------------------------------------------------------

@dataclass(frozen=True)
class Piece:
    """One file a render made."""

    filename: str
    content_type: str
    data: bytes
    alt: str
    # What a player needs to frame it before it loads (the shorts reel tells a
    # portrait clip from a landscape one by these).
    width: int | None = None
    height: int | None = None
    seconds: float | None = None


def _minutes(seconds: float) -> str:
    return f"{round(seconds)} seconds" if seconds < 120 else f"{seconds / 60:.1f} minutes"


def _too_long(target: str, seconds: float) -> RenderError:
    label = {"audio": "audio", "short_video": "short video", "long_video": "long video"}[target]
    cap = MAX_SECONDS[target]
    hint = " Try the long video, or shorten the text." if target == "short_video" else " Shorten the text."
    return RenderError(f"This would run {_minutes(seconds)}; a {label} holds up to {_minutes(cap)}.{hint}")


def carousel(text: str, lang: str) -> list[Piece]:
    slides = split_slides(text, CAROUSEL.budget)
    if not slides:
        raise RenderError("There is nothing to put on a slide")
    if len(slides) > MAX_CAROUSEL_SLIDES:
        raise RenderError(
            f"This makes {len(slides)} slides; a carousel holds up to {MAX_CAROUSEL_SLIDES}. Shorten the text."
        )
    return [
        Piece(
            f"slide-{n}.png", "image/png", render_slide(s, n, len(slides), lang, CAROUSEL), s.text[:500],
            width=CAROUSEL.size[0], height=CAROUSEL.size[1],
        )
        for n, s in enumerate(slides, start=1)
    ]


def audio(text: str, lang: str) -> list[Piece]:
    lines = [_CONTROL.sub("", line).strip() for line in text.splitlines()]
    # A line that is only emoji or a web address has nothing to say aloud: it is
    # left out of a recording, where on a slide it would still be a slide.
    parts = [speak(line, lang) for line in lines if _speakable(line)]
    if not parts:
        raise RenderError("There is nothing to read aloud in this text")
    padded = [_padded(p, minimum=0) for p in parts]
    total = sum(seconds for _, seconds in padded)
    if total > MAX_SECONDS["audio"]:
        raise _too_long("audio", total)
    with tempfile.TemporaryDirectory(prefix="audio-") as tmp:
        wav, mp3 = Path(tmp) / "all.wav", Path(tmp) / "all.mp3"
        wav.write_bytes(_join([w for w, _ in padded]))
        _ffmpeg(["-i", str(wav), "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "64k", str(mp3)], "audio")
        return [Piece("narration.mp3", "audio/mpeg", mp3.read_bytes(), "", seconds=round(total, 1))]


def video(text: str, lang: str, *, vertical: bool) -> list[Piece]:
    target = "short_video" if vertical else "long_video"
    layout = VERTICAL if vertical else LANDSCAPE
    slides = split_slides(text, layout.budget)
    if not slides:
        raise RenderError("There is nothing to put on screen")

    # The voice first: it is cheap, and it is what tells us whether the video is
    # too long - before any frame is drawn or any encoder started.
    voiced = [_padded(speak(s.text, lang)) for s in slides]
    total = sum(seconds for _, seconds in voiced)
    if total > MAX_SECONDS[target]:
        raise _too_long(target, total)

    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="video-") as tmp:
        folder = Path(tmp)
        frames = []
        for n, (slide, (_, seconds)) in enumerate(zip(slides, voiced), start=1):
            path = folder / f"slide-{n}.png"
            path.write_bytes(render_slide(slide, n, len(slides), lang, layout))
            frames.append(f"file '{path.name}'\nduration {seconds:.3f}")
        # The concat demuxer ignores the last duration unless the file is named
        # again after it.
        frames.append(f"file 'slide-{len(slides)}.png'")
        (folder / "frames.txt").write_text("\n".join(frames) + "\n")
        (folder / "voice.wav").write_bytes(_join([w for w, _ in voiced]))
        out = folder / "out.mp4"
        # One encode, not one per slide glued together: the picture's timeline is
        # the sum of the same lengths the voice was padded to, so they cannot drift.
        _ffmpeg(
            [
                "-f", "concat", "-safe", "0", "-i", str(folder / "frames.txt"),
                "-i", str(folder / "voice.wav"),
                "-vf", "fps=24,format=yuv420p",
                "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "26",
                "-c:a", "aac", "-b:a", "96k", "-ac", "1",
                "-shortest", "-movflags", "+faststart",
                str(out),
            ],
            "video",
        )
        data = out.read_bytes()
    log.info("%s: %d slides, %.0fs of video, encoded in %.1fs", target, len(slides), total, time.monotonic() - started)
    return [Piece("video.mp4", "video/mp4", data, "", width=layout.size[0], height=layout.size[1], seconds=round(total, 1))]


def make(target: str, text: str, lang: str) -> list[Piece]:
    """Render one media target. Raises :class:`RenderError`, always with a reason."""
    reason = unavailable(target)
    if reason:
        raise RenderError(reason)
    if lang not in VOICES:
        raise RenderError(f"'{lang}' is not a language the renderer supports")
    if target == "carousel":
        return carousel(text, lang)
    if target == "audio":
        return audio(text, lang)
    if target == "short_video":
        return video(text, lang, vertical=True)
    if target == "long_video":
        return video(text, lang, vertical=False)
    raise RenderError(f"'{target}' is not a media format")


def narration_of(text: str) -> str:
    """The words a media output carries, for the post that will go with it: one
    paragraph per line the creator wrote."""
    return "\n\n".join(line.strip() for line in text.splitlines() if line.strip())
