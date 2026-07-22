# @flows/shared

Runtime constants and DTOs that cross package or client/server boundaries.

## Owns

- Spotify, Music, Lyrics, Trading, Chat, Canvas, and Board wire contracts.
- Discriminated statuses and stream event constants used by producers and consumers.
- Shared pagination, presentation-status, token, annotation, and analysis shapes.

## Does Not Own

- Flow orchestration, provider SDK types, persistence rows, or HTTP route handlers.
- Backend-only ports and implementation details.
- UI-only component props that never cross the Eden boundary.

Consumers import package-root exports only. Runtime validation remains at each HTTP/SSE
boundary; TypeBox route schemas feed Eden inference and stream adapters narrow parsed
events before exposing them to UI state.
