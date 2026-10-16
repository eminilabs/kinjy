"""Load ai-service's gateway and IleAI adapter for tests, without putting the
ai-service folder on ``sys.path``.

That folder holds a ``models.py`` and a ``main.py``; on the path they would shadow the
same-named modules of every other service another test imports. So the three files
are loaded by path under their own names, and ``ai_errors`` (which the other two
import by that name) is registered first.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))  # for `common`


def _load(name: str, filename: str):
    existing = sys.modules.get(name)
    if existing is not None:
        return existing
    spec = importlib.util.spec_from_file_location(name, ROOT / "ai-service" / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module  # before exec: @dataclass looks its module up here
    spec.loader.exec_module(module)
    return module


ai_errors = _load("ai_errors", "ai_errors.py")
gateway = _load("ai_gateway_under_test", "gateway.py")
ileai_adapter = _load("ileai_adapter", "ileai_adapter.py")
limits = _load("ai_limits_under_test", "limits.py")
plans = _load("ai_plans_under_test", "plans.py")
