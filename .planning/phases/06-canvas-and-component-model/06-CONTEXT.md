---
phase: 06
title: Canvas and Component Model
slug: canvas-and-component-model
milestone: 2
status: context_ready
inserted_by: reinforce
source: .planning/research/COMPETITIVE-GAP-REVIEW.md
gathered: 2026-04-28
---

# Phase 06 Context — Canvas and Component Model

## Discussion Mode

- Mode: automated recommended-default discussion.
- Reason: Codex Default mode has no structured `AskUserQuestion` UI. The user explicitly said the competitive roadmap/context reinforcement is complete, Paper/Claude Design-grade implementation is not complete, and the next step should be Phase 06 scope confirmation rather than implementation.
- Outcome: Phase 06 is ready for `/sunco:plan 6`.

## Phase Boundary

Phase 06 adds professional canvas semantics and reusable local components on top of the completed Milestone 1 source-of-truth family.

It must make generated/imported HTML feel like a real design tool surface: pages, artboards, frames, sections, component instances, text, images, buttons, and vector-like primitives can be inspected through a visible layer tree and manipulated through typed operations.

It must not turn into a full Figma/Paper clone in one phase. Phase 06 establishes the durable object/component model and one usable vertical slice. Later phases add governed token/code connection, prototype interactions, slides, real context ingestion, Dev Mode, publishing, and collaboration.

## Decisions

| Area | Decision | Reason | Impact |
|---|---|---|---|
| Source of truth | Keep `ProjectBundle + EditGraph + patch log + assets + tweakValues` as the durable source-of-truth family. Add a canvas/component graph that references stable node ids instead of replacing the existing model. | Milestone 1 already proved sanitize, normalize, preview, direct editing, export surfaces, and handoff around this model. Replacing it would invalidate the safe HTML architecture. | Planner must design additive schemas and migrations. No plan may persist live iframe DOM as the authoritative state. |
| Canvas graph | Add an explicit stored canvas object layer over normalized HTML nodes. Objects include pages, artboards, frames, sections, component instances, slots, text, image, button, and vector-like nodes. | Paper/Figma parity requires user-visible objects, not just raw DOM nodes. HTML/CSS still remains the exportable substrate. | Requires schema, derivation from existing bundles, reload tests, and UI integration with selection/inspector. |
| Compatibility | Existing schemaVersion 1 bundles and fixtures must still load. If `ProjectBundle` changes, provide a deterministic migration or derivation path. | Milestone 1 data should not break when Milestone 2 starts. | Tests must cover old bundle load, migrated canvas graph, and replay of existing patch logs. |
| Layer tree | Build the visible layer tree from canvas objects and hierarchy metadata, not raw DOM order alone. Support select, reorder, group, ungroup, hide, lock, rename, and hierarchy inspection. | A professional design workspace needs predictable object hierarchy. DOM order alone cannot express editor-only grouping, lock state, or canvas labels cleanly. | Requires typed operations and browser E2E coverage for layer tree workflows. |
| Layout semantics | Use web-native layout semantics first: CSS flex, CSS Grid, gap, padding, alignment, min/max size, aspect ratio, order, breakpoint metadata, and pinned-edge style constraints. | The product is HTML-first; duplicating every Figma auto-layout abstraction would create unnecessary complexity. | Inspector controls must map to validated CSS/layout properties and reject unsupported or unsafe values. |
| Snapping and guides | Treat snapping, guides, alignment hints, and resize handles as parent-owned canvas overlays derived from stored object geometry and bridge rects. | The iframe remains a projection boundary; the app should not depend on same-origin DOM mutation for editor behavior. | Overlay math and tests must prove desktop/tablet/mobile behavior without saving transient iframe state. |
| Component model | Implement local project components and instances first. A component has source object/node references, slots, props, variants, overrides, and state. Component propagation should be explicit and typed, with conflicts surfaced rather than hidden. | Phase 06 must establish component fundamentals without pulling in Phase 07's governed design-system publishing or code connection. | Requires at least one reusable slot/prop/variant path, instance override persistence, detach/update behavior, and negative tests for invalid variants or stale references. |
| Patch contract | Canvas/component changes must be stored as typed operations or schema records and must replay deterministically. Existing `EditPatch` semantics can be extended or paired with a new canvas-operation log, but planner must preserve patch-log auditability. | The product promise is direct editing without source-code edits. That only works if operations are explicit, replayable, and portable across agent runtimes. | Plan must include operation schemas, validation, replay/reload tests, and artifact package inclusion. |
| Vector scope | Phase 06 supports vector-like nodes only where they remain safe web primitives, such as SVG icons or shape blocks already representable in sanitized HTML/SVG/CSS. | Full vector/path editing is explicitly deferred and would expand the phase too far. | No bezier/path editor, boolean ops, pen tool, shader editor, or advanced media authoring in Phase 06. |
| UI slice | Ship a real object-oriented working surface: layer tree, object breadcrumb, canvas selection, group/hide/lock/rename/reorder controls, layout inspector, and component instance inspector. | "Schema-only" work would not meet the Paper/Claude Design-level product bar. | Browser tests must exercise visible controls, not only unit tests. |
| Runtime portability | Canvas/component records, operation logs, and handoff package data must be readable by Codex, Claude Code, Cursor, local agents, and web agents. | The product is agent-agnostic and must not become Claude Design-only or Claude Code-only. | Prompt/script recipes and artifact exports must use portable project files and schemas. |
| Quality bar | Phase 06 is not "Paper/Claude Design-grade implementation complete." It is the first additive Milestone 2 implementation phase toward that bar. | The user explicitly separated roadmap/context completion from product-grade implementation completion. | Final verification must describe what Phase 06 proves and what remains for Phase 07-11. |

