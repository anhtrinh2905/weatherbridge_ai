"""Integration coverage to enable when alert localization is wired into the demo database."""

import pytest


@pytest.mark.skip(
    reason="Pending seeded locale reviewers and full alert delivery integration fixture."
)
async def test_reviewed_translation_replaces_recipient_fallback_before_delivery() -> None:
    """A published, reviewed locale variant must replace Vietnamese only for matching recipients."""


@pytest.mark.skip(reason="Pending MMS model fixture and object-storage persistence decision.")
async def test_only_published_reviewed_content_can_be_synthesized() -> None:
    """Draft and rejected translations must never be made available to the audio endpoint."""
