# Single Dockerfile shared by every Kaluta FastAPI service.
# Build with:  docker build --build-arg SERVICE=auth-service -f backend/Dockerfile backend
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DEFAULT_TIMEOUT=120

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Dependencies come BEFORE anything service-specific so this layer is built once
# and reused by all 13 services. Declaring ARG/ENV SERVICE above this line would
# give every service a different layer hash and re-run pip 13 times over.
COPY requirements.txt /tmp/requirements.txt
RUN pip install --retries 5 --timeout 120 -r /tmp/requirements.txt

# Rendering tools, for the one service that makes media (creator-service): ffmpeg
# to encode, espeak-ng to speak, Pillow and fonts to draw slides. Behind a build
# arg so the other twelve images stay as small as they were, and placed after
# the pip layer above so their layers are still shared.
ARG MEDIA_TOOLS=0
COPY requirements-media.txt /tmp/requirements-media.txt
RUN if [ "$MEDIA_TOOLS" = "1" ]; then \
        apt-get update && apt-get install -y --no-install-recommends \
            ffmpeg espeak-ng libraqm0 fonts-dejavu-core fonts-wqy-microhei \
        && rm -rf /var/lib/apt/lists/* \
        && pip install --retries 5 --timeout 120 -r /tmp/requirements-media.txt; \
    fi

# Shared library, then the service itself.
COPY common /app/common

ARG SERVICE
ENV SERVICE=${SERVICE}
COPY ${SERVICE} /app

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
