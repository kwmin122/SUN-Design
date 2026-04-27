# Roadmap

## Summary

K-Design Studio v1 is planned as one milestone with five standard-granularity phases. The sequence proves the safe HTML editing loop first, then layers PPT/Figma/Paper-style direct manipulation, Claude Design-level creation modes and context, export fidelity, and the remaining design-system/share/agent-agnostic handoff surfaces. The canonical product north star is `.planning/PRODUCT-NORTH-STAR.md`.

| Phase | Name | Milestone | Complexity | v1 Requirements |
|-------|------|-----------|------------|-----------------|
| Phase 01 | Safe HTML Document Foundation | 1 | High | CORE-02, CORE-03, CORE-04, CORE-05, PREV-01, PREV-03, SEC-01, SEC-02, SEC-03 |
| Phase 02 | Direct Editing, Comments, and Tweaks | 1 | High | EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, TWK-01, TWK-02, TWK-03, TWK-04, TWK-05 |
| Phase 03 | Prompt, Creation Modes, Assets, and Korean Presets | 1 | High | CORE-01, CORE-06, CORE-07, CORE-08, CORE-09, CORE-10, SEC-04, KOR-01, KOR-02 |
| Phase 04 | Responsive Preview and Export Fidelity | 1 | High | PREV-02, EXP-01, EXP-02, EXP-03, EXP-04, EXP-05, EXP-06, KOR-03, QUAL-01 |
| Phase 05 | Design Systems, Sharing, and Agent-Agnostic Handoff | 1 | High | DSGN-01, DSGN-02, DSGN-03, EXP-07, EXP-08, AGENT-01, AGENT-02, SHARE-01, SHARE-02 |

## Phase 01 — Safe HTML Document Foundation

**Goal:** Build the core document model and sandboxed preview path for a single imported or mock-generated HTML artifact, including normalization, persistence, bridge validation, and error reporting.

**Requirements:** CORE-02, CORE-03, CORE-04, CORE-05, PREV-01, PREV-03, SEC-01, SEC-02, SEC-03

**Success Criteria:**
- A user can load a sample or imported HTML artifact and see it render inside a sandboxed iframe without app-origin privileges.
- The artifact is sanitized and normalized so editable elements receive stable node identifiers that persist across reloads.
- A saved document can be closed and reopened with the same base artifact, normalized identifiers, and stored document metadata intact.
- The host app shell exposes a Claude Design-level, agent-agnostic working surface with Chat/Comments, central canvas, top tools, right Tweaks, creation modes, recent designs, examples, design systems, and search, while only the safe fixture/imported artifact path is functional in Phase 01.
- Runtime render errors and console errors from the preview are surfaced in the parent editor UI with enough context to debug the artifact.
- The iframe bridge rejects missing nonce, wrong source, unknown message type, and schema-invalid postMessage payloads.
- Dangerous scripts, inline event handlers, forms, popups, top navigation, and unknown embedded content are stripped or blocked by default.

**Complexity:** High

**Milestone:** 1

**UI hint:** Left Chat/Comments, central sandboxed iframe canvas, top file/share/export/tool controls, and right Tweaks/diagnostics. The surface should look like the full product, but Phase 01 functionality remains fixture/imported HTML only.

## Phase 02 — Direct Editing, Comments, and Tweaks

**Goal:** Add the parent-owned visual editing loop: hover/select editable nodes, apply text/style/layout/tweak patches, keep selection overlays aligned, support undo/redo through a patch log, capture inline comments for targeted changes, and make generated output directly editable like a constrained PPT/Figma/Paper canvas.

**Requirements:** EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, TWK-01, TWK-02, TWK-03, TWK-04, TWK-05

