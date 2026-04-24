# Issue: Lyrics Canvas - Next Steps & Polish

This issue tracks the pending refinements for the Lyrics Canvas flow, to be picked up in the next session.

## 1. Routing Bug (F5 Refresh)
**Issue:** When hitting F5 on `#/lyrics?canvasTrackId=XYZ`, the application loads the Landing page or the top of the Lyrics Flow instead of the specific canvas.
**Cause:** In `App.svelte`, the router logic strictly compares `f.route === currentRoute`. When query parameters are present in `currentRoute` (e.g., `#/lyrics?canvasTrackId=123`), the strict equality fails, and it falls back to the default view.
**Action Required:** Update `App.svelte` to strip query parameters from `window.location.hash` before attempting to match the route against `getFlows()`.

## 2. Contextual "Line" Highlights (Hover)
**Issue:** The user wants a more encompassing hover effect for "Meaning". Currently, only the specific words with the `.has-meaning` class highlight on hover.
**Action Required:**
- Modify the DOM structure or add a Javascript hover state so that hovering over ANY word with a meaning annotation highlights the ENTIRE phrase/line that shares that annotation.
- Remove the floating `.layer-meaning` badges entirely (the little text tags like "Dark Humor" at the bottom of the line). Instead, rely purely on the visual underline/glow on the text.
- Move the "Title" or "Label" of the meaning inside the Tooltip UI so no information is lost.

## 3. Persistent Overlap (Chords vs Vocals)
**Issue:** Although we increased line separation, if a single token has BOTH a chord (top) and a vocal/production tag (also top), they overlap each other on the Z-axis.
**Action Required:**
- Rework the `.layer-badge` CSS. Instead of using hardcoded `top: -1.2rem`, implement a stacking context or flex container for annotations above/below words to dynamically push them apart if multiple exist.
- Alternatively, group annotations of the same position in a tooltip, or use distinct positioning (e.g. `top: -2rem` for secondary badges).
