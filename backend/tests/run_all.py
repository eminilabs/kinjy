#!/usr/bin/env python3
"""Run every test in this directory and be loud about anything that is not a pass.

Written after a suite sat red in the tree for three days. Nothing was wrong with
the code it guarded: `e2e_messaging_age` crashed during setup, and the runs in
between were me picking suites by hand and not picking that one. A list of
suites maintained by whoever is running them is not a test suite, it is a habit.

So this script does two things that a `for t in ...` loop does not:

**It discovers.** Every `e2e_*.py` and `test_*.py` in this directory is run,
including ones added after this file was written. There is no list to forget to
update.

**It distrusts a silent zero.** The failing suite above exited 0 on the run that
missed it, because it died in an `assert` during setup before it printed
anything, and a grep for "ALL CHECKS PASSED" simply found nothing and moved on.
Here, a suite that exits 0 without printing its verdict is CRASHED, not passed.
An exit code and a verdict that disagree are reported as a MISMATCH rather than
being quietly resolved in either direction.

Exit codes this script understands from a suite:

    0 + verdict marker   passed
    2                    skipped on purpose (wrong environment - see below)
    anything else        failed

Usage:

    python backend/tests/run_all.py            # everything, against the local stack
    python backend/tests/run_all.py --list     # show what would run
    python backend/tests/run_all.py -k moder   # only suites matching a substring
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
BACKEND = HERE.parent

BASE = os.environ.get("KINJY_API", "http://localhost:8200/api")

# Scratch space for pytest, inside the repo and git-ignored.
PYTEST_TMP = BACKEND / ".pytest-tmp"

# Per-suite timeout. Generous - some of these register a dozen members and wait
# on classification - but finite, because a hung suite that never returns is
# indistinguishable from a slow one until the day it never returns at all.
TIMEOUT = int(os.environ.get("KINJY_TEST_TIMEOUT", "600"))

# A suite says it finished by printing one of these. Any suite that prints none
# of them did not reach its own summary line, whatever it exited with.
SUCCESS_MARKERS = ("ALL CHECKS PASSED", "no drift:")
FAILURE_MARKERS = ("THERE ARE FAILURES", "drift detected")

# Ports, with the service each one must answer as. Getting this wrong is the
# oldest trap in this codebase: every service returns 404 for an unknown path,
# so a suite pointed at the wrong port passes its "this is refused" assertions
# without ever reaching the service that was supposed to refuse.
SERVICES = {
    8200: "gateway",
    8201: "auth-service",
    8202: "user-service",
    8203: "social-service",
    8204: "community-service",
    8205: "family-service",
    8206: "memorial-service",
    8207: "messaging-service",
    8208: "creator-service",
    8209: "commerce-service",
    8210: "ledger-service",
    8211: "payment-service",
    8212: "ai-service",
    8213: "media-service",
}

GREEN, RED, YELLOW, GREY, BOLD, OFF = (
    "\033[32m", "\033[31m", "\033[33m", "\033[90m", "\033[1m", "\033[0m"
)
if os.environ.get("NO_COLOR") or not sys.stdout.isatty():
    GREEN = RED = YELLOW = GREY = BOLD = OFF = ""


def discover(pattern: str | None) -> list[Path]:
    """Every suite in this directory, in a stable order."""
    files = sorted(
        p for p in HERE.glob("*.py")
        if p.name != Path(__file__).name
        and (p.name.startswith("e2e_") or p.name.startswith("test_") or p.name == "schema_drift.py")
    )
    if pattern:
        files = [p for p in files if pattern.lower() in p.name.lower()]
    return files


def targets_localhost_only(path: Path) -> bool:
    """Whether this suite can only talk to a local stack.

    Some suites read KINJY_API from the environment and some have the port
    written into them. Running the second kind while KINJY_API points somewhere
    else does not test that somewhere else - it quietly tests localhost again
    and reports a pass, which is worse than not running it.
    """
    src = path.read_text(encoding="utf-8", errors="replace")
    reads_env = "KINJY_API" in src or "environ" in src
    mentions_localhost = "localhost:" in src or "127.0.0.1" in src
    return mentions_localhost and not reads_env


def preflight() -> tuple[bool, list[str]]:
    """Check the stack is up, and that each port answers as the right service."""
    notes: list[str] = []
    healthy = True
    for port, expected in SERVICES.items():
        url = f"http://localhost:{port}/health"
        try:
            got = httpx.get(url, timeout=5).json()
        except Exception as exc:
            notes.append(f"{RED}down{OFF}   :{port} {expected} ({type(exc).__name__})")
            healthy = False
            continue
        name = got.get("service")
        if name != expected:
            # Not a warning. A port answering as the wrong service makes every
            # assertion about a refusal meaningless.
            notes.append(f"{RED}WRONG{OFF}  :{port} answers as {name!r}, expected {expected!r}")
            healthy = False
    return healthy, notes


def classify(code: int, out: str) -> tuple[str, str]:
    """Turn an exit code and its output into a verdict and an explanation."""
    said_pass = any(m in out for m in SUCCESS_MARKERS)
    said_fail = any(m in out for m in FAILURE_MARKERS)

    if code == 2:
        # By convention in this directory: the suite decided it was pointed at
        # an environment it must not run against, and stopped on purpose.
        first = next((l for l in out.splitlines() if l.strip()), "")
        return "SKIP", first.strip()[:90]

    if code == 0 and said_pass and not said_fail:
        return "PASS", ""

    if code != 0 and said_fail:
        return "FAIL", "checks failed"

    if code == 0 and not said_pass:
        # The case this script exists for. The suite exited cleanly without
        # reaching its own summary, which usually means it died in setup - and
        # a grep for the success line just finds nothing and says nothing.
        tail = [l for l in out.strip().splitlines() if l.strip()][-1:] or ["no output"]
        return "CRASH", f"exited 0 without a verdict - {tail[0].strip()[:80]}"

    if code != 0 and said_pass:
        return "MISMATCH", f"printed a pass but exited {code}"

    tail = [l for l in out.strip().splitlines() if l.strip()][-1:] or ["no output"]
    return "FAIL", f"exit {code} - {tail[0].strip()[:80]}"


def subprocess_env() -> dict:
    """The environment a suite gets: this shell's, plus what a container gives.

    Two things the host does not provide and `/app` inside a container does:

    * `backend` on the import path. A script's `sys.path[0]` is its own
      directory, so a suite in `tests/` cannot `from common import security`
      however the working directory is set. One suite does exactly that and
      failed on the host while passing in the container.
    * the service configuration. A suite that mints a token with
      `common.security` has to sign it with the same `JWT_SECRET` the services
      verify with, or the gateway rejects it and the suite fails somewhere far
      away from the cause - as a `KeyError` on a response body, in that case.

    Values already set in the environment win, so `KINJY_API=... run_all.py`
    still points the run wherever it was told to.
    """
    env = dict(os.environ)
    existing = env.get("PYTHONPATH")
    env["PYTHONPATH"] = str(BACKEND) + (os.pathsep + existing if existing else "")

    dotenv = BACKEND.parent / ".env"
    if dotenv.exists():
        for raw in dotenv.read_text(encoding="utf-8", errors="replace").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if key and key not in env:
                env[key] = value.split(" #")[0].strip().strip('"').strip("'")
    return env


def run_one(path: Path) -> tuple[str, str, float, str]:
    started = time.monotonic()
    if path.name.startswith("test_"):
        # pytest is given a temp directory inside the repository rather than
        # the one it picks under the OS temp. On at least one machine here that
        # default is not writable - every test using `tmp_path` failed with
        # WinError 5 while the code was fine - and an environment that fails 24
        # tests for a reason that has nothing to do with the code is worse than
        # no signal, because the first instinct is to go looking in the code.
        PYTEST_TMP.mkdir(parents=True, exist_ok=True)
        cmd = [sys.executable, "-m", "pytest", str(path), "-q",
               "--basetemp", str(PYTEST_TMP)]
    else:
        cmd = [sys.executable, str(path)]
    try:
        proc = subprocess.run(
            cmd, cwd=BACKEND, capture_output=True, text=True,
            timeout=TIMEOUT, errors="replace", env=subprocess_env(),
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        code = proc.returncode
    except subprocess.TimeoutExpired as exc:
        out = (exc.stdout or "") if isinstance(exc.stdout, str) else ""
        return "TIMEOUT", f"still running after {TIMEOUT}s", time.monotonic() - started, out

    if path.name.startswith("test_"):
        # pytest speaks for itself; its exit code is the verdict.
        verdict = "PASS" if code == 0 else "FAIL"
        summary = "" if code == 0 else "pytest reported failures"
        counts = re.search(r"(\d+) passed", out)
        if verdict == "PASS" and counts:
            summary = f"{counts.group(1)} passed"
        return verdict, summary, time.monotonic() - started, out

    verdict, summary = classify(code, out)
    return verdict, summary, time.monotonic() - started, out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("-k", dest="pattern", help="only suites whose filename contains this")
    ap.add_argument("--list", action="store_true", help="show what would run, then stop")
    ap.add_argument("--no-preflight", action="store_true", help="skip the health checks")
    args = ap.parse_args()

    suites = discover(args.pattern)
    if not suites:
        print("no suites matched")
        return 1

    if args.list:
        for p in suites:
            note = " (local stack only)" if targets_localhost_only(p) else ""
            print(f"  {p.name}{GREY}{note}{OFF}")
        return 0

    remote = "localhost" not in BASE and "127.0.0.1" not in BASE

    print(f"{BOLD}Running {len(suites)} suites against {BASE}{OFF}")

    if not args.no_preflight and not remote:
        healthy, notes = preflight()
        for n in notes:
            print(f"  {n}")
        if not healthy:
            print(f"\n{RED}The stack is not ready.{OFF} Start it with:  docker compose up -d")
            print("Running now would produce failures that say nothing about the code.")
            return 2
        print(f"  {GREEN}stack up{OFF}, every port answering as the right service")

    results: list[tuple[str, str, str, float]] = []
    logs: dict[str, str] = {}

    for path in suites:
        name = path.name
        if remote and targets_localhost_only(path):
            # Refuse rather than run: this suite would test localhost and
            # report a pass for an environment it never touched.
            results.append((name, "SKIP", "hardcodes localhost; cannot test a remote stack", 0.0))
            print(f"  {YELLOW}SKIP{OFF}     {name}  {GREY}hardcodes localhost{OFF}")
            continue

        # ASCII only, and the in-place overwrite only on a terminal: a
        # Windows console prints anything else as mojibake, and a carriage
        # return in a piped log leaves both halves of every line in the file.
        live = sys.stdout.isatty()
        if live:
            print(f"  {GREY}....{OFF}     {name}", end="", flush=True)
        verdict, summary, secs, out = run_one(path)
        logs[name] = out
        colour = {
            "PASS": GREEN, "SKIP": YELLOW, "FAIL": RED,
            "CRASH": RED, "MISMATCH": RED, "TIMEOUT": RED,
        }[verdict]
        prefix = "\r" if live else ""
        print(f"{prefix}  {colour}{verdict:<8}{OFF} {name}  {GREY}{secs:.0f}s {summary}{OFF}")
        results.append((name, verdict, summary, secs))

    bad = [r for r in results if r[1] not in ("PASS", "SKIP")]
    skipped = [r for r in results if r[1] == "SKIP"]
    passed = [r for r in results if r[1] == "PASS"]

    print()
    print(f"{BOLD}{len(passed)} passed, {len(bad)} not passed, {len(skipped)} skipped{OFF}")

    if skipped:
        # Printed every time, never folded into the pass count. A skip that
        # looks like a pass is how a suite stops being run at all.
        print(f"{YELLOW}Skipped - these were not tested:{OFF}")
        for name, _, why, _ in skipped:
            print(f"  - {name}  {GREY}{why}{OFF}")

    if bad:
        print()
        for name, verdict, why, _ in bad:
            print(f"{RED}{'=' * 70}{OFF}")
            print(f"{RED}{verdict}{OFF} {BOLD}{name}{OFF}  {why}")
            tail = logs.get(name, "").strip().splitlines()[-25:]
            for line in tail:
                print(f"  {line}")
        print(f"{RED}{'=' * 70}{OFF}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
