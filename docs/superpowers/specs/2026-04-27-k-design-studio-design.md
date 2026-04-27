# K-Design Studio Design Spec

## Problem Statement

K-Design Studio is a browser-based AI design workspace for builders who want Claude Design-level output without being locked into Claude Design itself. A user writes a prompt, receives a high-fidelity HTML artifact, previews it in an iframe, edits the rendered result directly like a lightweight slide, Figma canvas, or Paper-style web-standard canvas, adjusts meaningful design variables in a right-side Tweaks panel, exports the result, and can hand off the same artifact package to Codex, Claude Code, Cursor, local agents, or web agents.

The first product is not a full Figma clone. It is a controllable HTML design workbench where the generated artifact remains the source of truth and the visual editor makes common edits plus constrained move/resize/reorder/alignment operations safe.

## Evidence

- The user explicitly wants: "claude 디자인급 + 그 안에서 프롬프트 입력 -> HTML 생성 -> 미리보기 iframe, 거기서 사용자가 직접 ppt처럼 figma처럼 편집가능 -> 오른쪽 Tweaks 패널 -> export까지 제공". [from office-hours]
- Current alternatives are split: Claude Design is polished but proprietary, Huashu Design is a skill that generates HTML assets rather than a full app, and Open CoDesign is closer to an open app but still leaves room for a Korean-first product direction. [from office-hours]
- The user wants a Korean version, which implies Korean typography, Korean product references, and Korean workflow defaults must be first-class rather than a translation layer. [from office-hours]

## Target User

The first user is an AI-native solo builder or small product maker in Korea who already works with Codex, Claude Code, Cursor, or similar agents and wants to produce polished product pages, decks, app screens, and explainers faster than by hand-editing code or moving into Figma.

## Narrowest Wedge

The v1 slice is one local web app that can:

1. Accept a prompt.
2. Generate or mock-generate a single HTML artifact.
3. Render the HTML in a sandboxed iframe.
4. Select visible text and block elements through an overlay.
5. Edit text, directly manipulate constrained canvas objects, common style properties, and structured tweak variables.
6. Persist the edited artifact.
7. Export HTML, ZIP, PNG/PDF, raster PPTX, and a portable agent handoff package.

This proves the hard product loop before attempting collaboration, marketplace features, full layer editing, or native Figma parity.

## Approaches Considered

| Approach | Effort | Risk | Why not chosen as v1 |
|---|---:|---:|---|
| Skill-only generator | S | Low | Fast, but it cannot deliver the in-app direct editing and export workflow the user wants. |
| Full Figma/PPT clone | XL | High | Too much surface area before proving generated HTML can be edited safely. |
| HTML-first visual editor | M | Medium | Chosen. It preserves agent-generated HTML as source of truth while adding focused visual editing. |

## Chosen Approach

Use an HTML-first visual editor shell:

- The prompt composer calls a provider/runtime abstraction rather than a Claude-only backend.
- The generated output is stored as an artifact record: HTML, extracted editable nodes, tweak schema, assets, and revision history.
- The preview iframe is sandboxed.
- An overlay controller maps screen coordinates to editable DOM nodes.
- Canvas handles support constrained move, resize, reorder, and alignment operations for generated text, image, card, section, and artboard-like blocks.
- Text edits happen through explicit node patches.
- Style edits target a limited property set: typography, spacing, color, layout presets, visibility, image source, and component-level tweak variables.
- Export materializes the stored `ProjectBundle + patch log + assets + tweak values` into a clean document first. PNG/PDF capture may render that materialized document in a fresh headless browser, but export must never copy ad-hoc live iframe DOM mutations as the source of truth.

## Architecture

```text
Prompt Composer
  -> Generation Adapter
  -> Artifact Store
  -> Iframe Renderer
  -> Selection Overlay
  -> Edit Inspector / Tweaks Panel
  -> Patch Engine
  -> Export Pipeline
```

The app has two sources of truth:

- Artifact source: HTML, CSS, JS, assets, tweak schema.
- Editor state: selected node, visual bounds, current tweak values, undo stack.

The artifact source is durable. Editor state is ephemeral except when patches are applied.

## Components

