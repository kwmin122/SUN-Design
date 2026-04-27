# Requirements

## v1 Requirements

### Core

- [ ] **CORE-01**: User can create a new design document from a Korean or English prompt.
- [ ] **CORE-02**: User can import or generate a single HTML artifact that renders successfully in the editor.
- [ ] **CORE-03**: Generated artifacts include or are normalized to stable editable node identifiers.
- [ ] **CORE-04**: User can save and reload a design document without losing edits.

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

### Tweaks

- [ ] **TWK-01**: User can adjust global tweak variables from a right-side panel.
- [ ] **TWK-02**: The app can parse or define a tweak schema for meaningful design controls such as palette, density, font scale, mood, radius, and spacing.
- [ ] **TWK-03**: Tweak changes update the iframe preview immediately and persist with the document.

### Export

- [ ] **EXP-01**: User can export a clean standalone HTML package without editor bridge scripts or overlays.
- [ ] **EXP-02**: User can export a PNG screenshot by rendering the stored document state in a deterministic viewport.
- [ ] **EXP-03**: User can export a PDF by rendering the stored document state, not by copying the current live iframe DOM.
- [ ] **EXP-04**: Export output uses stored document state, not ad-hoc live iframe mutations.

### Security

- [ ] **SEC-01**: Generated/imported HTML is treated as untrusted and rendered inside a sandboxed boundary.
- [ ] **SEC-02**: The iframe bridge only accepts schema-validated postMessage events with a per-frame nonce.
- [ ] **SEC-03**: The app sanitizes or strips dangerous scripts, event handlers, forms, popups, top navigation, and unknown embedded content by default.
- [ ] **SEC-04**: External assets are resolved through an asset manifest and marked as verified, cached, or placeholder.

### Korean Design

- [ ] **KOR-01**: Generated and sample artifacts use Korean-first typography defaults, including Hangul-safe font stacks, line height, word break, spacing, and realistic Korean copy rhythm.
- [ ] **KOR-02**: The first design presets include at least three Korean product contexts: SaaS/product landing, pitch/explainer deck, and mobile app screen.
- [ ] **KOR-03**: The editor can flag obvious Korean typography issues such as overflow, awkward line breaks, unreadable contrast, and generic AI visual defaults.

---

## v2 Requirements

- [ ] **AI-01**: User can ask the AI to rewrite or restyle only a selected region.
- [ ] **AI-02**: User can compare multiple generated visual directions side by side.
- [ ] **EXP-05**: User can export rasterized PPTX slides from artboards.
- [ ] **EXP-06**: User can export editable PPTX for a strict subset of text, image, and shape nodes.
- [ ] **EXP-07**: User can export MP4/GIF for authored animation templates.
- [ ] **COLL-01**: Multiple users can comment or collaborate on the same document.
- [ ] **DSGN-01**: User can maintain project-level design skills, brand rules, and reusable presets.
- [ ] **DATA-01**: Documents can sync between local storage and a hosted account.
- [ ] **LAY-01**: User can drag/resize blocks with snap lines and simple layout constraints.
- [ ] **REG-01**: Patches can be replayed across AI-regenerated base revisions with conflict handling.

---

## Out of Scope

- Full Figma vector/path editor - too broad for the first vertical slice.
- Full PPT authoring suite - distracts from HTML-native editing.
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
| PREV-01 | Phase 01 | planned |
| PREV-02 | Phase 04 | planned |
| PREV-03 | Phase 01 | planned |
| EDIT-01 | Phase 02 | planned |
| EDIT-02 | Phase 02 | planned |
| EDIT-03 | Phase 02 | planned |
| EDIT-04 | Phase 02 | planned |
| EDIT-05 | Phase 02 | planned |
| TWK-01 | Phase 02 | planned |
| TWK-02 | Phase 02 | planned |
| TWK-03 | Phase 02 | planned |
| EXP-01 | Phase 04 | planned |
| EXP-02 | Phase 04 | planned |
| EXP-03 | Phase 04 | planned |
| EXP-04 | Phase 04 | planned |
| SEC-01 | Phase 01 | planned |
| SEC-02 | Phase 01 | planned |
| SEC-03 | Phase 01 | planned |
| SEC-04 | Phase 03 | planned |
| KOR-01 | Phase 03 | planned |
| KOR-02 | Phase 03 | planned |
| KOR-03 | Phase 04 | planned |
