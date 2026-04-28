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
| Phase 06 | Canvas and Component Model | 2 | High | CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-05 |
| Phase 07 | Design System, Tokens, and Code Connect | 2 | High | DSGN-04, DSGN-05, DSGN-06, DSGN-07, DSGN-08 |
| Phase 08 | Prototyping, Slides, and AI Variations | 2 | High | AI-01, AI-02, AI-03, AI-04, AI-05, PROTO-01, PROTO-02, PROTO-03, SLIDE-01, SLIDE-02, SLIDE-03 |
| Phase 09 | Context Ingestion, Live Data, and Assets | 2 | High | CTX-01, CTX-02, CTX-03, DATA-01, DATA-02, ASSET-01 |
| Phase 10 | Dev Mode, Publish, and Export Fidelity | 2 | High | DEV-01, DEV-02, DEV-03, DEV-04, EXP-09, EXP-10, EXP-11, EXP-12, SLIDE-04, SLIDE-05 |
| Phase 11 | Collaboration, Search, and Governance | 2 | High | HOME-01, HOME-02, HOME-03, COLL-01, COLL-02, COLL-03, COLL-04, QUAL-02, REG-01 |

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

## Milestone 2 Competitive Parity Reinforcement

**Source:** `.planning/research/COMPETITIVE-GAP-REVIEW.md`

**Goal:** Close the remaining Paper/Claude Design/Figma capability gaps without invalidating the Milestone 1 architecture. Milestone 2 turns the working v1 vertical slice into a professional design workspace: explicit canvas objects, reusable components, governed design systems, real context ingestion, interaction authoring, dev-mode handoff, publish/export fidelity, and collaboration/search governance.

**Rule:** Milestone 2 remains additive. A phase may refine v1 data models, but it must preserve `ProjectBundle + EditGraph + patch log + assets + tweak values` as the durable source-of-truth family.

## Phase 06 — Canvas and Component Model

**Goal:** Promote normalized HTML nodes into explicit canvas objects and reusable component instances while preserving HTML/CSS as the exportable substrate.

**Requirements:** CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-05

**Success Criteria:**
- A user can see and manipulate pages, artboards, frames, sections, component instances, text, image, and vector-like nodes as distinct canvas objects.
- A layer tree supports select, reorder, group, hide, lock, rename, and object hierarchy inspection.
- Constraints, snapping, guides, and resize rules persist through reload and export.
- Flex, CSS Grid, gap, padding, alignment, and breakpoint controls emit typed operations, not live DOM saves.
- Component instances preserve slots, props, variants, overrides, and state in the stored artifact package.

**Complexity:** High

**Milestone:** 2

**UI hint:** Layer tree, object breadcrumb, alignment/snapping guides, frame controls, component instance inspector, variant/prop controls.

## Phase 07 — Design System, Tokens, and Code Connect

**Goal:** Turn the design-system placeholder into a governed, versioned, code-connected system that can be reused across projects and agents.

**Requirements:** DSGN-04, DSGN-05, DSGN-06, DSGN-07, DSGN-08

**Success Criteria:**
- A user can review extracted colors, typography, spacing, components, and layout patterns before publishing a design system.
- A user can publish, remix, version, roll back, and attach project-specific design skills or brand rules.
- Tokens map to CSS variables, Tailwind classes, and code-component references.
- Component playground lets the user inspect variants, props, variable modes, and states without mutating the main canvas.
- Storybook/GitHub/docs links remain visible in design-system records and agent handoff packages.

**Complexity:** High

**Milestone:** 2

**UI hint:** Design-system library, token table, component playground, publish/remix/version controls, source-link inspector.

## Phase 08 — Prototyping, Slides, and AI Variations

**Goal:** Add real prototype interactions, deck authoring, and localized AI variation workflows on top of the canvas model.

**Requirements:** AI-01, AI-02, AI-03, AI-04, AI-05, PROTO-01, PROTO-02, PROTO-03, SLIDE-01, SLIDE-02, SLIDE-03

