from __future__ import annotations

import time
from collections import defaultdict, deque

_LIMITS: dict[str, deque] = defaultdict(deque)


def check_rate_limit(key: str, *, window_seconds: int = 3600, max_calls: int = 10) -> None:
    """Enforce a sliding-window rate limit for a key. Raises if exceeded."""
    now = time.time()
    window = _LIMITS[key]
    while window and (now - window[0]) > window_seconds:
        window.popleft()
    if len(window) >= max_calls:
        raise RuntimeError("rate_limited")
    window.append(now)
