# Phase 08 Research: Prototyping, Slides, and AI Variations

Checked date: 2026-04-28

## Recommended Approach

Build Phase 08 as a stored-state artifact layer over the existing `ProjectBundle`, `CanvasGraph`, `CanvasOperation`, `EditPatch`, and Phase 07 design-system records. The core should add typed prototype interactions, slide decks, variation sets, and portable agent recipes without relying on hidden AI provider state or live iframe DOM reads. The web layer should expose a compact tool workflow: prototype graph/interaction controls, non-mutating presentation preview, slide/grid/outline/notes controls, feedback primitives, selected-region remix, side-by-side variation compare, promote, and recipe export.

This matches the current architecture: HTML/CSS remains export substrate; typed graph records own product semantics; preview/presentation modes are projections. Real model-provider AI, full animation/video authoring, hosted multiplayer, and final PPTX materialization stay out of Phase 08.

## External References

- Claude Design guide: <https://support.claude.com/en/articles/14604416-get-started-with-claude-design> - context-aware chat/canvas design iteration and export/share baseline.
- Figma interactive components: <https://help.figma.com/hc/en-us/articles/360061175334-Create-interactive-components-with-variants> - component variants and interactions inform typed prototype/state records.
- Figma Slides: <https://help.figma.com/hc/en-us/articles/24170630629911-Explore-Figma-Slides> - slide/grid view, presenter notes, embeds, and audience feedback inform deck model.
- Figma Dev Mode and variables docs already captured in `.planning/research/COMPETITIVE-GAP-REVIEW.md` - variable modes and handoff implications.
- Paper roadmap: <https://paper.design/roadmap> - canvas-aware agents, scripts/prompts, interactions, and data-aware design workspace direction.

## Alternative(s) Considered

### Live DOM prototype runtime

Rejected. Saving prototype behavior by inspecting or mutating the live iframe DOM would violate the source-of-truth contract from Phase 01 and make replay/export brittle.

### Real AI provider integration

Rejected for Phase 08. Phase 08 should create the provider-agnostic typed operation and recipe contract first. A later provider adapter can produce these records, but Phase 08 can prove the workflow with deterministic local variation generation.

### Full Figma Slides/PPT editor parity

Rejected for Phase 08. The scope is first-class stored slide decks, notes, embedded prototype/canvas blocks, and feedback primitives. Real PPTX export and editable PPTX shape fidelity are Phase 10.

## Implementation Map

### Core model and helpers

- `packages/editor-core/src/schemas.ts` - add prototype, slide deck, variation, and agent recipe schemas plus defaulted `ProjectBundle` fields.
- `packages/editor-core/src/prototype.ts` - validate/create prototype interactions, variables, component state rules, and non-mutating presentation preview state.
- `packages/editor-core/src/slides.ts` - create deck/slide records, insert canvas/prototype blocks, update notes, and record feedback primitives.
- `packages/editor-core/src/variations.ts` - create selected-region variation sets, deterministic localized remix operations, promote a direction, and export portable prompt/script recipes.
- `packages/editor-core/src/handoff.ts` - include `prototypeGraph`, `slideDecks`, `variationSets`, and `agentRecipes` in runtime-agnostic handoff packages.
- `packages/editor-core/src/index.ts` - re-export new modules.
- `packages/editor-core/src/__tests__/prototype.test.ts` - positive and negative prototype/preview tests.
- `packages/editor-core/src/__tests__/slides.test.ts` - deck, notes, embedded block, and feedback tests.
- `packages/editor-core/src/__tests__/variations.test.ts` - selected-region remix, compare/promote, recipe export, and unsafe operation rejection tests.
- `packages/editor-core/src/__tests__/schemas.test.ts` and `packages/editor-core/src/__tests__/handoff.test.ts` - schema defaults and handoff include regression tests.

### Web workflow

- `apps/web/components/prototype-panel.tsx` - interaction authoring, trigger/action/target/variable controls, and interaction list.
- `apps/web/components/presentation-mode.tsx` - preview-only presentation state and interaction playback surface.
- `apps/web/components/slide-deck-panel.tsx` - slide/grid/outline toggle, slide creation, presenter notes, embedded blocks, and feedback primitives.
- `apps/web/components/variation-compare-panel.tsx` - selected-object remix, side-by-side directions, promote, and recipe export.
- `apps/web/components/editor-shell.tsx` - wire typed callbacks and preview-only state.
- `apps/web/app/globals.css` - dense pro-tool styling and responsive no-overflow rules.
- `apps/web/tests/phase-08-prototype.spec.ts` - browser workflow for interaction authoring and presentation preview without source mutation.
- `apps/web/tests/phase-08-slides.spec.ts` - browser workflow for deck outline/grid/notes/embed/feedback reload persistence.
- `apps/web/tests/phase-08-variations.spec.ts` - browser workflow for selected-region remix, compare, promote, recipe export, and no body overflow.

## Dependencies

No new packages are required. Use existing TypeScript, Zod, Vitest, Playwright, and local helper modules.

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Phase 08 becomes fake AI instead of a real foundation | Product workflow looks demo-only | Store provider-agnostic `AgentRecipe` and typed operations; deterministic local generator only proves the contract. |
| Prototype preview mutates source state | Edit state can be corrupted | Separate committed prototype graph from preview-only `PresentationState`; tests assert operation logs do not change. |
| Slide model duplicates canvas objects incorrectly | Deck blocks drift from source | Use references to canvas object/artboard IDs plus snapshot metadata, not copied live DOM. |
| Variation promote corrupts surrounding layout | Selected-region remix breaks page | Require target object IDs, source revision, provenance, and typed operations; negative tests reject stale or cross-object operations. |
| UI overflows at tablet/mobile widths | Prior quality blocker repeats | Add E2E body-width assertions at 1440, 768, and 390 px. |

## RESEARCH COMPLETE
