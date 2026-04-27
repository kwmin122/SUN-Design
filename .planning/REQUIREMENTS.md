# Requirements

## v1 Requirements

### Core

- [ ] **CORE-01**: User can create a new design document from a Korean or English prompt.
- [ ] **CORE-02**: User can import or generate a single HTML artifact that renders successfully in the editor.
- [ ] **CORE-03**: Generated artifacts include or are normalized to stable editable node identifiers.
- [ ] **CORE-04**: User can save and reload a design document without losing edits.
- [ ] **CORE-05**: User starts from a Claude Design-level, agent-agnostic workspace with Chat/Comments, canvas, top tools, right Tweaks, creation modes, recent work, examples, design systems, and search.
- [ ] **CORE-06**: User can choose artifact type before creation, including prototype, slide deck, template-based creation, and other design artifacts.
- [ ] **CORE-07**: User can choose a fidelity target such as wireframe or high fidelity before creating a design.
- [ ] **CORE-08**: User can attach project context such as screenshots, images, assets, existing slide decks/documents, codebase references, and existing design files.
- [ ] **CORE-09**: User can attach or parse DOCX, PPTX, XLSX, and product/spec documents as source material for generated designs or slides.
- [ ] **CORE-10**: User can capture a web page or selected web region as visual context for redesign and reference workflows.

### Preview

- [ ] **PREV-01**: User can preview the artifact in a sandboxed iframe.
- [ ] **PREV-02**: User can switch between at least desktop, tablet, and mobile preview widths.
- [ ] **PREV-03**: Preview runtime reports render errors and console errors to the parent editor.

### Editing

- [ ] **EDIT-01**: User can hover and select editable text, image, button, and block elements in the preview.
- [ ] **EDIT-02**: User can edit selected text content without touching source code.
- [ ] **EDIT-03**: User can edit safe style properties for selected nodes: color, typography, spacing, background, border radius, visibility, and image source.
- [ ] **EDIT-04**: User can undo and redo editor operations through a patch log.
- [ ] **EDIT-05**: User can see a visible selection overlay that stays aligned with the iframe content during scroll and resize.
- [ ] **EDIT-06**: User can leave inline comments on specific canvas regions and route those comments into targeted design changes.
- [ ] **EDIT-07**: User can save the current direction and explore an alternate version without losing the prior iteration.
- [ ] **EDIT-08**: User can directly manipulate generated text, image, card, section, and slide-like/artboard blocks with PPT/Figma/Paper-style handles for constrained move, resize, reorder, and alignment operations.

### Tweaks

- [ ] **TWK-01**: User can adjust global tweak variables from a right-side panel.
- [ ] **TWK-02**: The app can parse or define a tweak schema for meaningful design controls such as palette, density, font scale, mood, radius, and spacing.
- [ ] **TWK-03**: Tweak changes update the iframe preview immediately and persist with the document.
- [ ] **TWK-04**: The app can present live knobs, sliders, or segmented controls for spacing, color, density, and layout without requiring the user to rewrite the prompt.
- [ ] **TWK-05**: Tweak changes can propagate semantically to similar sections instead of applying only isolated one-off CSS edits.

### Export

- [ ] **EXP-01**: User can export a clean standalone HTML package without editor bridge scripts or overlays.
- [ ] **EXP-02**: User can export a PNG screenshot by rendering the stored document state in a deterministic viewport.
- [ ] **EXP-03**: User can export a PDF by rendering the stored document state, not by copying the current live iframe DOM.
- [ ] **EXP-04**: Export output uses stored document state, not ad-hoc live iframe mutations.
- [ ] **EXP-05**: User can export a ZIP package of the stored design artifact.
- [ ] **EXP-06**: User can export or hand off a slide design as PPTX.
- [ ] **EXP-07**: User can send or adapt a design for Canva.
- [ ] **EXP-08**: User can hand off the stored artifact to a runtime-agnostic coding-agent workflow that supports Codex, Claude Code, Cursor, local agents, and web agents.

### Agent Portability

- [ ] **AGENT-01**: Design-agent instructions and prompts are stored as portable project files instead of Claude-only hidden prompts or Claude-only extension points.
- [ ] **AGENT-02**: Provider/runtime adapters are replaceable so core generation, review, and handoff flows are not tied to Anthropic-only APIs or Claude Code-only tooling.

