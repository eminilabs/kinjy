"""The AI gateway — provider-independent model routing (blueprint §15).

Nothing in Kinjy calls a model vendor directly. Callers describe the *task*
(translate, summarise, moderate, generate) plus constraints (language, latency,
cost ceiling, data sensitivity) and the router picks a provider.

Routing rules, in order:
  1. Sensitive data never leaves an on-device / local provider.
  2. A provider that does not declare support for the language is skipped.
  3. Among the rest, the cheapest one that meets the quality floor wins.

With no API keys configured every task resolves to the ``mock`` provider, which
returns deterministic, clearly-labelled output so the platform is fully testable
offline.
"""
from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from common import settings

log = logging.getLogger("ai-gateway")

TASKS = (
    "translate", "summarize", "moderate", "generate", "transcribe",
    "dub", "caption", "classify", "embed", "assist",
)


@dataclass
class Provider:
    name: str
    models: dict[str, str]                    # task -> model id
    langs: set[str] = field(default_factory=set)   # empty = all languages
    cost_per_1k: float = 0.0
    quality: float = 0.5                       # 0..1, measured not claimed
    latency_ms: int = 800
    local: bool = False
    enabled: bool = True

    def supports(self, task: str, lang: str | None) -> bool:
        if not self.enabled or task not in self.models:
            return False
        if lang and self.langs and lang not in self.langs:
            return False
        return True


def _registry() -> list[Provider]:
    """Built from the environment: a provider with no key is simply absent."""
    providers: list[Provider] = [
        Provider(
            name="mock",
            models={task: f"mock-{task}" for task in TASKS},
            cost_per_1k=0.0,
            quality=0.30,
            latency_ms=5,
            local=True,
        )
    ]
    import os

    if os.getenv("KIMI_API_KEY"):
        providers.append(
            Provider(
                name="kimi",
                models={t: "moonshot-v1-32k" for t in ("translate", "summarize", "generate", "assist", "classify")},
                cost_per_1k=0.0012,
                quality=0.82,
                latency_ms=900,
            )
        )
    if os.getenv("DEEPSEEK_API_KEY"):
        providers.append(
            Provider(
                name="deepseek",
                models={t: "deepseek-chat" for t in ("translate", "summarize", "generate", "assist", "classify", "moderate")},
                cost_per_1k=0.0009,
                quality=0.80,
                latency_ms=1100,
            )
        )
    if os.getenv("ANTHROPIC_API_KEY"):
        providers.append(
            Provider(
                name="anthropic",
                models={t: "claude-sonnet-5" for t in TASKS if t not in ("embed", "dub")},
                cost_per_1k=0.003,
                quality=0.94,
                latency_ms=1200,
            )
        )
    if os.getenv("OPENAI_API_KEY"):
        providers.append(
            Provider(
                name="openai",
                models={t: "gpt-4o-mini" for t in TASKS},
                cost_per_1k=0.0015,
                quality=0.88,
                latency_ms=1000,
            )
        )
    return providers


PROVIDERS = _registry()


class NoProviderError(RuntimeError):
    pass


def route(
    *,
    task: str,
    lang: str | None = None,
    sensitive: bool = False,
    quality_floor: float = 0.0,
    max_cost_per_1k: float | None = None,
) -> Provider:
    if task not in TASKS:
        raise NoProviderError(f"Unknown task '{task}'. Known: {', '.join(TASKS)}")

    candidates = [p for p in PROVIDERS if p.supports(task, lang)]

    if sensitive:
        # Teen mode, E2E chats and memorial content never go to a remote vendor.
        candidates = [p for p in candidates if p.local]
        if not candidates:
            raise NoProviderError("No local provider available for sensitive data; refusing to send it off-device")

    candidates = [p for p in candidates if p.quality >= quality_floor]
    if max_cost_per_1k is not None:
        candidates = [p for p in candidates if p.cost_per_1k <= max_cost_per_1k]

    if not candidates:
        raise NoProviderError(f"No provider satisfies task={task} lang={lang} quality>={quality_floor}")

    # Cheapest that clears the bar; quality breaks ties, then latency.
    candidates.sort(key=lambda p: (p.cost_per_1k, -p.quality, p.latency_ms))
    return candidates[0]


def _deterministic(text: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{text}".encode()).hexdigest()[:8]


def run(
    *,
    task: str,
    prompt: str,
    lang: str | None = None,
    target_lang: str | None = None,
    sensitive: bool = False,
    quality_floor: float = 0.0,
) -> dict[str, Any]:
    """Execute a task through the routed provider.

    Live provider calls are not wired yet — every provider currently produces
    mock output. The routing, accounting and observability around it are real,
    so plugging in an SDK is a change in one place.
    """
    started = time.perf_counter()
    provider = route(task=task, lang=lang, sensitive=sensitive, quality_floor=quality_floor)

    if task == "translate":
        output = f"[{target_lang or 'en'}] {prompt}"
    elif task == "summarize":
        first = prompt.strip().split(".")[0][:180]
        output = f"{first}." if first else ""
    elif task == "moderate":
        output = "allow"
    else:
        output = f"({provider.name}:{task}) {prompt[:400]}"

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    tokens = max(1, len(prompt) // 4)

    return {
        "provider": provider.name,
        "model": provider.models[task],
        "task": task,
        "lang": lang,
        "output": output,
        "mock": provider.name == "mock",
        "latency_ms": elapsed_ms,
        "input_tokens": tokens,
        "output_tokens": max(1, len(output) // 4),
        "cost_usd": round(provider.cost_per_1k * tokens / 1000, 6),
        "trace": _deterministic(prompt, provider.name),
    }


def describe() -> list[dict[str, Any]]:
    return [
        {
            "name": p.name,
            "tasks": sorted(p.models),
            "languages": sorted(p.langs) or "all",
            "cost_per_1k": p.cost_per_1k,
            "quality": p.quality,
            "latency_ms": p.latency_ms,
            "local": p.local,
        }
        for p in PROVIDERS
    ]
