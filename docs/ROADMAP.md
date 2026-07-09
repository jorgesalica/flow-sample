# Roadmap

The source of truth for where this project is going — high-level vision and the low-level
work that gets us there. Actionable items are mirrored as GitHub issues; this doc holds the
**why** and the shape. Personal project: no deploy/CD, minimal ceremony, short-lived PRs to
`main`.

> Related: [#18 B2 — Board/Canvas Vision](https://github.com/jorgesalica/flow-sample/issues/18) ·
> [#19 B1 — Ordering pass](https://github.com/jorgesalica/flow-sample/issues/19)

---

## North star

An **improvisational analysis canvas** for things the user cares about — music first.
Flows aren't pages you navigate to; they're **items hung on a board**, brought up for
analysis and connected by meaning (see #18). The aesthetic is **space + AI + music + the
organic**: dark, with three palettes that mix across flows —

- 🌌 **Galaxy** — deep space: blues, purples, bright star accents.
- 🔥 **Fire** — reds/oranges, energy.
- 🌱 **Organic** — greens/browns, natural/earthy.

Experimental and playful ("a data vignette"), but built on solid foundations.

---

## Now — foundations (B1)

Mostly done across the recent modernization (Fases 0–3):

- [x] Consolidate WIP + parallel backend refactor into `main` (lyrics-canvas + LLM refactor)
- [x] Backend: hexagonal across all 5 flows (`domain/ + backend/`), `tsx` runtime
- [x] Tests + coverage: ~832 tests, per-package coverage (`pnpm test:coverage`)
- [x] Tooling: Tailwind v4 (vite plugin, no config), pins, conventions doc, AGENTS/CLAUDE
- [x] Frontend → **SvelteKit** (file routing, adapter-static SPA) + UI test suite
- [x] **3b** — data via `+page.ts` loaders
- [x] **3c** — runes-only state, drop remaining `svelte/store`
- [x] GitHub: light CI (gate on push/PR) + PR/issue templates
- [x] Refactor audit pass: architecture, frontend data access, backend layering, testing, and stale docs

---

## Near-term execution queue

1. **Close/split stale issues**: #31 is done; #19 should be closed after its
   remaining work is split into sharper follow-ups.
2. **Package boundary map**: keep `packages/flows/*` as independently testable
   bounded modules, not separate deployable apps yet. See
   [system-map.md](architecture/system-map.md).
3. **UI design system (#24)**: add shared primitives and theme tokens, then
   migrate Chat/Canvas first.
4. **Trading polish (#26)**: replace raw logs, extract StepWizard constants and
   formatting, type market-state view models, and refresh Trading docs.
5. **Data/config/testing follow-ups**: align loaders/invalidation (#34),
   normalize env ownership (#33), and add contract checks (#35) before growing
   the Board/Canvas epic.

---

## Epics (next)

### 1. The Canvas / Board (#18)

Turn the landing grid into a **board** where flows are positioned, live, expandable items.
- Canvas renderer over the existing `FlowDefinition` registry (cards → board items).
- User-arranged layout persisted to `localStorage` (no backend for v1).
- Click expands a card inline instead of routing away.
- ⚗️ Experimental: explore an actual HTML `<canvas>` renderer for the board/annotations
  (flagged as possibly overkill — spike before committing).

### 2. Music trio: Spotify × Lyrics × Canvas

The core experience.
- Bring **playlists** from Spotify; a **song viewer** — select a track → its lyrics render
  on the canvas.
- **Karaoke mode**: synced lyrics (`syncedLyrics` LRC already stored) highlighting in time.
- Lyrics canvas annotations (chords / vocal / meaning) — richer and more dynamic than today.

### 3. LLM depth — prompt engineering + multi-agent

The current prompts are **too flat** (ask "what does this lyric mean" → it restates the
obvious). This epic makes the LLM output genuinely useful.
- **Prompt engineering**: rewrite the canvas/lyrics/chat prompts for depth — connect lines
  to themes, emotion, cultural references; stop restating the literal.
- **Context injection**: feed playlist/track/user-taste context into the analysis.
- **Singing coach**: explain *how* to sing a song (technique, dynamics) on the canvas.
- **Multi-agent system** for complex tasks (decompose → specialist agents → synthesize),
  reusing the multi-provider rotation client in `@flows/core`.

### 4. UI design system + theming

- **Unify components** into a shared design system (consistent buttons, cards, inputs,
  modals, async/empty/error states) — important groundwork for everything else.
- **Palettes**: implement the three themes (galaxy / fire / organic) as Tailwind v4
  `@theme` token sets that mix across flows. Replace the throwaway "cosmic" theme.
- Polish overall UX; keep it dark, music/space-forward.

### 5. Flow polish

- **Chat flow**: routing/streaming is fixed; continue UX and design-system polish.
- **Trading flow**: tidy and improve; clarify its domain + docs.
- Per flow: sharpen the domain model, the docs, and the high-level "what is this" framing.

### 6. External integrations (later, simple)

- **ElevenLabs** — voice/music generation.
- Video generation / dynamic rendering.
- YouTube cross-reference for playlist videos (#18).
- Keep each integration small and optional.

---

## How we work

- Conventions: [docs/conventions.md](conventions.md). Architecture:
  [backend](architecture/backend.md) · [ui](architecture/ui.md).
- Work on a short-lived branch, open a PR to `main`, wait for checks, then merge
  through GitHub. Run `pnpm verify` before pushing non-trivial changes.
- This roadmap is living — reorder, split into issues, and check things off as we go.
