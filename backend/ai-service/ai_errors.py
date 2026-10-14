"""Errors an AI provider can raise, in a module of their own.

The gateway names them and the adapters raise them; keeping them here means an
adapter never has to import the gateway (which would import the adapter).
"""
from __future__ import annotations


class ProviderError(RuntimeError):
    """A real provider was asked and it failed.

    The message is written to be shown to a member: never a request, a header, a
    response body or a key - a provider's own error text can echo what was sent,
    and what was sent is somebody's writing. ``provider`` is filled in by the
    gateway, so the failure can be recorded against the right one.

    ``unavailable`` is true when the provider could not be reached or said it was down
    (timeouts, 502/503/504) - the one kind of failure another route may be tried for.
    Not "no credit left", not "refused our key", not "the reply was malformed": those
    would fail the same way elsewhere, or mean something is wrong that must be seen.
    """

    def __init__(self, message: str, *, provider: str | None = None, unavailable: bool = False):
        super().__init__(message)
        self.provider = provider
        self.unavailable = unavailable