### Security

- [ ] **SEC-01**: Generated/imported HTML is treated as untrusted and rendered inside a sandboxed boundary.
- [ ] **SEC-02**: The iframe bridge only accepts schema-validated postMessage events with a per-frame nonce.
- [ ] **SEC-03**: The app sanitizes or strips dangerous scripts, event handlers, forms, popups, top navigation, and unknown embedded content by default.
- [ ] **SEC-04**: External assets are resolved through an asset manifest and marked as verified, cached, or placeholder.

### Korean Design

- [ ] **KOR-01**: Generated and sample artifacts use Korean-first typography defaults, including Hangul-safe font stacks, line height, word break, spacing, and realistic Korean copy rhythm.
- [ ] **KOR-02**: The first design presets include at least three Korean product contexts: SaaS/product landing, pitch/explainer deck, and mobile app screen.
- [ ] **KOR-03**: The editor can flag obvious Korean typography issues such as overflow, awkward line breaks, unreadable contrast, and generic AI visual defaults.
- [ ] **QUAL-01**: User can ask the design agent to review accessibility, contrast, hierarchy, and usability of the current artifact.

### Design Systems and Sharing

- [ ] **DSGN-01**: User can set up or connect a design system with colors, typography, and component patterns.
- [ ] **DSGN-02**: New projects inherit available design-system defaults before generation.
- [ ] **DSGN-03**: The app can learn or infer design-system candidates from codebase, brand assets, uploaded references, and existing UI patterns.
- [ ] **SHARE-01**: User can create a shareable project link.
- [ ] **SHARE-02**: Shared links support view-only, comment, and edit access levels.

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
| CORE-01 | Phase 03 | planned |
| CORE-02 | Phase 01 | planned |
| CORE-03 | Phase 01 | planned |
| CORE-04 | Phase 01 | planned |
| CORE-05 | Phase 01 | planned |
| CORE-06 | Phase 03 | planned |
| CORE-07 | Phase 03 | planned |
| CORE-08 | Phase 03 | planned |
| CORE-09 | Phase 03 | planned |
| CORE-10 | Phase 03 | planned |
| PREV-01 | Phase 01 | planned |
| PREV-02 | Phase 04 | planned |
| PREV-03 | Phase 01 | planned |
| EDIT-01 | Phase 02 | planned |
| EDIT-02 | Phase 02 | planned |
| EDIT-03 | Phase 02 | planned |
| EDIT-04 | Phase 02 | planned |
| EDIT-05 | Phase 02 | planned |
| EDIT-06 | Phase 02 | planned |
| EDIT-07 | Phase 02 | planned |
| EDIT-08 | Phase 02 | planned |
| TWK-01 | Phase 02 | planned |
| TWK-02 | Phase 02 | planned |
| TWK-03 | Phase 02 | planned |
| TWK-04 | Phase 02 | planned |
| TWK-05 | Phase 02 | planned |
| EXP-01 | Phase 04 | planned |
| EXP-02 | Phase 04 | planned |
| EXP-03 | Phase 04 | planned |
| EXP-04 | Phase 04 | planned |
| EXP-05 | Phase 04 | planned |
| EXP-06 | Phase 04 | planned |
| EXP-07 | Phase 05 | planned |
| EXP-08 | Phase 05 | planned |
| AGENT-01 | Phase 05 | planned |
| AGENT-02 | Phase 05 | planned |
| SEC-01 | Phase 01 | planned |
| SEC-02 | Phase 01 | planned |
| SEC-03 | Phase 01 | planned |
| SEC-04 | Phase 03 | planned |
| KOR-01 | Phase 03 | planned |
| KOR-02 | Phase 03 | planned |
| KOR-03 | Phase 04 | planned |
| QUAL-01 | Phase 04 | planned |
| DSGN-01 | Phase 05 | planned |
| DSGN-02 | Phase 05 | planned |
| DSGN-03 | Phase 05 | planned |
| SHARE-01 | Phase 05 | planned |
| SHARE-02 | Phase 05 | planned |
