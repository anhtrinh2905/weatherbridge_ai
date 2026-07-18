# Notification Providers

The alert pipeline creates immutable recipients and rows in `notification_outbox`.
Only the worker resolves a channel provider, decrypts the destination, and sends
the notification. API pods never receive provider credentials.

## Delivery modes

- `disabled`: do not process the outbox.
- `simulate`: record simulated delivery for every supported channel.
- `web_push`: backward-compatible mode that enables only Web Push.
- `configured`: enable each provider selected by its provider setting.

## Enable configured delivery

Set `NOTIFICATION_DELIVERY_MODE=configured` and configure one or more channels:

| Channel | Provider setting | Required worker-only secrets |
| --- | --- | --- |
| SMS | `SMS_PROVIDER=twilio` | `SMS_TWILIO_ACCOUNT_SID`, `SMS_TWILIO_AUTH_TOKEN`, and either `SMS_TWILIO_FROM` or `SMS_TWILIO_MESSAGING_SERVICE_SID` |
| Zalo | `ZALO_PROVIDER=oa` | `ZALO_OA_ACCESS_TOKEN` |
| Web Push | VAPID key pair present | `WEB_PUSH_VAPID_PRIVATE_KEY` plus public key in app configuration |

SMS contact values must use E.164 phone numbers. A Zalo contact value is the
recipient's Zalo OA user ID; the resident must be eligible to receive the OA
customer-service message under Zalo's platform rules. Provider responses are
recorded without a message body or destination, and failed sends keep the
existing bounded retry behavior.

Zalo ZNS remains a separate future adapter because each approved ZNS template
has provider-specific variables and policy requirements. It should not be
enabled by reusing an OA access token.