## Requirements Covered

- CANVAS-01: explicit canvas objects for pages, artboards, frames, sections, component instances, and primitive text/image/vector-like nodes.
- CANVAS-02: visible layer tree for select, reorder, group, hide, lock, and rename.
- CANVAS-03: foundational constraints, visual snapping/guide hints, and resize metadata that persist through reload and portable artifact state.
- CANVAS-04: structured controls for CSS flex, auto-layout-like web constraints, CSS Grid, gap, padding, alignment, and breakpoint metadata.
- CANVAS-05: reusable component instances with live slots, declared props, variants, validated overrides, and state.

## Canonical References

- `CLAUDE.md`
- `.planning/PRODUCT-NORTH-STAR.md`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/research/COMPETITIVE-GAP-REVIEW.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/FEATURES.md`
- `.planning/research/PITFALLS.md`
- `.planning/research/SUMMARY.md`
- `docs/guides/coding-principles.md`
- `docs/prompts/context-driven-design-agent-prompt.md`
- `docs/superpowers/specs/2026-04-27-k-design-studio-design.md`
- `.planning/phases/01-safe-html-document-foundation/01-CONTEXT.md`
- `.planning/phases/02-direct-editing-comments-and-tweaks/02-CONTEXT.md`
- `.planning/phases/03-prompt-creation-modes-assets-and-korean-presets/03-CONTEXT.md`
- `.planning/phases/04-responsive-preview-and-export-fidelity/04-CONTEXT.md`
- `.planning/phases/05-design-systems-sharing-and-agent-agnostic-handoff/05-CONTEXT.md`

## Current Code Context

- `packages/editor-core/src/schemas.ts` defines `ProjectBundle`, `EditGraph`, `EditNode`, `EditPatch`, assets, comments, versions, tweak values, export jobs, design systems, share links, and handoff packages.
- `packages/editor-core/src/normalize.ts` injects stable `data-cdx-id` and creates the current edit graph from safe normalized HTML.
- `packages/editor-core/src/patches.ts` applies typed patches to stored normalized HTML and rebuilds the edit graph.
- `packages/preview-runtime/src/bridge.ts` reports iframe node geometry and selection events through a nonce-validated bridge.
- `apps/web/components/editor-shell.tsx` owns the editor shell, object selection surface, inspector controls, Tweaks, export/share surfaces, and current direct editing UI.
- `apps/web/tests/phase-02.spec.ts` and `packages/editor-core/src/__tests__/patches.test.ts` are important precedent for operation-level and browser workflow tests.

## Implementation Constraints

- Think before coding, keep the solution simple, make surgical changes, and define verifiable success criteria per `docs/guides/coding-principles.md`.
- Do not save or diff the live iframe DOM as the canonical canvas state.
- Do not render untrusted HTML directly inside the app DOM.
- Do not depend on same-origin iframe access as the core architecture.
- Do not introduce a proprietary-only canvas format that cannot materialize back to HTML/CSS.
- Do not widen Phase 06 into real AI generation, selected-region AI edits, slide authoring, real data ingestion, publishing, Dev Mode, multiplayer, or full design-system governance.
- Prefer deterministic fixtures and negative tests over broad speculative abstractions.
- Keep module boundaries clear: editor-core owns schemas/operations/materialization, preview-runtime owns bridge messages, web owns UI/interaction.

## Assumptions

- Existing Milestone 1 behavior must remain green while Phase 06 is added.
- Phase 06 may introduce schemaVersion 2 or a separate versioned canvas graph, but it must provide backward-compatible loading for v1 bundles.
- If a normalized HTML node cannot be safely promoted into a rich object type, it can remain `unknown` or generic `section/frame` with limited controls.
- The first component implementation can be local to one project and one artifact package.
- The first vector-like support can be limited to safe SVG/icon/shape primitives already present in normalized output.
- Tablet and mobile verification are required because prior quality review found responsive overflow issues.

## Deferred Ideas

- Phase 07: design-system governance, tokens, Tailwind/class mapping, Code Connect, component playground, Storybook/GitHub/docs links.
- Phase 08: selected-region AI edits, side-by-side variations, prototype graph, component interaction states, slide deck authoring, presenter notes.
- Phase 09: real document/URL/Figma/codebase ingestion, live web snapshots, source-notes/design-context generation, data binding, asset hosting/cache.
- Phase 10: Dev Mode inspect, copyable code snippets, ready-for-dev, version diff, real export files, hosted publish, code-agent roundtrip.
- Phase 11: project browser, folders, semantic search, review states, audit logs, optional realtime collaboration.
- Later: full vector/path editor, shader/video/Lottie/Rive/Three.js authoring, public marketplace, full native PPT roundtrip.

## Planning Notes

Plan should likely split into two waves:

1. Core schema and operation foundation: canvas graph, component model, migrations/derivation, validation, replay/reload tests.
2. Product workflow slice: layer tree, object inspector, layout/snapping controls, component instance controls, browser verification.

The plan must include negative tests for invalid canvas operations, unsupported layout values, stale component variants, invalid instance overrides, and unsafe style/URL propagation.

## Completion Target For Phase 06

Phase 06 is complete only when a user can load an existing design, see a real layer/object model, manipulate object hierarchy and layout through visible controls, create or use at least one reusable component instance with slots/props/variants/overrides/state, reload the document without losing those semantics, and verify that all changes came from stored typed operations.