**Success Criteria:**
- A user can define click, hover, tap, keyboard, and timed interactions between objects and artboards.
- Component state can use variables, conditionals, and state sharing across matching components.
- Presentation mode can preview interactions without losing edit state.
- Slide decks support slide view, grid view, outline navigation, presenter notes, embedded prototype blocks, comments, polls, voting, or alignment-scale primitives.
- The user can generate side-by-side variations and selected-region AI edits while preserving surrounding layout and provenance.
- Canvas-aware agent actions emit typed operations and can be exported as portable prompt/script recipes.

**Complexity:** High

**Milestone:** 2

**UI hint:** Prototype graph panel, interaction inspector, slide/grid toggle, presenter notes, variation compare view, right-click remix action.

## Phase 09 — Context Ingestion, Live Data, and Assets

**Goal:** Replace placeholder context records with real source ingestion, provenance, editable live snapshots, and data-bound content.

**Requirements:** CTX-01, CTX-02, CTX-03, DATA-01, DATA-02, ASSET-01

**Success Criteria:**
- Images, screenshots, URLs, DOCX, PPTX, XLSX, Figma exports, and codebase folders enter structured project context with validation results.
- Each project can generate `source-notes.md` and `design-context.md` with source URLs, asset paths, uncertain facts, and usage rights.
- A live web page or selected region can be captured into editable canvas sections with source provenance.
- Components can bind to CSV, spreadsheet, API fixture, or static JSON data and preview realistic repeated content.
- Assets can be cached, relinked, replaced, audited, and served through stable project URLs.

**Complexity:** High

**Milestone:** 2

**UI hint:** Context ingestion queue, source-notes/design-context viewer, web snapshot tool, data-binding panel, asset provenance inspector.

## Phase 10 — Dev Mode, Publish, and Export Fidelity

**Goal:** Add Figma Dev Mode-style inspection, ready-for-dev state, version comparison, real file exports, publish previews, and code-agent roundtrip.

**Requirements:** DEV-01, DEV-02, DEV-03, DEV-04, EXP-09, EXP-10, EXP-11, EXP-12, SLIDE-04, SLIDE-05

**Success Criteria:**
- A user can inspect selected objects for measurements, spacing, CSS, tokens, accessibility notes, component metadata, and prototype interactions.
- A user can copy code snippets or token references from the selected object.
- Frames and components can be marked ready for dev and compared across saved versions.
- Detected assets can be downloaded with original metadata.
- HTML, ZIP, PNG, PDF, PPTX, and animation exports materialize real files from stored state and pass deterministic visual-diff checks.
- A responsive hosted preview or static site can be published from stored artifact state.
- GitHub/code-agent packages can roundtrip code-side changes back into the artifact package.

**Complexity:** High

**Milestone:** 2

**UI hint:** Dev Mode toggle, inspect panel, code/token drawer, ready-for-dev badges, version diff, publish/export queue.

## Phase 11 — Collaboration, Search, and Governance

**Goal:** Make the workspace navigable and team-ready without losing the local-first path.

**Requirements:** HOME-01, HOME-02, HOME-03, COLL-01, COLL-02, COLL-03, COLL-04, QUAL-02, REG-01

**Success Criteria:**
- A user can browse recent designs, examples, templates, design systems, folders, tags, and ownership/status metadata.
- Search can find designs by name, tag, source asset, design system, artifact type, and semantic content.
- Sharing supports roles, review states, approvals, activity, annotations, implementation notes, and audit logs.
- Optional real-time collaboration can add presence, follow/spotlight, and conflict handling after single-user operations are stable.
- Quality gates detect accessibility, contrast, overflow, responsive breakage, source provenance gaps, and generic AI visual patterns.
- Patches can be replayed across AI-regenerated base revisions with explicit conflict handling.

**Complexity:** High

**Milestone:** 2

**UI hint:** Project browser, smart search, folders/tags, activity/review rail, presence/follow controls, quality-gate dashboard.

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
