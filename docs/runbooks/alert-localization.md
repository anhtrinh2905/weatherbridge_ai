# Reviewed Alert Localization

## Safety gate

- Vietnamese (`vi`) is the canonical alert content and the production fallback.
- Local-language variants start as `draft` or `machine_draft` and cannot be sent to residents.
- A commune officer or admin reviews a draft. Only `human_reviewed` variants can be published.
- A locale must also be `published` and `is_active=true` before a resident can select it.
- The seeded Hmong and Tai locale records are intentionally inactive until a local-language reviewer confirms the variant and voice.
- The development database must use the PostGIS image and be upgraded through `0011` before applying `0012`. A legacy database at `0002` cannot be upgraded by a plain PostgreSQL container because migration `0005` enables PostGIS.

## Operational flow

1. An official creates a localized draft from an alert's canonical Vietnamese content.
2. An authorized reviewer approves or rejects it with an audit entry.
3. An authorized publisher activates the reviewed variant for the alert.
4. For already published alerts, matching recipients are relinked to the localized content before a pending/retry notification is dispatched.
5. The notification worker already joins the recipient's `content_id`, so no provider-specific localization branch is required.

## Audio

The alert audio endpoint only synthesizes content delivered to the resident, after the locale has TTS enabled. The first supported mapping is `hmn-x-dienbien -> hmn` through the optional MMS provider. Audio asset persistence and public-loudspeaker export remain deliberately disabled until a reviewed voice and object-storage writer are available.

## Deferred integration tests

- `be/tests/test_alert_localization_workflow.py`
- `worker/tests/test_localized_notification_delivery.py`

They are intentionally skipped until the demo database contains approved locale reviewers, alert recipients, and an MMS fixture.
