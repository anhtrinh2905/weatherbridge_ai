class AdvisoryError(Exception):
    """Base error for advisory-generation provider failures."""


class AdvisoryConfigError(AdvisoryError):
    """Raised when required credentials/config (e.g. OPENAI_API_KEY) are missing."""


class AdvisoryTransportError(AdvisoryError):
    """Raised when the network request fails outright (no HTTP response) or the response
    shape is unusable."""


class AdvisoryHTTPError(AdvisoryError):
    def __init__(self, status_code: int, body: str) -> None:
        self.status_code = status_code
        self.body = body
        super().__init__(f"Advisory provider returned {status_code}: {body}")
