import base64
import hashlib
import hmac
import os
import unicodedata
from dataclasses import dataclass
from typing import Protocol

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_AES_PREFIX = b"WB1"
_SIMULATED_PREFIX = b"SIM1"


@dataclass(frozen=True)
class ProtectedValue:
    ciphertext: bytes
    key_version: str


class PiiSettings(Protocol):
    pii_mode: str
    pii_encryption_key: str | None
    pii_hash_key: str | None
    pii_key_version: str


class PiiProtector:
    """Protects application PII; live mode fails closed without valid keys."""

    def __init__(self, settings: PiiSettings) -> None:
        self.mode = settings.pii_mode
        self.key_version = settings.pii_key_version
        self._encryption_key = self._decode_key(settings.pii_encryption_key)
        self._hash_key = self._decode_key(settings.pii_hash_key)
        if self.mode == "live" and (self._encryption_key is None or self._hash_key is None):
            raise ValueError("PII live mode requires encryption and hash keys")

    @staticmethod
    def _decode_key(value: str | None) -> bytes | None:
        if not value:
            return None
        try:
            decoded = base64.urlsafe_b64decode(value.encode("ascii"))
        except (ValueError, UnicodeEncodeError) as exc:
            raise ValueError("PII keys must be URL-safe base64") from exc
        if len(decoded) != 32:
            raise ValueError("PII keys must decode to exactly 32 bytes")
        return decoded

    def protect(self, value: str, *, context: str) -> ProtectedValue:
        raw = value.encode("utf-8")
        if self._encryption_key is None:
            if self.mode != "simulated":
                raise ValueError("PII encryption key is not configured")
            encoded = _SIMULATED_PREFIX + base64.urlsafe_b64encode(raw)
            return ProtectedValue(encoded, "simulated-obfuscated-v1")
        nonce = os.urandom(12)
        encrypted = AESGCM(self._encryption_key).encrypt(nonce, raw, context.encode("utf-8"))
        return ProtectedValue(_AES_PREFIX + nonce + encrypted, self.key_version)

    def reveal(self, value: bytes, *, context: str) -> str:
        if value.startswith(_SIMULATED_PREFIX):
            if self.mode != "simulated":
                raise ValueError("Simulated values cannot be read in live mode")
            return base64.urlsafe_b64decode(value[len(_SIMULATED_PREFIX) :]).decode("utf-8")
        if not value.startswith(_AES_PREFIX) or self._encryption_key is None:
            raise ValueError("PII ciphertext cannot be decrypted")
        nonce_start = len(_AES_PREFIX)
        nonce = value[nonce_start : nonce_start + 12]
        encrypted = value[nonce_start + 12 :]
        raw = AESGCM(self._encryption_key).decrypt(nonce, encrypted, context.encode("utf-8"))
        return raw.decode("utf-8")

    def lookup_hash(self, value: str) -> str:
        normalized = " ".join(unicodedata.normalize("NFKC", value).casefold().split())
        raw = normalized.encode("utf-8")
        if self._hash_key is None:
            if self.mode != "simulated":
                raise ValueError("PII hash key is not configured")
            return hashlib.sha256(raw).hexdigest()
        return hmac.new(self._hash_key, raw, hashlib.sha256).hexdigest()
