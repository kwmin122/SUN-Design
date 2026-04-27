# PITFALLS Research: Claude Design-Grade HTML Design Editor

## Scope

Greenfield, solo-builder HTML design editor aimed at Claude Design-grade output: prompt-to-HTML artifacts, visual preview, constrained editing, asset handling, and export. This is not a full Figma clone.

Assumed phase ladder:

- P0: Product contract and legal guardrails
- P1: Static HTML preview, project model, import/export baseline
- P2: Constrained editing model: select, inspect, text/style edits
- P3: AI generation and verified asset pipeline
- P4: Export fidelity and visual regression gate
- P5: Advanced editor features only after proof: layout tools, variants, collaboration

## Ranked First-Month Risks

| Rank | Risk | L | I | Score | Why it fails early | Phase mitigations |
|---:|---|---:|---:|---:|---|---|
| 1 | Trying to clone Figma | 5 | 5 | 25 | Burns month one on layers, auto-layout, vector tools, multiplayer, plugins, comments, constraints, and file format problems before proving the core HTML-native loop. | P0: define non-goals. P1-P2: support only HTML artifact preview plus a small editable block/property set. P5: defer canvas-grade features until editing/export are reliable. |
| 2 | Generated HTML is not safely mutable | 5 | 4 | 20 | One-shot AI HTML looks good but has no stable IDs, semantic nodes, editable regions, asset manifest, or round-trip contract. Every later edit becomes brittle string surgery. | P1: store a project manifest, AST/DOM snapshot, stable node IDs, asset references, and original source. P2: edits operate on structured nodes, not raw text replacement. Add round-trip fixtures. |
| 3 | Arbitrary HTML security | 4 | 5 | 20 | A design editor must render user/AI HTML, which can include scripts, event handlers, external URLs, iframes, CSS exfiltration patterns, and unsafe DOM sinks. | P0: threat model untrusted HTML. P1: render documents on a separate origin in a sandboxed iframe. P1-P2: sanitize imported HTML with an allowlist. P3: treat LLM output as untrusted. P4: security regression corpus. |
| 4 | Iframe editing traps | 4 | 4 | 16 | Direct iframe/contenteditable editing creates selection, undo/redo, focus, cross-origin, paste, and DOM mutation edge cases. `execCommand` is deprecated but still tempting because it preserves browser undo. | P1: iframe is preview/runtime, not source of truth. P2: parent app owns selection overlays and sends typed edit commands through `postMessage`. Avoid rich in-frame editing except text islands. |
| 5 | Export fidelity mismatch | 4 | 4 | 16 | Browser preview, PNG, PDF, PPTX, SVG, and Figma import do not share one rendering model. Fonts, CORS images, animations, fractional pixels, media timing, and platform differences break trust. | P1: choose one primary export, likely browser-rendered PNG/PDF screenshot. P4: add deterministic render environment, bundled fonts/assets, golden fixtures, and screenshot comparison. Keep v1 PPTX rasterized from stored state; defer semantic editable PPTX/Figma round-trip until preview fidelity is stable. |
| 6 | AI hallucinated or unlicensed assets | 4 | 4 | 16 | Models invent logos, image URLs, product shots, icon sets, fonts, data, and brand colors. Broken links and rights problems show up late during export or public use. | P3: asset resolver verifies existence, downloads/caches assets, records source/license, and marks unknown assets as placeholders. Require user upload or verified official source for brand work. |
| 7 | Claude Design prompt / huashu-design contamination | 3 | 5 | 15 | Building from leaked Claude Design prompts or huashu-design internals can create IP/licensing exposure. Huashu explicitly restricts company/team/commercial use without authorization, and its README says a core protocol was derived from circulated Claude Design prompts. | P0: clean-room rule. Do not copy leaked prompts, command structure, text, templates, or proprietary workflow names. Capture only independently stated product requirements and public behavioral observations. Keep source log. |
| 8 | Solo-builder overreach | 5 | 3 | 15 | The editor, AI agent, renderer, asset system, export stack, and security sandbox are each separate products. Building all at once yields a demo with no dependable path to editing. | P0: one-month proof is "generate or import HTML, select/edit constrained parts, export trusted image/PDF." P1-P4: one vertical slice. P5: park collaboration, plugin ecosystem, vector drawing, Figma round-trip, and full design-system authoring. |

## Pitfall Notes

### 1. Do not clone Figma in month one

The product should be HTML-native, not a general vector design suite. The early wedge is: AI/user produces HTML, the app previews it, user makes constrained edits, and the app exports faithfully. Figma-class surfaces that should be explicit non-goals in P0:

