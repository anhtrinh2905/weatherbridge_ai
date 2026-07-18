import hashlib
import hmac
import time
from urllib.parse import quote

from core.config import Settings
from core.errors import AppError


class ObjectUrlSigner:
    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.object_storage_base_url
        self.signing_key = settings.object_storage_signing_key
        self.ttl_seconds = settings.object_storage_url_ttl_seconds

    def sign(self, object_key: str) -> str:
        if not self.base_url or not self.signing_key:
            raise AppError(
                503,
                "Hazard object storage signing is not configured",
                "object_storage_unavailable",
            )
        expires = int(time.time()) + self.ttl_seconds
        payload = f"{object_key}:{expires}".encode()
        signature = hmac.new(self.signing_key.encode(), payload, hashlib.sha256).hexdigest()
        encoded_key = quote(object_key.lstrip("/"), safe="/")
        return f"{self.base_url.rstrip('/')}/{encoded_key}?expires={expires}&signature={signature}"
