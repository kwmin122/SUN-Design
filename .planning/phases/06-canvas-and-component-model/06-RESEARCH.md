# Phase 06 Research — Canvas and Component Model

## Recommended Approach

Add a versioned canvas object graph to `ProjectBundle` as an additive layer over the existing `EditGraph`. The graph should reference stable `data-cdx-id` edit nodes through `nodeId`, never replace normalized HTML or store live iframe DOM. `packages/editor-core` should own the schemas, graph derivation, typed canvas operations, component helpers, validation, and serialization compatibility. The web app should consume that contract through visible layer tree and inspector controls, then commit typed operations back into stored bundle state.

The best split is two plans:

1. Core canvas state, typed operations, local component helpers, and portable handoff inclusion in `packages/editor-core`.
2. Web layer tree, object selection, layout controls, snapping/guide surface, and local component instance workflow in `apps/web`.

This preserves the Milestone 1 source-of-truth family while giving Phase 06 a real product slice instead of schema-only work.

## Alternative(s) Considered

### Replace `EditGraph` with a proprietary canvas tree

Rejected. It would make the product feel more like Figma internally, but it would weaken the HTML-first export contract and risk breaking existing v1 bundles.

### Store live iframe DOM changes after direct manipulation

Rejected. The product north star and Phase 06 context explicitly forbid making the iframe DOM the persistence source. The iframe remains projection only.

### Make component governance part of Phase 06

Rejected. Phase 06 should support local reusable components with slots, props, variants, overrides, and state. Publishing, remixing, tokens, Code Connect, and component playground behavior belong to Phase 07.

## Implementation Map

### Core model and operations

- `packages/editor-core/src/schemas.ts` — Add `CanvasGraphSchema`, `CanvasObjectSchema`, `CanvasOperationSchema`, component schemas, and optional/default canvas fields on `ProjectBundleSchema`.
- `packages/editor-core/src/canvas-graph.ts` — Derive a canvas graph from `ProjectBundle.editGraph`, ensure missing v1 bundles get a deterministic graph, flatten and query objects, and compute layer tree ordering.
- `packages/editor-core/src/canvas-operations.ts` — Validate and apply typed canvas operations such as rename, hide, lock, reorder, group, layout constraint update, create component, create instance, override, and detach.
- `packages/editor-core/src/canvas-components.ts` — Component helper functions for local component definitions, variant lookup, override validation, and instance summaries.
- `packages/editor-core/src/persistence.ts` — Ensure parsed v1 JSON loads through `ensureCanvasGraph` without dropping old data.
- `packages/editor-core/src/export.ts` — Ensure clean HTML export materializes stored layout constraints from canvas operations when a canvas object maps to an edit node.
- `packages/editor-core/src/handoff.ts` — Include canvas/component data in agent handoff packages.
- `packages/editor-core/src/index.ts` — Re-export the new canvas modules.
- `packages/editor-core/src/__tests__/canvas-graph.test.ts` — Derivation, migration, reload, hierarchy, and query tests.
- `packages/editor-core/src/__tests__/canvas-operations.test.ts` — Positive and negative typed-operation tests.
- `packages/editor-core/src/__tests__/canvas-components.test.ts` — Component definition, instance, variant, override, and detach tests.
- `packages/editor-core/src/__tests__/schemas.test.ts` — Schema compatibility tests for v1 bundles and new canvas fields.
- `packages/editor-core/src/__tests__/handoff.test.ts` — Handoff includes canvas/component records.

### Web product surface

- `apps/web/components/editor-shell.tsx` — Own selected canvas object id, apply canvas operations, connect layer tree and inspectors, and persist graph changes.
- `apps/web/components/canvas-layer-tree.tsx` — Visible layer tree with select, rename, hide, lock, reorder, group, and ungroup controls.
- `apps/web/components/canvas-object-inspector.tsx` — Object metadata, dimensions, constraints, and web-native layout controls.
- `apps/web/components/component-instance-panel.tsx` — Local component and instance controls.
- `apps/web/components/preview-frame.tsx` — Keep overlay geometry parent-owned and expose selected canvas object labels where useful without same-origin iframe access.
- `apps/web/app/globals.css` — Layer tree, object inspector, snapping guide, and component panel styles with tablet/mobile overflow checks.
- `apps/web/tests/phase-06-canvas.spec.ts` — Browser coverage for layer tree, layout controls, reload persistence, and tablet/mobile stability.
- `apps/web/tests/phase-06-components.spec.ts` — Browser coverage for creating a component, selecting an instance, applying variant/override/state, and reloading.

## Dependencies

No new package dependency is required for Phase 06 planning. Existing dependencies are sufficient:

- `zod` for schemas and validation.
- `parse5` for stored HTML materialization.
- `vitest` for unit tests.
- `@playwright/test` for browser workflows.
- Existing React/Next/lucide stack for UI.

If implementation later proves drag handles need a dedicated movement library, prefer a later narrow dependency decision. Do not add `react-moveable` in the Phase 06 plan unless the executor can prove the current parent-owned overlay is insufficient.

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Canvas graph duplicates `EditGraph` and drifts | Stored state becomes confusing and non-deterministic | Keep canvas objects as semantic references to edit node ids; derive missing objects from `EditGraph`; test reload and migration. |
| Phase 06 grows into full Figma parity | Scope expands beyond one phase | Keep vector editing, tokens/code connect, prototype interactions, publishing, and collaboration deferred to Phase 07-11. |
| Layout controls write unsafe CSS | Security and export risk | Validate layout values in `editor-core`; reject unsupported display, gap, padding, grid, breakpoint, and URL-like values. |
| Layer tree UI saves iframe-derived transient state | Persistence violates architecture | Store only typed operations and graph records; bridge rects can drive overlays but not become source of truth. |
| Component propagation hides conflicts | User loses control over generated output | Make propagation explicit; surface stale variant/source conflicts; test invalid variants and stale component references. |
| Tablet/mobile regressions return | Product polish fails again | Add Playwright viewport checks for 1440, 768, and 390 widths and assert no horizontal overflow. |

## RESEARCH COMPLETE
