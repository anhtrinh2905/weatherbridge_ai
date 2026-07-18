"""Placeholder coverage for localized alert delivery once end-to-end fixtures are available."""

import pytest


@pytest.mark.skip(reason="Needs alert localization + provider fixtures.")
async def test_pending_outbox_uses_the_reviewed_locale_content() -> None:
    """Outbox dispatch must read the recipient's current reviewed content variant."""
