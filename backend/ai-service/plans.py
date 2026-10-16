"""AI credits use the shared, payment-verified entitlement lookup.

The old AI_CREDITS_TRUST_SUBSCRIPTIONS switch cannot promote an unverified
record any more. A missing or unverified response always means Free.
"""
from common.entitlements import tier_of, _cache  # noqa: F401
