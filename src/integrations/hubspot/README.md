# HubSpot integration boundary

This folder contains only future-facing contracts and pure mappers.

- `supportGateway.ts` has an intentionally disabled placeholder that makes no request and reads no credential.
- `contracts.ts` isolates HubSpot-shaped payloads from feature code.
- `mappers.ts` converts authorized imports to the internal `Ticket` and `SupportConversation` models.

When authorization is available, implement `SupportGateway` in a server-only adapter, validate the remote payloads, and persist normalized records through an internal repository. Do not expose HubSpot credentials to client components.
