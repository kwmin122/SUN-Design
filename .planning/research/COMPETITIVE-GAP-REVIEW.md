# Competitive Gap Review: Paper, Claude Design, Figma

Checked date: 2026-04-28

## Sources Checked

- Claude Design official guide: <https://support.claude.com/en/articles/14604416-get-started-with-claude-design>
- Claude Design design-system setup: <https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design>
- Paper home: <https://paper.design/>
- Paper roadmap: <https://paper.design/roadmap>
- Paper vs Figma: <https://paper.design/compare/figma>
- Figma Dev Mode: <https://www.figma.com/dev-mode/>
- Figma Dev Mode guide: <https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode>
- Figma variables guide: <https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma>
- Figma auto layout guide: <https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout>
- Figma interactive components: <https://help.figma.com/hc/en-us/articles/360061175334-Create-interactive-components-with-variants>
- Figma Slides: <https://help.figma.com/hc/en-us/articles/24170630629911-Explore-Figma-Slides>
- Figma Sites: <https://www.figma.com/blog/introducing-figma-sites/>
- Figma Make: <https://www.figma.com/make/>

## Product Bar

Milestone 1 proves that K-Design Studio has a real source-of-truth model, safe preview boundary, direct edit loop, context-aware creation surface, export/handoff surfaces, and agent-agnostic packaging. That is still valid.

The competitive gap is not "does the app work?" The gap is whether the product feels like a full design workspace when compared with Claude Design, Paper, and Figma. The missing work clusters into six domains:

1. Professional canvas and component model.
2. Design-system governance and code connection.
3. Prototype, slide, and interaction authoring.
4. Context ingestion, live data, and asset provenance.
5. Dev-mode handoff, publish, and production export.
6. Collaboration, search, review, and workspace governance.

## Reference Capability Matrix

| Reference | Observed capability | K-Design current state | Gap |
|---|---|---|---|
| Claude Design | Organization design system extracted from codebases, slide decks, documents, brand assets, prototypes, screenshots, and design files; published for team reuse. | v1 has design-system learning placeholder/state. | Needs design-system versioning, publish/remix workflow, asset provenance, and reusable component extraction quality gates. |
| Claude Design | Attach reference material throughout the project; use screenshots, images, slide decks, documents, existing assets, and style references. | v1 has context attachment records and placeholder asset statuses. | Needs real parsers, source notes, file provenance, and context influence audit. |
| Claude Design | Export ZIP, PDF, PPTX, Canva, standalone HTML, and handoff to local/web coding agents. | v1 has stored-state jobs and handoff records. | Needs real artifact materialization, export fidelity verification, and roundtrip handoff checks. |
| Claude Design | Ask for variations, targeted feedback, responsiveness, and design review. | v1 has basic presets, review, and saved versions. | Needs side-by-side variations, selected-region AI edits, and comparison/review workflows. |
| Paper | Web-standard HTML/CSS canvas connecting teams, agents, code, and data. | v1 stores normalized HTML and patches. | Needs higher-fidelity CSS layout primitives, code-component ingestion, and live data bindings. |
| Paper | Use code components, Tailwind integration, CSS Grid, components with slots, themes and tokens. | v1 has direct manipulation and basic design-system values. | Needs component instances, props/slots, CSS tokens, CSS Grid controls, and Tailwind/class-level semantics. |
| Paper | MCP server, script/prompt engine, live data fetching, asset hosting. | v1 exports agent handoff packages. | Needs live agent-to-canvas session protocol, scriptable canvas operations, data-source binding, and asset URL lifecycle. |
| Paper | Canvas-aware assistant, right-click remix, shaders, advanced image filters, video/Lottie/Rive/YouTube, Three.js islands. | v1 has no advanced media/effects authoring. | Needs optional creative/media phases after core pro-tool parity. |
| Figma | Auto layout, constraints, frame hierarchy, component instances. | v1 has constrained move/resize/reorder patches. | Needs explicit layout graph, frame/artboard tree, constraints, guides, snapping, and layer panel. |
| Figma | Components, variants, component properties, interactive components, variable modes. | v1 has generated HTML nodes only. | Needs reusable component model with variants, state, props, overrides, and tokens. |
| Figma | Dev Mode inspect, code snippets, Code Connect, variables, component playground, change comparison. | v1 has agent handoff but no inspect/dev surface. | Needs inspect panel, token/code mapping, readiness states, version diff, and component playground. |
| Figma | Slides with slide/grid view, presenter notes, polls/voting, embedded prototypes, audio/cursor chat. | v1 has pitch deck preset and PPTX handoff surface. | Needs real slide model, notes, deck structure, presentation states, and audience interaction primitives. |
| Figma | Sites publish responsive websites with HTML/CSS preview, breakpoints, interactions, and publish path. | v1 exports standalone HTML/ZIP but does not publish. | Needs hosted preview/publish pipeline and breakpoint-specific editing. |
| Figma | Make turns prompt plus frame/context into functional prototypes and can connect to app/platform workflows. | v1 has deterministic local mock generation only. | Needs provider-adapter AI generation, app logic stubs, and GitHub/project export path. |