**Success Criteria:**
- Hovering editable text, image, button, and block elements highlights the correct target in the preview.
- Selecting a node shows a visible overlay that remains aligned during iframe scroll, parent resize, and preview re-render.
- Editing selected text updates the preview immediately and records a reversible patch without direct source-code editing.
- Safe style controls update color, typography, spacing, background, border radius, visibility, and image source for selected nodes.
- Undo and redo correctly move backward and forward through text, style, and tweak changes without corrupting stored state.
- Inline comments can target a selected canvas region and persist as part of the project interaction state.
- The user can save the current version and explore an alternate direction without losing the prior iteration.
- Generated text, image, card, section, and slide-like/artboard blocks can be directly manipulated with handles for constrained move, resize, reorder, and alignment operations.
- Global tweak controls from the right-side panel update the iframe preview immediately and persist with the document.
- The tweak schema exposes meaningful controls such as palette, density, font scale, mood, radius, and spacing.
- Live knobs, sliders, and segmented controls update spacing, color, density, and layout without requiring prompt rewrites.
- Tweak changes can propagate to semantically similar sections when the current artifact structure supports it.

**Complexity:** High

**Milestone:** 1

**UI hint:** Parent-owned selection overlay, resize/move handles, alignment guides, section/artboard controls, right-side Tweaks and inspector panel, and toolbar undo/redo controls.

## Phase 03 — Prompt, Creation Modes, Assets, and Korean Presets

**Goal:** Connect document creation to Korean or English prompts, creation modes, fidelity targets, context attachments, and asset handling, then route generated or mock-generated output into the same safe artifact pipeline with Korean-first defaults.

**Requirements:** CORE-01, CORE-06, CORE-07, CORE-08, CORE-09, CORE-10, SEC-04, KOR-01, KOR-02

**Success Criteria:**
- A user can create a new design document from a Korean or English prompt and receive a renderable artifact in the editor.
- A user can choose prototype, slide deck, template-based, or other artifact creation modes before generation.
- A user can choose wireframe or high-fidelity intent before generation.
- A user can attach screenshots, images, existing assets, slide decks/documents, codebase references, and existing design files as project context.
- A user can attach DOCX, PPTX, XLSX, and product/spec documents as source material.
- A user can capture a web page or selected web region as design context.
- Prompt-created artifacts enter the same sanitize, normalize, persist, preview, and edit pipeline as imported artifacts.
- External assets are captured in an asset manifest with verified, cached, or placeholder status shown to the user.
- Generated and sample artifacts use Hangul-safe font stacks, Korean line height, word-break behavior, spacing, and realistic Korean copy rhythm.
- The first preset set includes SaaS/product landing, pitch/explainer deck, and mobile app screen contexts with Korean-first defaults.
- Missing or unverified external assets degrade to explicit placeholder states instead of broken invisible output.

**Complexity:** Medium

**Milestone:** 1

**UI hint:** Prompt composer with mode tabs, wireframe/high-fidelity selection, context attachment actions, Korean-first presets, asset status indicators, and preset cards for the three initial product contexts.

## Phase 04 — Responsive Preview and Export Fidelity

**Goal:** Finish the v1 output contract with deterministic desktop/tablet/mobile preview modes, clean standalone HTML export, PNG/PDF export from stored state, and Korean typography quality flags.

**Requirements:** PREV-02, EXP-01, EXP-02, EXP-03, EXP-04, EXP-05, EXP-06, KOR-03, QUAL-01

**Success Criteria:**
- A user can switch the same artifact between desktop, tablet, and mobile preview widths without losing selection or document state.
- Clean standalone HTML export removes editor bridge scripts, overlays, and editor-only metadata while preserving the materialized design.
- PNG export is generated from a deterministic viewport and matches the stored document state, not transient live iframe mutations.
- PDF export is generated from the rendered artifact with bundled or resolved Korean typography support.
- Export jobs use the saved base artifact, asset manifest, tweak values, and patch log as the source of truth.
- ZIP and PPTX export or handoff surfaces are present and backed by stored state.
- The editor flags obvious Korean typography issues such as overflow, awkward line breaks, unreadable contrast, and generic AI visual defaults.
- The user can request design review for accessibility, contrast, hierarchy, and usability.

**Complexity:** High

