# Roadmap

## Summary

K-Design Studio v1 is planned as one milestone with four standard-granularity phases. The sequence proves the safe HTML editing loop first, then layers direct manipulation, prompt/Korean design identity, and export fidelity.

| Phase | Name | Milestone | Complexity | v1 Requirements |
|-------|------|-----------|------------|-----------------|
| Phase 01 | Safe HTML Document Foundation | 1 | High | CORE-02, CORE-03, CORE-04, PREV-01, PREV-03, SEC-01, SEC-02, SEC-03 |
| Phase 02 | Direct Editing and Tweaks | 1 | High | EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, TWK-01, TWK-02, TWK-03 |
| Phase 03 | Prompt, Assets, and Korean Presets | 1 | Medium | CORE-01, SEC-04, KOR-01, KOR-02 |
| Phase 04 | Responsive Preview and Export Fidelity | 1 | High | PREV-02, EXP-01, EXP-02, EXP-03, EXP-04, KOR-03 |

## Phase 01 — Safe HTML Document Foundation

**Goal:** Build the core document model and sandboxed preview path for a single imported or mock-generated HTML artifact, including normalization, persistence, bridge validation, and error reporting.

**Requirements:** CORE-02, CORE-03, CORE-04, PREV-01, PREV-03, SEC-01, SEC-02, SEC-03

**Success Criteria:**
- A user can load a sample or imported HTML artifact and see it render inside a sandboxed iframe without app-origin privileges.
- The artifact is sanitized and normalized so editable elements receive stable node identifiers that persist across reloads.
- A saved document can be closed and reopened with the same base artifact, normalized identifiers, and stored document metadata intact.
- Runtime render errors and console errors from the preview are surfaced in the parent editor UI with enough context to debug the artifact.
- The iframe bridge rejects missing nonce, wrong source, unknown message type, and schema-invalid postMessage payloads.
- Dangerous scripts, inline event handlers, forms, popups, top navigation, and unknown embedded content are stripped or blocked by default.

**Complexity:** High

**Milestone:** 1

**UI hint:** Main shell with a document/import entry point, central sandboxed iframe preview, and a compact preview diagnostics area.

## Phase 02 — Direct Editing and Tweaks

**Goal:** Add the parent-owned visual editing loop: hover/select editable nodes, apply text/style/tweak patches, keep selection overlays aligned, and support undo/redo through a patch log.

**Requirements:** EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, TWK-01, TWK-02, TWK-03

**Success Criteria:**
- Hovering editable text, image, button, and block elements highlights the correct target in the preview.
- Selecting a node shows a visible overlay that remains aligned during iframe scroll, parent resize, and preview re-render.
- Editing selected text updates the preview immediately and records a reversible patch without direct source-code editing.
- Safe style controls update color, typography, spacing, background, border radius, visibility, and image source for selected nodes.
- Undo and redo correctly move backward and forward through text, style, and tweak changes without corrupting stored state.
- Global tweak controls from the right-side panel update the iframe preview immediately and persist with the document.
- The tweak schema exposes meaningful controls such as palette, density, font scale, mood, radius, and spacing.

**Complexity:** High

**Milestone:** 1

**UI hint:** Parent-owned selection overlay, right-side Tweaks and inspector panel, and toolbar undo/redo controls.

## Phase 03 — Prompt, Assets, and Korean Presets

**Goal:** Connect document creation to Korean or English prompts, route generated or mock-generated output into the same safe artifact pipeline, and establish Korean-first defaults, presets, and asset manifest handling.

**Requirements:** CORE-01, SEC-04, KOR-01, KOR-02

**Success Criteria:**
- A user can create a new design document from a Korean or English prompt and receive a renderable artifact in the editor.
- Prompt-created artifacts enter the same sanitize, normalize, persist, preview, and edit pipeline as imported artifacts.
- External assets are captured in an asset manifest with verified, cached, or placeholder status shown to the user.
- Generated and sample artifacts use Hangul-safe font stacks, Korean line height, word-break behavior, spacing, and realistic Korean copy rhythm.
- The first preset set includes SaaS/product landing, pitch/explainer deck, and mobile app screen contexts with Korean-first defaults.
- Missing or unverified external assets degrade to explicit placeholder states instead of broken invisible output.

**Complexity:** Medium

**Milestone:** 1

**UI hint:** Prompt composer with Korean-first presets, asset status indicators, and preset cards for the three initial product contexts.

## Phase 04 — Responsive Preview and Export Fidelity

**Goal:** Finish the v1 output contract with deterministic desktop/tablet/mobile preview modes, clean standalone HTML export, PNG/PDF export from stored state, and Korean typography quality flags.

**Requirements:** PREV-02, EXP-01, EXP-02, EXP-03, EXP-04, KOR-03

**Success Criteria:**
- A user can switch the same artifact between desktop, tablet, and mobile preview widths without losing selection or document state.
- Clean standalone HTML export removes editor bridge scripts, overlays, and editor-only metadata while preserving the materialized design.
- PNG export is generated from a deterministic viewport and matches the stored document state, not transient live iframe mutations.
- PDF export is generated from the rendered artifact with bundled or resolved Korean typography support.
- Export jobs use the saved base artifact, asset manifest, tweak values, and patch log as the source of truth.
- The editor flags obvious Korean typography issues such as overflow, awkward line breaks, unreadable contrast, and generic AI visual defaults.

**Complexity:** High

**Milestone:** 1

**UI hint:** Preview device switcher, export menu with HTML/PNG/PDF actions, export status feedback, and Korean typography warning badges.

## v1 Requirement Coverage

| REQ-ID | Phase |
|--------|-------|
| CORE-01 | Phase 03 |
| CORE-02 | Phase 01 |
| CORE-03 | Phase 01 |
| CORE-04 | Phase 01 |
| PREV-01 | Phase 01 |
| PREV-02 | Phase 04 |
| PREV-03 | Phase 01 |
| EDIT-01 | Phase 02 |
| EDIT-02 | Phase 02 |
| EDIT-03 | Phase 02 |
| EDIT-04 | Phase 02 |
| EDIT-05 | Phase 02 |
| TWK-01 | Phase 02 |
| TWK-02 | Phase 02 |
| TWK-03 | Phase 02 |
| EXP-01 | Phase 04 |
| EXP-02 | Phase 04 |
| EXP-03 | Phase 04 |
| EXP-04 | Phase 04 |
| SEC-01 | Phase 01 |
| SEC-02 | Phase 01 |
| SEC-03 | Phase 01 |
| SEC-04 | Phase 03 |
| KOR-01 | Phase 03 |
| KOR-02 | Phase 03 |
| KOR-03 | Phase 04 |

All 26 v1 requirements map to exactly one phase. v2 requirements and out-of-scope items are intentionally excluded from Milestone 1.

---
*Last updated: 2026-04-27 after roadmap creation*
