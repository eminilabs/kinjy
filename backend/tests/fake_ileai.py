"""A stand-in for api.ileai.io, so the adapter can be tested with no account, no key
and no money.

It implements only what the adapter calls - ``POST /v1/translate`` and ``POST
/v1/chat/completions`` - in the shape IleAI's OpenAPI spec gives them (api.ileai.io/openapi.json)
and the live service confirmed (a chat reply is flat: content, finish_reason, model, provider,
input_tokens, output_tokens), and it can be made to fail on purpose by putting a
marker in the text being translated. It keeps what it was sent so a test can look at
the request the adapter really made: which header the key travelled in, what was in
the body, how many times it was asked.

Use it in a test::

    fake = FakeIleAI(); url = fake.start()    # an ephemeral port on 127.0.0.1
    ...
    fake.stop()

or on its own, for the live-stack check (see e2e_ai_translate_live.py)::

    python backend/tests/fake_ileai.py --port 8799 --key emk_test_fake_key
"""
from __future__ import annotations

import argparse
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_KEY = "emk_test_fake_key_not_a_secret"


class FakeIleAI:
    def __init__(self, key: str = DEFAULT_KEY, host: str = "127.0.0.1", port: int = 0):
        self.key = key
        self.requests: list[dict] = []
        self._lock = threading.Lock()
        self._seen: dict[str, int] = {}
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):  # silence
                pass

            def _send(self, status: int, payload, headers: dict | None = None, raw: bytes | None = None):
                body = raw if raw is not None else json.dumps(payload).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                for name, value in (headers or {}).items():
                    self.send_header(name, value)
                self.end_headers()
                self.wfile.write(body)

            def do_POST(self):
                length = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(length) if length else b""
                try:
                    body = json.loads(raw or b"{}")
                except ValueError:
                    body = None
                record = {"path": self.path, "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body, "raw": raw}
                with outer._lock:
                    outer.requests.append(record)
                outer._answer(self, record)

        self._handler = Handler
        self._server = ThreadingHTTPServer((host, port), Handler)
        self._thread: threading.Thread | None = None

    # --- lifecycle -------------------------------------------------------------

    def start(self) -> str:
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        host, port = self._server.server_address[:2]
        return f"http://{host}:{port}"

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()

    def reset(self) -> None:
        with self._lock:
            self.requests.clear()
            self._seen.clear()

    @property
    def calls(self) -> int:
        return len(self.requests)

    # --- behaviour ----------------------------------------------------------------

    def _count(self, marker: str) -> int:
        with self._lock:
            self._seen[marker] = self._seen.get(marker, 0) + 1
            return self._seen[marker]

    @staticmethod
    def _error(handler, status: int, code: str, message: str = "x", headers: dict | None = None):
        handler._send(status, {"error": {"code": code, "message": message, "request_id": f"fake-{status}", "details": {}}}, headers)

    def _answer(self, handler, record: dict) -> None:
        if record["path"] not in ("/v1/translate", "/v1/chat/completions"):
            return self._error(handler, 404, "not_found")
        # As the real service does: the key is X-API-Key. An Authorization: Bearer header is
        # read as a session token and refused, which is what a Bearer-sending client meets.
        if record["headers"].get("x-api-key") != self.key:
            return self._error(handler, 401, "invalid_token", "Jeton d'acces invalide.")
        body = record["body"]
        if record["path"] == "/v1/chat/completions":
            return self._chat(handler, record, body)
        if not isinstance(body, dict) or not isinstance(body.get("text"), list) or not body.get("target_lang"):
            return self._error(handler, 422, "validation_error")
        texts = body["text"]
        joined = "\n".join(str(t) for t in texts)

        # t402 / t503 fail the translation endpoint only, so a test can see what a client does next.
        if "__402__" in joined or "__t402__" in joined:
            return self._error(handler, 402, "insufficient_credits")
        if "__503__" in joined or "__t503__" in joined:
            return self._error(handler, 503, "all_providers_unavailable")
        if "__429_twice__" in joined and self._count("429") <= 2:
            return self._error(handler, 429, "rate_limit_exceeded", headers={"Retry-After": "1"})
        if "__echo__" in joined:
            # A provider whose error text repeats what it was sent, key and writing included.
            return self._error(handler, 422, "validation_error", message=f"bad input {joined} / {record['headers'].get('x-api-key')}")
        if "__garbage__" in joined:
            return handler._send(200, None, raw=b"<html>not json</html>")

        target = str(body["target_lang"])
        out = [f"{t} ({target})" for t in texts]
        provider, model = "deepl", body.get("model") or "deepl-v2"
        if "__short__" in joined:
            out = out[:-1]
        if "__split__" in joined:
            out[0] = out[0] + "\nsecond half"
        if "__otherprovider__" in joined:
            provider, model = "openai", "gpt-5-mini"
        if "__dict__" in joined:
            out = [{"text": t} for t in out]
        handler._send(200, {
            "translations": out,
            "detected_source_language": str(body.get("source_lang") or "EN"),
            "model": model,
            "provider": provider,
        })


def _chat(self, handler, record: dict, body) -> None:
    """The chat route, as a translation model would answer it: a JSON array of strings in the
    user message, a JSON array of translations back. Markers in the text make it misbehave."""
    if not isinstance(body, dict) or not isinstance(body.get("messages"), list):
        return self._error(handler, 422, "validation_error")
    users = [m for m in body["messages"] if isinstance(m, dict) and m.get("role") == "user"]
    raw = users[-1].get("content", "") if users else ""
    try:
        texts = json.loads(raw)
        assert isinstance(texts, list)
    except (ValueError, AssertionError):
        texts = [str(raw)]
    joined = "\n".join(str(t) for t in texts)

    if "__402__" in joined:
        return self._error(handler, 402, "insufficient_credits")
    if "__503__" in joined:
        return self._error(handler, 503, "all_providers_unavailable")
    if "__echo__" in joined:
        return self._error(handler, 422, "validation_error", message=f"bad input {joined} / {record['headers'].get('x-api-key')}")

    out = [f"{t} [llm]" for t in texts]
    content = json.dumps(out, ensure_ascii=False)
    finish, provider = "stop", "openai"
    if "__short__" in joined:
        content = json.dumps(out[:-1], ensure_ascii=False)
    if "__fenced__" in joined:
        content = "```json\n" + content + "\n```"
    if "__prose__" in joined:
        content = "Sure! Here is the translation: " + " / ".join(out)
    if "__notstrings__" in joined:
        content = json.dumps([{"t": x} for x in out])
    if "__length__" in joined:
        content, finish = "", "length"
    if "__empty__" in joined:
        content = ""
    if "__otherprovider__" in joined:
        provider = "anthropic"
    handler._send(200, {
        "content": content, "finish_reason": finish, "model": "gpt-5-mini-2025-08-07", "provider": provider,
        "input_tokens": 20 + len(joined) // 4, "output_tokens": 10 + len(content) // 4, "tool_calls": None,
    })


FakeIleAI._chat = _chat


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="A stand-in for api.ileai.io (tests only)")
    parser.add_argument("--port", type=int, default=8799)
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--key", default=DEFAULT_KEY)
    args = parser.parse_args()
    fake = FakeIleAI(args.key, args.host, args.port)
    print(f"fake IleAI on http://{args.host}:{args.port}  (key: {args.key})", flush=True)
    fake._server.serve_forever()
