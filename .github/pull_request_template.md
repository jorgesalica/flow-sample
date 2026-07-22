## What

<!-- What changed, concretely? -->

## Why

<!-- What problem or risk does this address? Link the issue. -->

## User impact

<!-- Describe observable behavior or state "No user-visible change". -->

## Changes

-

## How to test

<!-- List commands and reproducible manual steps actually run. -->

## Meaningful QA

| Scenario | User intent | Expected result |
| -------- | ----------- | --------------- |
|          |             |                 |

## Screenshots

<!-- Required for visual changes; remove this section otherwise. -->

## Breaking changes

<!-- Describe migration/compatibility impact; remove this section if none. -->

## Checklist

- [ ] `pnpm verify` is green locally
- [ ] `pnpm build` and `pnpm test:coverage` are green locally
- [ ] Relevant Playwright or desktop/mobile verification is documented
- [ ] Follows [docs/conventions.md](../docs/conventions.md) (zero `any`, no magic strings, layering)
- [ ] Tests added/updated for the change
- [ ] Docs updated if behavior or architecture changed
- [ ] No credentials, personal data, or generated artifacts are included

<!-- Use "Closes #NNN" for complete issue scope or "Refs #NNN" for partial work. -->
