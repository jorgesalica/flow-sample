# Project Bucket 🪣

Ideas, future tasks, and things to do later.

## Priorities Definition

- **High**: Critical for usability or core value.
- **Medium**: Important improvements or planned features.
- **Low**: Nice to have, polish, or long-term.
- **TBD**: Just defined, needs triage.

---

## 🔥 High Priority

- [x] **[Feat]** Lyrics Flow (LrcLib integration)

## ⚡ Medium Priority

## 🐢 Low Priority

- [ ] **[UI/Feat]** PWA support & Offline capability
- [ ] **[UI/Feat]** Export to playlist
- [ ] **[Backend/Feat]** LLM-powered insights
- [ ] **[UI]** Dark/light theme toggle
- [ ] **[UI]** Keyboard shortcuts
- [ ] **[UI/Mobile]** Mobile-optimized touch interactions
- [ ] **[DevOps]** Docker containerization
- [ ] **[DevOps]** GitHub Actions CI/CD
- [ ] **[Test]** Performance benchmarks
- [ ] **[Backend/Test]** Integration tests for API endpoints
- [ ] **[UI/Test]** E2E test for full sync flow
- [ ] **[UI/Perf]** Lazy load SpotifyFlow page

## 🔮 Future Flows (TBD)

- [ ] **[Flow Improvement/Feat]** Add Spotify features to the flow like liked albums, playlists, etc.
- [ ] **[Flow Improvement/Feat]** Add Fractal Flow to the flows spike

### Fractal Flow

- Render and explore fractals (Mandelbrot, Julia sets, etc.)
- Interactive zoom/pan exploration
- Color palette customization
- Potential: GPU acceleration with WebGL

---

*Last updated: 2025-12-07*

---

## ✅ Done

- [x] **[Backend/Refactor]** Convert relative imports to aliases (27+ files)
- [x] **[DevOps]** Configure backend build tools for aliases (tsc-alias, tsconfig-paths)
- [x] **[DevOps]** Implement path aliases (`@/`) for cleaner imports (UI & Backend)
- [x] **[Docs]** General high-level project status check
- [x] **[Backend/Refactor]** Split spotify.routes.ts (extract stats service)
- [x] **[Backend/Refactor]** Centralize error handling middleware (already in app.ts)
- [x] **[Backend/Feat]** Add health check endpoint (already exists /api/status)
- [x] **[UI/Refactor]** Improve components (add common elements, extract more)
- [x] **[UI/Refactor]** Extract color tokens to CSS variables (using Tailwind 4 @theme)
- [x] **[UI/Bug]** Fix Filter Panel transparency issues (hard to see when open)
- [x] **[UI/UX]** Improve "Clear All" in Filter Panel (should not close panel)
- [x] **[Feat]** OAuth flow (replace manual token)
- [x] **[UI/UX]** Custom favicon (space/flow theme)
- [x] **[DevOps]** Protect main with Husky pre-push/pre-commit hooks
- [x] **[Test]** Refactor test structure (organize by domain/flow)
- [x] **[Test]** Add stub tests for future expansion (api-contract, error-handling, auth-flow)
- [x] **[Docs]** Agent Documentation Overhaul (entry point + 6 sub-workflows)
- [x] **[UI/Refactor]** Split components (AlbumArt, GenreBadges, FilterSelect, PopularitySlider)
- [x] **[Refactor]** Centralize types in @flows/shared (GenreCount, YearCount, SelectOption, YearRange, StatusMessage)
- [x] **[UI/Refactor]** Eliminate all inline types across components
- [x] **[UI/Refactor]** Remove duplicate stores/index.ts
- [x] **[DevOps]** Fix backend path aliases (svelte-check cross-package issue)
- [x] **[Backend/Test]** Fix test type errors (update mocks to satisfy TrackRepository interface)
- [x] **[DevOps]** Split tsconfig.json/tsconfig.build.json for IDE+Tests vs Build
- [x] **[UI/Feat]** Global loading states (isLoading store, toast, skeletons)
