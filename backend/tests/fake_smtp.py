"""A mail sink for tests: accepts what is sent to it, remembers it, and can be told to refuse addresses.

Just enough SMTP for Python's ``smtplib`` as common/mailer.py uses it (EHLO, MAIL, RCPT, DATA, QUIT, no TLS and no
login) - and nothing leaves the machine. Use it from a test::

    sink = FakeSMTP(port=2525); sink.start()
    ...  # something sends mail to host:2525
    sink.messages            # [{"to": ..., "subject": ..., "headers": {...}, "body": ...}]
    sink.refuse.add("a@b.c") # RCPT TO that address will be answered 550
    sink.delay = 0.3         # seconds each message takes, to be able to interrupt a send
    sink.stop()
"""
from __future__ import annotations

import socketserver
import threading
import time
from email import message_from_bytes
from email.policy import default


class FakeSMTP:
    def __init__(self, host: str = "0.0.0.0", port: int = 2525):
        self.messages: list[dict] = []
        self.refuse: set[str] = set()
        self.delay: float = 0.0
        self._lock = threading.Lock()
        outer = self

        class Handler(socketserver.StreamRequestHandler):
            def _say(self, line: str) -> None:
                self.wfile.write((line + "\r\n").encode())
                self.wfile.flush()

            def handle(self):
                self._say("220 fake-smtp ready")
                recipients: list[str] = []
                while True:
                    raw = self.rfile.readline()
                    if not raw:
                        return
                    line = raw.decode("utf-8", "replace").strip()
                    verb = line.split(" ", 1)[0].upper()
                    if verb in ("EHLO", "HELO"):
                        self._say("250 fake-smtp")
                    elif verb == "MAIL":
                        recipients = []
                        self._say("250 ok")
                    elif verb == "RCPT":
                        address = line[line.index("<") + 1:line.index(">")].lower()
                        if address in outer.refuse:
                            self._say("550 no such user")
                        else:
                            recipients.append(address)
                            self._say("250 ok")
                    elif verb == "DATA":
                        self._say("354 end with <CRLF>.<CRLF>")
                        chunks = []
                        while True:
                            part = self.rfile.readline()
                            if part in (b".\r\n", b".\n", b""):
                                break
                            chunks.append(part[1:] if part.startswith(b"..") else part)
                        if outer.delay:
                            time.sleep(outer.delay)
                        parsed = message_from_bytes(b"".join(chunks), policy=default)
                        body = parsed.get_body(preferencelist=("plain",))
                        with outer._lock:
                            outer.messages.append({
                                "to": recipients[0] if recipients else "",
                                "subject": str(parsed["Subject"] or ""),
                                "headers": {k.lower(): str(v) for k, v in parsed.items()},
                                "body": body.get_content() if body else "",
                                "html": parsed.get_body(preferencelist=("html",)) is not None,
                            })
                        self._say("250 queued")
                    elif verb == "RSET":
                        recipients = []
                        self._say("250 ok")
                    elif verb == "NOOP":
                        self._say("250 ok")
                    elif verb == "QUIT":
                        self._say("221 bye")
                        return
                    else:
                        self._say("502 not implemented")

        class Server(socketserver.ThreadingTCPServer):
            allow_reuse_address = True
            daemon_threads = True

        self._server = Server((host, port), Handler)

    def start(self) -> None:
        threading.Thread(target=self._server.serve_forever, daemon=True).start()

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()

    def to(self, address: str) -> list[dict]:
        with self._lock:
            return [m for m in self.messages if m["to"] == address.lower()]

    def wait_for(self, count: int, address: str | None = None, seconds: float = 20.0) -> bool:
        end = time.time() + seconds
        while time.time() < end:
            if len(self.to(address) if address else self.messages) >= count:
                return True
            time.sleep(0.1)
        return False
