# Phase 02: Direct Editing, Comments, and Tweaks — Context

**Gathered:** 2026-04-27
**Status:** Ready for execution planning
**Mode:** autonomous continuation from `$sunco-auto`

## Phase Boundary

Phase 02 turns the Phase 01 sandboxed HTML preview into a parent-owned editing loop. It must let the user select generated text, image, button, block, section, and artboard-like elements, apply constrained edits through typed operations, persist those edits in the project bundle, and recover the same state after reload.

This phase does not implement real AI generation, responsive preview modes, export jobs, design-system learning, share permissions, Canva handoff, or hosted production hardening.

## Product Bar

- The benchmark is Claude Design-level working surface quality, but the product direction goes beyond Claude Design: the generated result must behave like a directly editable PPT/Figma/Paper-style document, not a static iframe.
- The persona is a vibe coder who expects prompt-driven creation, fast direct correction, comments, versions, and safe handoff across Codex, Claude Code, Cursor, local agents, and web agents.
- Direct editability is a stored-state contract: `ProjectBundle + EditGraph + patch log + comments + versions + tweak values` remains source of truth. The live iframe DOM is a projection and must not be saved as durable state.

## Decisions

- Selection and overlays are owned by the parent app, while the sandboxed iframe reports only validated node geometry and selection events through nonce-bound postMessage.
- Phase 02 will use a constrained direct-manipulation subset: move, resize, align, reorder controls, and style/text/image edits through explicit patch ops. It will not attempt a full freeform vector editor.
- Comments attach to selected node IDs and preview rect snapshots so comments survive iframe reloads.
- Versions are stored as lightweight saved-state snapshots of normalized HTML plus patch count and label. This is enough for Phase 02 direction preservation without branching/export complexity.
- Tweaks become persisted values on the bundle and are materialized through typed patch application or fixture regeneration. They must update preview immediately and survive reload.
- Negative tests must prove invalid bridge messages still fail after adding selection/registry messages.

## Current Code Facts

- `packages/editor-core` already owns schemas, sanitization, normalization, stable `data-cdx-id`, `EditGraph`, and JSON persistence.
- `packages/preview-runtime` already builds the sandbox iframe document and validates `preview.ready`, `preview.runtime-error`, and `preview.console`.
- `apps/web` already has the Claude Design-like shell: left Chat/Comments, central canvas, top tools, right Tweaks/diagnostics, local bundle persistence, fixture tweaks, and Playwright Phase 01 tests.
- Missing pieces are patch application, node geometry/selection bridge messages, parent overlay, selected-node inspector, comment/version state, undo/redo, and end-to-end interaction tests.

## Required Outcomes

- Select/hover node events flow from iframe to parent only through validated bridge messages.
- Selection overlay appears around the correct node and stays aligned after preview reloads and window resize.
- Text and safe style edits update the stored normalized HTML immediately and append reversible patches.
- Move, resize, align, and reorder controls apply constrained layout patches to generated blocks.
- Comments and saved versions persist as part of the bundle.
- Undo and redo traverse text, style, layout, and tweak changes without corrupting the bundle.
- Browser tests cover toolbar paths, selected-node editing, comments, versions, tweaks, persistence reload, and bridge negative cases.

## Verification Plan

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm e2e`
- Browser visual/manual-style check with local dev server and screenshots. If Computer Use remains blocked by macOS automation permissions, record the failure and use browser automation plus Playwright screenshots as the direct UI verification path.