## Must-Add Reinforcement Plan

These are additive Milestone 2 requirements. They do not reopen Milestone 1 unless a future verification proves that a v1 implementation blocks them architecturally.

### Phase 06: Canvas and Component Model

- Create an explicit canvas object model over HTML nodes: pages, artboards, frames, sections, component instances, slots, and text/image/vector primitives.
- Add a visible layer tree, frame hierarchy, snapping, guides, constraints, and CSS auto-layout/grid controls.
- Add reusable component instances with variants, props, overrides, and state.
- Keep the HTML/CSS source-of-truth principle: canvas objects serialize to `ProjectBundle`, not a proprietary-only format.

### Phase 07: Design System, Tokens, and Code Connect

- Promote design-system learning into governed assets: tokens, typography scales, component patterns, version history, publish/remix, and team availability.
- Map tokens to CSS variables, Tailwind classes, and code-component references.
- Add component playground behavior so a user can test variants and props without mutating the main canvas.
- Add source links to Storybook/GitHub/docs and preserve provenance.

### Phase 08: Prototyping, Slides, and Interactions

- Add prototype graph with click/hover/tap, navigation, component state, variables, conditionals, and transition metadata.
- Add slide model with slide/grid view, presenter notes, speaker view, and embedded interactive prototype blocks.
- Add side-by-side design variations and selected-region AI restyle/rewrite.
- Add animation timeline primitives for HTML/CSS/JS artifacts without requiring a full video editor.

### Phase 09: Context Ingestion, Live Data, and Assets

- Replace placeholder context records with real ingestion for images, screenshots, URLs, DOCX, PPTX, XLSX, Figma exports, and codebase folders.
- Create `source-notes.md` and `design-context.md` automatically per project.
- Add live web snapshot/import for editable sections, inspired by Paper Snapshot and Claude Design context upload.
- Add live data bindings from CSV/Sheets/API fixtures into repeatable components.
- Add asset hosting/cache/provenance records.

### Phase 10: Dev Mode, Publish, and Export Fidelity

- Add Dev Mode inspect surface: measurements, spacing, CSS, token references, accessibility notes, component metadata, and copyable code.
- Add version diff and ready-for-dev states.
- Make HTML/ZIP/PNG/PDF/PPTX exports real files with deterministic visual diff checks.
- Add responsive site publish/preview path with breakpoint-specific edits.
- Add GitHub/code-agent export that can roundtrip edits back into the artifact package.

### Phase 11: Collaboration, Search, and Governance

- Add project browser with nested folders, tags, examples, templates, design-system libraries, smart search, and recent work.
- Add role-based sharing, comments, review states, activity, and audit log.
- Add optional real-time collaboration later: cursors, presence, follow/spotlight, audio/cursor chat, and conflict handling.
- Add workspace-level quality gates for accessibility, contrast, overflow, responsive breakage, source provenance, and generic AI visual patterns.

## Explicitly Still Deferred

- Full Figma vector/path parity is not required before Phase 06 component/frame parity.
- Full multiplayer CRDT editing remains after single-user operation semantics are stable.
- Full marketplace/templates distribution remains after project browser and asset provenance are real.
- Native desktop app packaging remains deferred.
- Verbatim cloning of proprietary Claude/Paper/Figma behavior, prompts, or UI assets remains out of scope.

## Verification Expectations

Each new phase must ship with:

- A concrete user workflow test, not just schema tests.
- Browser visual verification at desktop, tablet, and mobile widths.
- Reload/state persistence proof.
- Negative tests for invalid patches, stale component variants, bad token references, and unsafe imported context.
- Artifact-hash verification and an independent no-edit verification prompt.
