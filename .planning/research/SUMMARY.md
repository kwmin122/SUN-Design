## Recommended stack

- Use a TypeScript monorepo: `apps/web`, `apps/export-worker`, `packages/editor-core`, `packages/preview-runtime`, `packages/export`, `packages/ui`, `packages/shared`.
- Web app: Next.js App Router, React, TypeScript, Tailwind, shadcn/Radix, lucide icons.
- Editor state: `ProjectBundle + EditGraph + EditPatch[]`; Zustand for client editor/session state, TanStack Query for server/export job state.
- Preview: sandboxed iframe with an injected bridge that reports hit targets, layout snapshots, selection, text edit events, and runtime errors over validated `postMessage`.
- HTML/CSS handling: sanitize and normalize generated HTML with stable `data-cdx-id` attributes; use `parse5` plus PostCSS or similar AST tooling.
- Overlay/editing: parent-side selection overlay and `react-moveable` for later drag/resize/rotate; Tweaks panel emits typed patches, not DOM/string edits.
- Persistence: Postgres plus Drizzle, object storage for assets/exports/snapshots, operation log plus periodic snapshots; keep future CRDT optional.
- Export: standalone HTML/ZIP first; PNG/PDF via Playwright in a separate worker container with bundled Korean fonts and deterministic viewport; raster PPTX and portable agent handoff in v1; defer semantic editable PPTX/Figma round-trip and MP4.
- AI/runtime boundary: one provider/runtime adapter behind the app API; model output must validate into `GeneratedArtifact`, `EditPatch[]`, or `BaseRevisionProposal`. The artifact package, not Claude Code-specific state, is the durable cross-agent contract.

## Table stakes v1

- Korean prompt composer backed by a mock or single generation provider.
- One generated or imported HTML artifact normalized into editable nodes with stable IDs and asset metadata.
- Sandboxed iframe preview that renders the artifact without app-origin privileges.
- Element hover/select via iframe bridge and parent overlay.
- Direct text editing for hardcoded text nodes.
- Right Tweaks panel with global artifact controls and selected-node controls.
- Safe style edits for 5-8 properties: color, font size/weight, align, spacing, radius, background, image replace, visibility.
- AI-emitted tweak variables such as brand color, density, mood, radius, section spacing, and font scale.
- Patch log with undo/redo and reload persistence.
- Clean HTML export from stored state, not copied from the live iframe.
- PNG/PDF export after HTML export works.
- Responsive preview modes for desktop/tablet/mobile.
- Korean typography defaults: Hangul-safe fonts, line height, word breaking, spacing, and sample content.

## Dominant architecture pattern

- Choose `HTML base + EditGraph + patch log`.
- Source of truth: normalized project model and typed operation log.
- Projection: sandboxed iframe DOM.
- Interaction shell: parent overlay plus Tweaks panel.
- Export source: materialized stored state, not live iframe mutation.
- Flow: prompt/import -> sanitize/normalize -> inject IDs -> build `EditGraph` -> render iframe -> bridge reports layout/selection -> user or agent emits typed patch -> store appends patch -> preview applies patch -> exporter materializes clean output.
- This pattern preserves the flexibility of arbitrary generated HTML while avoiding brittle live-DOM persistence.
- Reject live iframe DOM as source of truth except for throwaway demos.
- Defer strict component DSL until a later controlled-design-system product direction is proven.
- First build proof: prompt or sample HTML -> normalized iframe preview -> select element -> edit in Tweaks panel -> reload with patch preserved -> export clean HTML.

## Top risks and mitigations

- Figma-clone scope creep: define non-goals in P0; exclude vector tools, full auto layout, multiplayer, plugins, variants, semantic editable Figma/PPTX round-trip, and advanced layout authoring from v1.
- Generated HTML is not safely mutable: require stable IDs, node classification, asset manifest, editable prop schema, patch log, and round-trip fixtures before expanding AI generation.
- Arbitrary HTML security: treat all model/user HTML as untrusted; sanitize with an allowlist, strip scripts/event handlers/dangerous URLs, use sandboxed iframe without same-origin access, validate bridge messages by source/nonce/schema.
- Iframe editing traps: iframe reports geometry and hosts limited text islands only; parent owns selection, undo/redo, inspector state, persistence, and export orchestration.
- Export fidelity mismatch: make HTML plus browser-rendered PNG/PDF the first export contract; use worker Chromium, bundled Korean fonts, cached assets, fixed viewports, and golden visual fixtures.
- AI asset hallucination and licensing: route assets through resolver checks, cache verified files, record source/license metadata, and use explicit placeholder states for unknown or broken assets.
- Legal contamination risk: keep a clean-room rule; do not copy leaked prompts, proprietary command structures, names, templates, or restricted repos; log public sources and original decisions.
- Solo-builder overreach: force the first month around one vertical slice: generate/import HTML, select/edit constrained parts, persist patches, and export trusted HTML/PNG/PDF.
