# Phase 06 Discussion Log — Canvas and Component Model

Date: 2026-04-28

## Trigger

User requested `$sunco-discuss 6` and clarified that the previous work completed the competitive reinforcement roadmap/context, not Paper/Claude Design-grade implementation. The next step is Phase 06 scope confirmation before implementation.

## Mode

Automated recommended-default discussion.

Codex Default mode does not expose the structured `AskUserQuestion` UI required by the original SUNCO workflow, so decisions were selected from the project north star, roadmap, requirements, competitive review, prior phase contexts, and current code shape.

## Reviewed Context

- `CLAUDE.md`
- `.planning/PRODUCT-NORTH-STAR.md`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/research/COMPETITIVE-GAP-REVIEW.md`
- `.planning/phases/01-safe-html-document-foundation/01-CONTEXT.md`
- `.planning/phases/02-direct-editing-comments-and-tweaks/02-CONTEXT.md`
- `.planning/phases/03-prompt-creation-modes-assets-and-korean-presets/03-CONTEXT.md`
- `.planning/phases/04-responsive-preview-and-export-fidelity/04-CONTEXT.md`
- `.planning/phases/05-design-systems-sharing-and-agent-agnostic-handoff/05-CONTEXT.md`
- `packages/editor-core/src/schemas.ts`
- `packages/editor-core/src/normalize.ts`
- `packages/editor-core/src/patches.ts`
- `packages/preview-runtime/src/bridge.ts`
- `apps/web/components/editor-shell.tsx`

## Resolved Gray Areas

| Gray area | Selected direction |
|---|---|
| Does Phase 06 replace the HTML-first model? | No. It adds a canvas/component graph over the existing source-of-truth family. |
| Is the layer tree raw DOM hierarchy? | No. It is a user-facing canvas object hierarchy derived from stored object metadata and normalized nodes. |
| Does Phase 06 include full Figma auto layout? | No. It starts with web-native flex/grid/constraint semantics that can be validated and exported as HTML/CSS. |
| Does Phase 06 include full vector editing? | No. It supports only safe vector-like primitives representable in sanitized HTML/SVG/CSS. |
| Are components project-local or governed design-system assets? | Project-local in Phase 06. Governance, publishing, token/code connection, and component playground move to Phase 07. |
| Are AI-selected region edits included? | No. Canvas-aware AI actions and localized remix belong to Phase 08. |
| Is UI required or can this be schema-only? | UI is required. A visible layer tree, inspector, layout controls, and component controls are part of Phase 06. |
| What must verification prove? | Backward-compatible load, deterministic typed operations, reloadable canvas/component state, negative validation tests, and browser workflows at desktop/tablet/mobile. |

## Scope Guardrail

Phase 06 must move the product toward Paper/Claude Design/Figma-level completeness without claiming that full parity is finished. It is the object/component foundation that later parity phases depend on.

## Next Step

Run `/sunco:plan 6`.
