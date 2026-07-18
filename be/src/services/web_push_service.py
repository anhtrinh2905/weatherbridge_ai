import json
from dataclasses import dataclass
from typing import Any

from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import WebPushException, webpush  # type: ignore[import-untyped]
from starlette.concurrency import run_in_threadpool

from core.config import Settings


def _base64url_no_padding(data: bytes) -> str:
    import base64

    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _generate_vapid_key_pair() -> tuple[str, str]:
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_value = private_key.private_numbers().private_value.to_bytes(32, "big")
    public_numbers = private_key.public_key().public_numbers()
    public_key = (
        b"\x04"
        + public_numbers.x.to_bytes(32, "big")
        + public_numbers.y.to_bytes(32, "big")
    )
    return _base64url_no_padding(private_value), _base64url_no_padding(public_key)


_DEMO_PRIVATE_KEY, _DEMO_PUBLIC_KEY = _generate_vapid_key_pair()


@dataclass(frozen=True)
class PushSendResult:
    endpoint: str
    ok: bool
    status_code: int | None = None
    error: str | None = None


class WebPushService:
    def __init__(self, settings: Settings) -> None:
        self.subject = settings.web_push_subject
        self.private_key = settings.web_push_vapid_private_key or _DEMO_PRIVATE_KEY
        self.public_key = settings.web_push_vapid_public_key or _DEMO_PUBLIC_KEY
        self._subscriptions: dict[str, dict[str, Any]] = {}

    def save_subscription(self, subscription: dict[str, Any]) -> int:
        endpoint = str(subscription.get("endpoint") or "")
        if not endpoint:
            raise ValueError("Push subscription is missing endpoint")
        self._subscriptions[endpoint] = subscription
        return len(self._subscriptions)

    @property
    def subscription_count(self) -> int:
        return len(self._subscriptions)

    async def send_to_all(self, payload: dict[str, Any]) -> list[PushSendResult]:
        if not self._subscriptions:
            return []

        body = json.dumps(payload, ensure_ascii=False)
        results: list[PushSendResult] = []
        expired: list[str] = []

        for endpoint, subscription in self._subscriptions.items():
            result = await self._send_one(endpoint, subscription, body)
            results.append(result)
            if result.status_code in {404, 410}:
                expired.append(endpoint)

        for endpoint in expired:
            self._subscriptions.pop(endpoint, None)

        return results

    async def _send_one(
        self, endpoint: str, subscription: dict[str, Any], payload: str
    ) -> PushSendResult:
        try:
            await run_in_threadpool(
                webpush,
                subscription_info=subscription,
                data=payload,
                vapid_private_key=self.private_key,
                vapid_claims={"sub": self.subject},
            )
        except WebPushException as exc:
            status_code = getattr(exc.response, "status_code", None)
            return PushSendResult(
                endpoint=endpoint,
                ok=False,
                status_code=status_code,
                error=str(exc),
            )
        return PushSendResult(endpoint=endpoint, ok=True)