**Milestone:** 1

**UI hint:** Preview device switcher, export menu with HTML/PNG/PDF actions, export status feedback, and Korean typography warning badges.

## Phase 05 — Design Systems, Sharing, and Agent-Agnostic Handoff

**Goal:** Close the Claude Design-level capability gaps that are not part of the core artifact editor while avoiding runtime lock-in: design system setup/inheritance/learning, sharing access levels, Canva handoff, and portable coding-agent handoff for Codex, Claude Code, Cursor, local agents, and web agents.

**Requirements:** DSGN-01, DSGN-02, DSGN-03, EXP-07, EXP-08, AGENT-01, AGENT-02, SHARE-01, SHARE-02

**Success Criteria:**
- A user can set up or connect colors, typography, and component patterns as a design system.
- New projects inherit available design-system defaults before generation.
- The app can learn design-system candidates from codebase, brand assets, uploaded references, and existing UI patterns.
- A user can create shareable links with view-only, comment, and edit access levels.
- A user can send or adapt a stored design for Canva.
- A user can hand off the stored artifact to a runtime-agnostic coding-agent workflow that supports Codex, Claude Code, Cursor, local agents, and web agents.
- Design-agent instructions and prompts are stored as portable project files instead of Claude-only hidden prompts or Claude-only extension points.
- Provider/runtime adapters are replaceable so generation, review, and handoff flows are not tied to Anthropic-only APIs or Claude Code-only tooling.

**Complexity:** High

**Milestone:** 1

**UI hint:** Design-system setup card, project sharing controls, access-level selector, Canva handoff, and an agent handoff menu with Codex, Claude Code, Cursor, local-agent, and web-agent targets.

## v1 Requirement Coverage

| REQ-ID | Phase |
|--------|-------|
| CORE-01 | Phase 03 |
| CORE-02 | Phase 01 |
| CORE-03 | Phase 01 |
| CORE-04 | Phase 01 |
| CORE-05 | Phase 01 |
| CORE-06 | Phase 03 |
| CORE-07 | Phase 03 |
| CORE-08 | Phase 03 |
| CORE-09 | Phase 03 |
| CORE-10 | Phase 03 |
| PREV-01 | Phase 01 |
| PREV-02 | Phase 04 |
| PREV-03 | Phase 01 |
| EDIT-01 | Phase 02 |
| EDIT-02 | Phase 02 |
| EDIT-03 | Phase 02 |
| EDIT-04 | Phase 02 |
| EDIT-05 | Phase 02 |
| EDIT-06 | Phase 02 |
| EDIT-07 | Phase 02 |
| EDIT-08 | Phase 02 |
| TWK-01 | Phase 02 |
| TWK-02 | Phase 02 |
| TWK-03 | Phase 02 |
| TWK-04 | Phase 02 |
| TWK-05 | Phase 02 |
| EXP-01 | Phase 04 |
| EXP-02 | Phase 04 |
| EXP-03 | Phase 04 |
| EXP-04 | Phase 04 |
| EXP-05 | Phase 04 |
| EXP-06 | Phase 04 |
| EXP-07 | Phase 05 |
| EXP-08 | Phase 05 |
| AGENT-01 | Phase 05 |
| AGENT-02 | Phase 05 |
| SEC-01 | Phase 01 |
| SEC-02 | Phase 01 |
| SEC-03 | Phase 01 |
| SEC-04 | Phase 03 |
| KOR-01 | Phase 03 |
| KOR-02 | Phase 03 |
| KOR-03 | Phase 04 |
| QUAL-01 | Phase 04 |
| DSGN-01 | Phase 05 |
| DSGN-02 | Phase 05 |
| DSGN-03 | Phase 05 |
| SHARE-01 | Phase 05 |
| SHARE-02 | Phase 05 |

All 49 v1 requirements map to exactly one phase. v2 requirements and out-of-scope items are intentionally excluded from Milestone 1.

---
*Last updated: 2026-04-27 after Milestone 1 completion*
