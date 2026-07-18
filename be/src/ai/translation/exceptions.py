class TranslationError(Exception):
    """Base error for translation provider failures (Google Cloud Translation, OpenAI, ...)."""


class TranslationConfigError(TranslationError):
    """Raised when required credentials/config are missing or unreadable."""


class TranslationTransportError(TranslationError):
    """Raised when the network request fails outright (no HTTP response) or the response
    shape is unusable."""


class TranslationHTTPError(TranslationError):
    def __init__(self, status_code: int, body: str) -> None:
        self.status_code = status_code
        self.body = body
        super().__init__(f"Translation provider returned {status_code}: {body}")
