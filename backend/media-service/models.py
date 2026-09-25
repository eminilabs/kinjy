from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from common.database import Base
from common.ids import new_id

SCHEMA = "media"


class Asset(Base):
    """An uploaded file plus its provenance record.

    Provenance is set at upload and travels with every derivative. C2PA content
    credentials go in ``c2pa_manifest`` once signing is wired up (B5); until then
    the label is declared rather than cryptographically proven, and
    ``provenance_signed`` says which of the two it is — so the UI never shows a
    trust badge the platform cannot back.
    """

    __tablename__ = "assets"
    __table_args__ = {"schema": SCHEMA}

    PROVENANCE = ("original", "edited", "ai_assisted", "ai_generated", "verified_source")

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("mda"))
    owner_id: Mapped[str] = mapped_column(String(40), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    storage_path: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(500))
    kind: Mapped[str] = mapped_column(String(20))  # image|video|audio|document

    provenance: Mapped[str] = mapped_column(String(20), default="original")
    provenance_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    c2pa_manifest: Mapped[str | None] = mapped_column(Text)
    derived_from: Mapped[str | None] = mapped_column(String(40), index=True)

    alt_text: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
