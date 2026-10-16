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

**A real provider exists only if all three are true:** its key is set, an adapter
that really calls it is registered in ``ADAPTERS``, and ``AI_LIVE_ENABLED`` is on.
And it declares only the tasks its adapter implements. This is deliberate. The
gateway used to register any vendor whose key was set and then answer every task
with made-up text under that vendor's name - so a key alone would have removed the
"Simulated" label from output that was still invented. Making that impossible in
the structure, rather than careful in the code, is the point of this module's shape.
"""
from __future__ import annotations

import hashlib
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol

from ai_errors import ProviderError  # noqa: F401  (re-exported: callers say gateway.ProviderError)
from common import settings

log = logging.getLogger("ai-gateway")

TASKS = (
    "translate", "summarize", "moderate", "generate", "transcribe",
    "dub", "caption", "classify", "embed", "assist",
)


class Adapter(Protocol):
    """What it takes to be a real provider: a way to really ask it.

    ``tasks`` is the set of tasks this adapter has been written *and tested* for.
    ``run`` returns ``{"output": str, "input_tokens": int, "output_tokens": int}``
    - the token counts as the provider reported them, not estimated - and raises
    :class:`ProviderError` for anything that went wrong, with a message that is
    safe to show (never a request, a header or a key).
    """

    tasks: frozenset[str]

    def run(
        self, *, task: str, prompt: str, lang: str | None, target_lang: str | None, model: str
    ) -> dict[str, Any]: ...


# Provider name -> its adapter. Empty until one is written: an adapter is added
# here, in the same change that adds the vendor's entry in VENDORS and its tests.
ADAPTERS: dict[str, Adapter] = {}


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


# The vendors we know how to describe. Being listed here is not being usable:
# see build_registry.
VENDORS = [
    # IleAI: a router in front of several model vendors. Translation only, through
    # its /v1/translate (DeepL behind it) - see ileai_adapter.py. The rate is the
    # gateway's blended per-1K-tokens figure, derived from DeepL's published ~$25 per
    # million characters; IleAI's own page quotes a price about a thousand times
    # lower, which is not believed. The invoice that counts is IleAI's. The quality
    # is a placeholder until it has been measured on our texts.
    {"name": "ileai", "key": "ILEAI_API_KEY", "model": "ileai-translate",
     "tasks": ("translate",), "cost_per_1k": 0.05, "quality": 0.85, "latency_ms": 1500},
    {"name": "kimi", "key": "KIMI_API_KEY", "model": "moonshot-v1-32k",
     "tasks": ("translate", "summarize", "generate", "assist", "classify"),
     "cost_per_1k": 0.0012, "quality": 0.82, "latency_ms": 900},
    {"name": "deepseek", "key": "DEEPSEEK_API_KEY", "model": "deepseek-chat",
     "tasks": ("translate", "summarize", "generate", "assist", "classify", "moderate"),
     "cost_per_1k": 0.0009, "quality": 0.80, "latency_ms": 1100},
    {"name": "anthropic", "key": "ANTHROPIC_API_KEY", "model": "claude-sonnet-5",
     "tasks": tuple(t for t in TASKS if t not in ("embed", "dub")),
     "cost_per_1k": 0.003, "quality": 0.94, "latency_ms": 1200},
    {"name": "openai", "key": "OPENAI_API_KEY", "model": "gpt-4o-mini",
     "tasks": TASKS, "cost_per_1k": 0.0015, "quality": 0.88, "latency_ms": 1000},
]


def build_registry(
    environ: Mapping[str, str], adapters: Mapping[str, Adapter], live_enabled: bool, *, warn: bool = True
) -> list[Provider]:
    """The providers a task may be routed to.

    The mock is always there. A real one is there only when its key is set, an
    adapter for it exists, and live providers are switched on - and it then
    declares the tasks its *adapter* implements, not everything the vendor could
    do. A task nobody wrote the code for stays with the mock, honestly labelled,
    rather than being answered with invented text under a real name.

    Nothing here ever logs or returns a key: presence is all that is read.
    """
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
    for vendor in VENDORS:
        if not environ.get(vendor["key"]):
            continue
        adapter = adapters.get(vendor["name"])
        if adapter is None:
            if warn:
                log.warning(
                    "%s: a key is set but no adapter for it exists, so it is ignored (nothing is sent to it)",
                    vendor["name"],
                )
            continue
        if not live_enabled:
            if warn:
                log.warning("%s: a key and an adapter exist, but AI_LIVE_ENABLED is off, so it is not used", vendor["name"])
            continue
        tasks = [t for t in vendor["tasks"] if t in adapter.tasks]
        if not tasks:
            continue
        providers.append(
            Provider(
                name=vendor["name"],
                models={t: vendor["model"] for t in tasks},
                cost_per_1k=vendor["cost_per_1k"],
                quality=vendor["quality"],
                latency_ms=vendor["latency_ms"],
            )
        )
    return providers


# Built once at import, quietly: no adapter has registered itself yet, so a warning here
# would claim "no adapter exists" about one that is about to be. register_adapter rebuilds
# it, and that is the build that speaks.
PROVIDERS = build_registry(os.environ, ADAPTERS, settings.AI_LIVE_ENABLED, warn=False)


def register_adapter(name: str, adapter: Adapter) -> None:
    """Make an adapter available and rebuild the registry with it.

    Adapters are registered by the service that owns them (ai-service/main.py)
    rather than imported here, so this module stays importable on its own.
    """
    global PROVIDERS
    ADAPTERS[name] = adapter
    PROVIDERS = build_registry(os.environ, ADAPTERS, settings.AI_LIVE_ENABLED)


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

    # A real provider that can do this beats the stand-in. The mock costs nothing,
    # so "cheapest wins" below would otherwise pick it for ever and a configured
    # provider would never be used.
    real = [p for p in candidates if p.name != "mock"]
    if real:
        candidates = real

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

    Made-up output comes from the mock and only the mock: for a real provider the
    answer is the adapter's, and if there is no adapter the task is refused
    instead of being fabricated under the provider's name. ``mock`` in the result
    is therefore true exactly when the text was invented.
    """
    started = time.perf_counter()
    provider = route(task=task, lang=lang, sensitive=sensitive, quality_floor=quality_floor)

    model_used = provider.models[task]
    reported_cost = None
    if provider.name == "mock":
        if task == "translate":
            output = f"[{target_lang or 'en'}] {prompt}"
        elif task == "summarize":
            first = prompt.strip().split(".")[0][:180]
            output = f"{first}." if first else ""
        elif task == "moderate":
            output = "allow"
        else:
            output = f"({provider.name}:{task}) {prompt[:400]}"
        input_tokens = max(1, len(prompt) // 4)
        output_tokens = max(1, len(output) // 4)
    else:
        adapter = ADAPTERS.get(provider.name)
        if adapter is None or task not in adapter.tasks:
            raise NoProviderError(f"{provider.name} has no adapter for '{task}'")
        try:
            answer = adapter.run(
                task=task, prompt=prompt, lang=lang, target_lang=target_lang, model=provider.models[task]
            )
        except ProviderError as exc:
            exc.provider = provider.name  # so the failure is recorded against the right provider
            raise
        output = answer["output"]
        input_tokens, output_tokens = int(answer["input_tokens"]), int(answer["output_tokens"])
        reported_cost = answer.get("cost_usd")  # what the provider bills, when the adapter knows it
        # The model that really answered, when the provider says (a router can pick).
        model_used = str(answer.get("model") or provider.models[task])[:80]

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        "provider": provider.name,
        "model": model_used,
        "task": task,
        "lang": lang,
        "output": output,
        "mock": provider.name == "mock",
        "latency_ms": elapsed_ms,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "chars": len(prompt),
        # The adapter's figure when it has one (the provider's own price list, applied to the real
        # token counts); otherwise a blended rate declared on the provider, which is an estimate.
        # The invoice that matters is the provider's. The mock is free.
        "cost_usd": round(
            reported_cost if reported_cost is not None
            else provider.cost_per_1k * (input_tokens + output_tokens) / 1000,
            6,
        ),
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
            # False means every answer is made up: the stand-in.
            "live": p.name != "mock",
        }
        for p in PROVIDERS
    ]
