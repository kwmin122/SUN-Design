# Requirements

## v1 Requirements

### Core

- [x] **CORE-01**: User can create a new design document from a Korean or English prompt.
- [x] **CORE-02**: User can import or generate a single HTML artifact that renders successfully in the editor.
- [x] **CORE-03**: Generated artifacts include or are normalized to stable editable node identifiers.
- [x] **CORE-04**: User can save and reload a design document without losing edits.
- [x] **CORE-05**: User starts from a Claude Design-level, agent-agnostic workspace with Chat/Comments, canvas, top tools, right Tweaks, creation modes, recent work, examples, design systems, and search.
- [x] **CORE-06**: User can choose artifact type before creation, including prototype, slide deck, template-based creation, and other design artifacts.
- [x] **CORE-07**: User can choose a fidelity target such as wireframe or high fidelity before creating a design.
- [x] **CORE-08**: User can attach project context such as screenshots, images, assets, existing slide decks/documents, codebase references, and existing design files.
- [x] **CORE-09**: User can attach or parse DOCX, PPTX, XLSX, and product/spec documents as source material for generated designs or slides.
- [x] **CORE-10**: User can capture a web page or selected web region as visual context for redesign and reference workflows.

### Preview

- [x] **PREV-01**: User can preview the artifact in a sandboxed iframe.
- [x] **PREV-02**: User can switch between at least desktop, tablet, and mobile preview widths.
- [x] **PREV-03**: Preview runtime reports render errors and console errors to the parent editor.

### Editing

- [x] **EDIT-01**: User can hover and select editable text, image, button, and block elements in the preview.
- [x] **EDIT-02**: User can edit selected text content without touching source code.
- [x] **EDIT-03**: User can edit safe style properties for selected nodes: color, typography, spacing, background, border radius, visibility, and image source.
- [x] **EDIT-04**: User can undo and redo editor operations through a patch log.
- [x] **EDIT-05**: User can see a visible selection overlay that stays aligned with the iframe content during scroll and resize.
- [x] **EDIT-06**: User can leave inline comments on specific canvas regions and route those comments into targeted design changes.
- [x] **EDIT-07**: User can save the current direction and explore an alternate version without losing the prior iteration.
- [x] **EDIT-08**: User can directly manipulate generated text, image, card, section, and slide-like/artboard blocks with PPT/Figma/Paper-style handles for constrained move, resize, reorder, and alignment operations.

### Tweaks

- [x] **TWK-01**: User can adjust global tweak variables from a right-side panel.
- [x] **TWK-02**: The app can parse or define a tweak schema for meaningful design controls such as palette, density, font scale, mood, radius, and spacing.
- [x] **TWK-03**: Tweak changes update the iframe preview immediately and persist with the document.
- [x] **TWK-04**: The app can present live knobs, sliders, or segmented controls for spacing, color, density, and layout without requiring the user to rewrite the prompt.
- [x] **TWK-05**: Tweak changes can propagate semantically to similar sections instead of applying only isolated one-off CSS edits.

### Export

- [x] **EXP-01**: User can export a clean standalone HTML package without editor bridge scripts or overlays.
- [x] **EXP-02**: User can export a PNG screenshot by rendering the stored document state in a deterministic viewport.
- [x] **EXP-03**: User can export a PDF by rendering the stored document state, not by copying the current live iframe DOM.
- [x] **EXP-04**: Export output uses stored document state, not ad-hoc live iframe mutations.
- [x] **EXP-05**: User can export a ZIP package of the stored design artifact.
- [x] **EXP-06**: User can export or hand off a slide design as PPTX.
- [x] **EXP-07**: User can send or adapt a design for Canva.
- [x] **EXP-08**: User can hand off the stored artifact to a runtime-agnostic coding-agent workflow that supports Codex, Claude Code, Cursor, local agents, and web agents.

### Agent Portability

- [x] **AGENT-01**: Design-agent instructions and prompts are stored as portable project files instead of Claude-only hidden prompts or Claude-only extension points.
- [x] **AGENT-02**: Provider/runtime adapters are replaceable so core generation, review, and handoff flows are not tied to Anthropic-only APIs or Claude Code-only tooling.

### Security

- [x] **SEC-01**: Generated/imported HTML is treated as untrusted and rendered inside a sandboxed boundary.
- [x] **SEC-02**: The iframe bridge only accepts schema-validated postMessage events with a per-frame nonce.
- [x] **SEC-03**: The app sanitizes or strips dangerous scripts, event handlers, forms, popups, top navigation, and unknown embedded content by default.
- [x] **SEC-04**: External assets are resolved through an asset manifest and marked as verified, cached, or placeholder.

### Korean Design

