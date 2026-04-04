import time
import math
import ipaddress
from typing import Dict, Tuple
from fastapi import Request, HTTPException


class TokenBucketLimiter:
    def __init__(self):
        # Dictionary format: { "IP:Category": (tokens_remaining, last_update_time) }
        self.buckets: Dict[str, Tuple[float, float]] = {}

    def check_limit(
        self, key: str, max_tokens: int, refill_time_seconds: int
    ) -> tuple[bool, int]:
        """
        Evaluates the rate limit using the Token Bucket algorithm.
        Executes entirely synchronously without `await`, ensuring 100% atomic
        thread-safety in asyncio's single-threaded event loop.

        Returns:
            (allowed, retry_after_seconds) — retry_after is 0 when allowed.
        """
        now = time.time()
        rate = max_tokens / refill_time_seconds

        if key not in self.buckets:
            # First request, start with max_tokens - 1
            self.buckets[key] = (float(max_tokens - 1), now)
            return True, 0

        tokens, last_update = self.buckets[key]

        # Add regenerated tokens over the elapsed time
        elapsed = now - last_update
        tokens = min(tokens + elapsed * rate, float(max_tokens))

        if tokens >= 1.0:
            # We have enough tokens, consume one
            self.buckets[key] = (tokens - 1.0, now)
            return True, 0
        else:
            # Not enough tokens. Update timestamp but keep tokens as-is.
            self.buckets[key] = (tokens, now)
            # Seconds until one full token will have regenerated
            retry_after = math.ceil((1.0 - tokens) / rate)
            return False, retry_after

    def cleanup(self, max_idle_seconds: int = 86400):
        """Removes bucket tracking for IPs that haven't made a request in `max_idle_seconds`."""
        now = time.time()
        keys_to_delete = [
            k for k, v in self.buckets.items() if (now - v[1]) > max_idle_seconds
        ]
        for k in keys_to_delete:
            del self.buckets[k]


# Global instance
limiter = TokenBucketLimiter()


def normalize_ip(ip: str) -> str:
    """
    Normalizes an IP address for use as a rate-limit key.

    IPv4 addresses are returned as-is.
    IPv6 addresses are collapsed to their /64 prefix to prevent abuse via
    large address blocks (a single /48 or /64 is trivially obtained from most
    ISPs and cloud providers, giving an attacker 2^64 unique IPs otherwise).
    """
    try:
        addr = ipaddress.ip_address(ip)
        if isinstance(addr, ipaddress.IPv6Address):
            network = ipaddress.ip_network(f"{ip}/64", strict=False)
            return str(network.network_address)
    except ValueError:
        pass
    return ip


def get_client_ip(request: Request) -> str:
    """
    Extracts and normalizes the real client IP from a request.

    On Render (and most reverse-proxy setups) the load balancer *appends* the
    real client IP as the rightmost value in X-Forwarded-For, making it the
    only entry that cannot be spoofed by the client.  Taking the first/leftmost
    value (the historical default) would let any caller set an arbitrary IP via
    a crafted header and bypass all limits.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Rightmost entry is written by Render's load balancer — not user-controlled
        real_ip = forwarded.split(",")[-1].strip()
        return normalize_ip(real_ip)
    raw = request.client.host if request.client else "127.0.0.1"
    return normalize_ip(raw)


class RateLimit:
    """FastAPI Dependency for Endpoint-Specific Rate Limiting"""

    def __init__(self, limit: int, window_seconds: int = 60, scope: str = ""):
        self.limit = limit
        self.window_seconds = window_seconds
        self.scope = scope

    def __call__(self, request: Request):
        ip = get_client_ip(request)

        # Determine logical route path (groups parameterised requests like /mojang/{uuid} together)
        if self.scope:
            route_path = self.scope
        else:
            route = request.scope.get("route")
            route_path = route.path if route else request.url.path

        key = f"{ip}:{route_path}"

        allowed, retry_after = limiter.check_limit(key, self.limit, self.window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Too Many Requests",
                headers={"Retry-After": str(retry_after)},
            )