- Freeform vector/path editing
- Auto-layout parity
- Multiplayer cursors/comments/history
- Plugin runtime
- Full constraints/responsive design authoring
- Component variants and design-token governance
- Semantic editable Figma/PPTX round-trip editing

### 2. HTML mutability must be designed before AI generation

The editor needs a "mutable artifact contract":

- Every editable node has a stable `data-node-id`
- Source HTML, normalized DOM, asset manifest, and design metadata are versioned together
- AI may generate only through a schema: pages, frames, text nodes, image nodes, components, styles, interactions
- Raw full-file regeneration is allowed only as a new version, not as an in-place edit
- DOM diff tests prove that simple edits preserve unrelated nodes

### 3. Treat the iframe as a runtime boundary, not the editor model

The iframe should render the artifact and report geometry. It should not become the authoritative editor. The parent app should own:

- Selection state
- Property inspector values
- Undo/redo command stack
- Save/version history
- Sanitization and import normalization
- Export orchestration

The iframe should expose a narrow message protocol: ready, node geometry, selected node, pointer hit, runtime error, and requested navigation.

### 4. Security baseline for arbitrary HTML

Minimum P1 security posture:

- Serve rendered artifacts from a separate origin or opaque sandbox where possible
- Use iframe `sandbox`; avoid combining same-origin user content with both `allow-scripts` and `allow-same-origin`
- Default to no scripts for imported/generated documents
- Sanitize imported HTML with a positive allowlist
- Strip event handlers, dangerous URLs, inline script, external script, unknown iframe/embed/object tags, and unexpected forms
- Use CSP and Trusted Types where supported
- Never pass LLM HTML directly to `innerHTML` or similar sinks without sanitization

### 5. Export fidelity needs a contract, not hope

Define an export matrix in P1:

| Export | Month-one stance |
|---|---|
| PNG | Primary, browser-rendered screenshot from fixed viewport |
| PDF | Primary or secondary, fixed viewport/pages only |
| SVG | Only for simple static vector-ish scenes |
| PPTX | v1 raster slide export only; defer semantic editability unless it is a strict subset |
| Figma | Defer; export image or HTML package first |
| MP4/GIF | Defer unless animation is the core product |

P4 verification should include fixed fonts, local asset cache, deterministic viewport, animation freeze point, dark/light snapshots, and golden examples for text overflow, image CORS, transforms, and responsive breakpoints.

### 6. AI asset handling must be boring

Do not let the model "just use Unsplash/Wikipedia/logo URL" directly in final artifacts. Route every asset through:

1. Candidate source
2. Fetch/HEAD check
3. MIME and dimension check
4. License/source metadata
5. Local cache
6. Broken/unknown placeholder state

For brand work, require one of: user-provided brand assets, official brand/press page, existing product screenshots, or explicit "use placeholders" acceptance.

### 7. Clean-room legal posture

Avoid prompt-leak dependence even if public mirrors exist. The safe path is to independently specify behaviors:

- "Ask for missing context before generating"
- "Use existing brand/design assets before inventing"
- "Show early draft before polishing"
- "Verify rendered artifact before done"

Do not copy leaked prompt text, internal command structures, hidden tool policy, proprietary naming, or huashu-design files/templates into the product. Keep a source log separating public docs, user requirements, and original implementation decisions.

## Phase Mitigation Map

| Phase | Required mitigation before moving on |
|---|---|
| P0 | Written non-goals, clean-room rule, threat model, first-month proof definition |
| P1 | Preview iframe boundary, artifact schema, stable IDs, asset manifest, primary export target |
| P2 | Constrained edit commands, parent-owned undo/redo, DOM round-trip tests, text/style/image edits only |
| P3 | LLM output validator, asset resolver/cache, source/license metadata, placeholder fallback |
| P4 | Deterministic renderer, screenshot/golden export tests, security corpus, broken asset tests |
| P5 | Only then consider advanced layout, variants, animation export, semantic Figma/PPTX bridge, collaboration |

## Sources Checked

- MDN iframe sandbox and same-origin warnings: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- MDN same-origin policy: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy
- MDN `execCommand` deprecation and injection-sink warning: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
- OWASP XSS prevention and HTML sanitization guidance: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP LLM Top 10: improper output handling and system prompt leakage categories: https://genai.owasp.org/llm-top-10/
- MDN cross-origin media and canvas tainting: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin
- Playwright visual comparison notes on rendering variability: https://playwright.dev/docs/test-snapshots
- huashu-design README and license: https://github.com/alchaincyf/huashu-design