- [x] **KOR-01**: Generated and sample artifacts use Korean-first typography defaults, including Hangul-safe font stacks, line height, word break, spacing, and realistic Korean copy rhythm.
- [x] **KOR-02**: The first design presets include at least three Korean product contexts: SaaS/product landing, pitch/explainer deck, and mobile app screen.
- [x] **KOR-03**: The editor can flag obvious Korean typography issues such as overflow, awkward line breaks, unreadable contrast, and generic AI visual defaults.
- [x] **QUAL-01**: User can ask the design agent to review accessibility, contrast, hierarchy, and usability of the current artifact.

### Design Systems and Sharing

- [x] **DSGN-01**: User can set up or connect a design system with colors, typography, and component patterns.
- [x] **DSGN-02**: New projects inherit available design-system defaults before generation.
- [x] **DSGN-03**: The app can learn or infer design-system candidates from codebase, brand assets, uploaded references, and existing UI patterns.
- [x] **SHARE-01**: User can create a shareable project link.
- [x] **SHARE-02**: Shared links support view-only, comment, and edit access levels.

---

## v2 Requirements

- [ ] **AI-01**: User can ask the AI to rewrite or restyle only a selected region.
- [ ] **AI-02**: User can compare multiple generated visual directions side by side.
- [ ] **EXP-09**: User can export rasterized PPTX slides from artboards.
- [ ] **EXP-10**: User can export editable PPTX for a strict subset of text, image, and shape nodes.
- [ ] **EXP-11**: User can export MP4/GIF for authored animation templates.
- [ ] **COLL-01**: Multiple users can comment or collaborate on the same document.
- [ ] **DSGN-04**: User can maintain project-level design skills, brand rules, and reusable presets beyond the core design-system setup.
- [ ] **DATA-01**: Documents can sync between local storage and a hosted account.
- [ ] **LAY-01**: User can perform advanced freeform layout authoring beyond the constrained v1 direct-manipulation subset.
- [ ] **REG-01**: Patches can be replayed across AI-regenerated base revisions with conflict handling.

---

## Out of Scope

- Full Figma vector/path editor - too broad for the first vertical slice; v1 still requires constrained Figma/Paper-like canvas manipulation of generated HTML blocks.
- Full PPT authoring suite - distracts from HTML-native editing; v1 still requires slide-like/artboard block editing and PPTX handoff/export.
- Public marketplace/templates store - distribution comes after core editing/export is trustworthy.
- Realtime multiplayer editing - requires stable operation semantics first.
- Native desktop app packaging - web app is enough to prove the product loop.
- Verbatim leaked Claude Design prompt cloning - legal and ethical risk.
- Commercial reuse of Huashu Design files/templates - license restricts company/team/commercial use without authorization.
- Pixel-perfect Figma export - defer until HTML editing and export are stable.

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CORE-01 | Phase 03 | complete |
| CORE-02 | Phase 01 | complete |
| CORE-03 | Phase 01 | complete |
| CORE-04 | Phase 01 | complete |
| CORE-05 | Phase 01 | complete |
| CORE-06 | Phase 03 | complete |
| CORE-07 | Phase 03 | complete |
| CORE-08 | Phase 03 | complete |
| CORE-09 | Phase 03 | complete |
| CORE-10 | Phase 03 | complete |
| PREV-01 | Phase 01 | complete |
| PREV-02 | Phase 04 | complete |
| PREV-03 | Phase 01 | complete |
| EDIT-01 | Phase 02 | complete |
| EDIT-02 | Phase 02 | complete |
| EDIT-03 | Phase 02 | complete |
| EDIT-04 | Phase 02 | complete |
| EDIT-05 | Phase 02 | complete |
| EDIT-06 | Phase 02 | complete |
| EDIT-07 | Phase 02 | complete |
| EDIT-08 | Phase 02 | complete |
| TWK-01 | Phase 02 | complete |
| TWK-02 | Phase 02 | complete |
| TWK-03 | Phase 02 | complete |
| TWK-04 | Phase 02 | complete |
| TWK-05 | Phase 02 | complete |
| EXP-01 | Phase 04 | complete |
| EXP-02 | Phase 04 | complete |
| EXP-03 | Phase 04 | complete |
| EXP-04 | Phase 04 | complete |
| EXP-05 | Phase 04 | complete |
| EXP-06 | Phase 04 | complete |
| EXP-07 | Phase 05 | complete |
| EXP-08 | Phase 05 | complete |
| AGENT-01 | Phase 05 | complete |
| AGENT-02 | Phase 05 | complete |
| SEC-01 | Phase 01 | complete |
| SEC-02 | Phase 01 | complete |
| SEC-03 | Phase 01 | complete |
| SEC-04 | Phase 03 | complete |
| KOR-01 | Phase 03 | complete |
| KOR-02 | Phase 03 | complete |
| KOR-03 | Phase 04 | complete |
| QUAL-01 | Phase 04 | complete |
| DSGN-01 | Phase 05 | complete |
| DSGN-02 | Phase 05 | complete |
| DSGN-03 | Phase 05 | complete |
| SHARE-01 | Phase 05 | complete |
| SHARE-02 | Phase 05 | complete |