- `PromptComposer`: prompt entry, runtime-family/provider selection later, generation status.
- `ArtifactStore`: saves versions, current HTML, assets, tweak schema, patch history.
- `PreviewFrame`: sandboxed iframe with postMessage bridge.
- `InspectorBridge`: script injected into preview HTML to report selectable nodes and apply safe patches.
- `SelectionOverlay`: visual selection rectangles, hover outlines, click-to-select behavior.
- `RightPanel`: property inspector and Tweaks panel.
- `PatchEngine`: normalizes edits into patch records and updates HTML safely.
- `ExportService`: HTML/ZIP download, PNG screenshot, PDF print export, raster PPTX export, agent handoff package, later MP4 and semantic editable PPTX.
- `VerificationHarness`: Playwright screenshot and console-error checks.

## Data Flow

1. User submits a prompt.
2. Generation adapter returns HTML plus optional metadata.
3. Artifact store saves revision 1.
4. PreviewFrame renders HTML inside a sandbox.
5. InspectorBridge indexes editable nodes and sends bounds to the parent.
6. User selects a node through the overlay.
7. RightPanel shows allowed edits for that node and global tweaks.
8. PatchEngine applies patch to DOM and artifact source.
9. ExportService captures the rendered frame.

## Error Handling

- If generation fails, keep the previous artifact and show the error in the prompt panel.
- If iframe execution throws, show console errors and keep export disabled until render recovers.
- If a patch cannot be mapped back to source HTML, apply it as an overlay patch record rather than silently corrupting source.
- If export fails, preserve the artifact and show the exact failed stage: render, screenshot, PDF, or file write.

## Testing

- Unit tests for patch normalization and tweak schema parsing.
- Component tests for selection and inspector state.
- Playwright tests for prompt-to-preview, text edit, style edit, tweak update, and export.
- Visual smoke screenshots for desktop and laptop sizes.
- Security tests for sandbox escape attempts and blocked network/script behavior where applicable.

## Out of Scope

- Full Figma vector editing.
- Multi-user collaboration.
- Marketplace/templates store.
- Real-time multiplayer cursors.
- Native desktop app packaging.
- Automatic Figma export.
- Full PPTX layer-perfect round trip and semantic editable Figma/PPTX round-trip.
- Running leaked Claude Design prompts verbatim.

## Risks and Assumptions

- Generated HTML is not naturally structured for visual editing. v1 assumes generated artifacts include stable node IDs and a tweak schema.
- Direct DOM editing can diverge from source. v1 records patches and regenerates source through controlled transforms.
- Arbitrary HTML is a security risk. v1 renders in sandboxed iframe with a minimal postMessage bridge.
- Export fidelity is harder than preview fidelity. v1 starts with HTML, ZIP, PNG, PDF, raster PPTX, and portable agent handoff before semantic editable PPTX/Figma or MP4.
- Korean typography quality needs explicit design rules, not just translated UI text.

## Success Criteria

1. A user can generate a visible HTML artifact from a prompt or local mock provider.
2. A user can select a text element in the preview and edit its copy without touching code.
3. A user can change at least three meaningful style or tweak controls and see the iframe update.
4. A user can export the final artifact as HTML, ZIP, PNG/PDF, raster PPTX, or a portable agent handoff package.
5. The app blocks or safely contains arbitrary generated HTML scripts.
6. Playwright verifies the core loop without console errors.

## Traceability

| v1 requirement | Source |
|---|---|
| Prompt input and HTML generation | user directive / office-hours |
| iframe preview | user directive / office-hours |
| PPT/Figma/Paper-like direct editing | user directive / office-hours / Paper reference |
| right-side Tweaks panel | user directive / office-hours |
| export | user directive / office-hours |
| runtime-agnostic handoff | user directive / Huashu-style portability reference |
| Korean-first design behavior | user directive / brainstorming |
| avoid full Figma clone in v1 | brainstorming scope control |

## Self Review

| Dimension | Score | Notes |
|---|---:|---|
| Completeness | 8 | Required sections present and grounded in the user's directive. |
| Consistency | 8 | HTML-first source of truth is consistent across architecture and scope. |
| Clarity | 8 | Requirements are mostly testable; later phases can refine exact patch formats. |
| Scope | 8 | Cuts full Figma/PPT clone from v1 while preserving constrained direct manipulation as part of the core loop. |
| Feasibility | 7 | Ambitious but shippable if generation is mocked first and patch scope stays narrow. |
| YAGNI | 8 | Collaboration, marketplace, native app, and full PPTX parity deferred. |
