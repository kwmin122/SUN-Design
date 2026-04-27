# Phase 01: Safe HTML Document Foundation - Research

## Recommended Approach

Build Phase 01 as a narrow but production-shaped foundation in two execution plans.

Plan 01 should create the TypeScript workspace and `packages/editor-core` contract first: real Zod schemas for `ProjectBundle`, `EditGraph`, `EditNode`, `EditPatch`, `AssetRef`, `PreviewMessage`, and `PreviewError`; deterministic fixture HTML; a parse5/PostCSS based sanitizer; stable `data-cdx-id` normalization; and serializable project persistence helpers. This satisfies the source-of-truth and safe normalization work without introducing UI complexity.

Plan 02 should add `packages/preview-runtime` and `apps/web`: an app-owned bridge script, a parent-side postMessage validator that checks source, nonce, type, and schema, a sandboxed iframe preview, local-first reloadable state, and a compact diagnostics surface. This keeps the iframe as a projection boundary and proves the end-to-end Phase 01 loop with visible readiness, sanitizer changes, bridge failures, runtime errors, and console errors.

The implementation should use `ProjectBundle + EditGraph + patch log + assets` as durable state. The live iframe DOM must never become the saved source of truth.

## Alternative(s) Considered

### Single Large Plan

A single plan could scaffold the repo, implement core models, bridge runtime, and web UI at once. This was rejected because it would make execution too broad for one fresh agent and would blur the core schema/normalization contract with app integration work.

### Three-Plan Split

A three-plan split of scaffold, core normalizer, and web preview was considered. It was rejected because the greenfield repo has no existing package setup, and the preview work depends directly on the core contracts. Two sequential plans give cleaner dependency boundaries without inventing a third wave.

### Live DOM Prototype

Rendering fixture HTML in an iframe and saving the iframe DOM would be faster. This is rejected by the Phase 01 context because it violates the stored-state export path, sandbox architecture, and later edit/undo/reload requirements.

## Implementation Map

- `package.json` - root workspace scripts, pinned dependencies, lint/typecheck/test commands.
- `pnpm-workspace.yaml` - workspace packages under `apps/*` and `packages/*`.
- `tsconfig.base.json`, `tsconfig.json` - strict TypeScript build references.
- `vitest.config.ts` - unit test configuration for packages.
- `eslint.config.mjs` - flat ESLint config for TypeScript and React sources.
- `packages/editor-core/src/schemas.ts` - Zod schemas and exported inferred types for Phase 01 source of truth.
- `packages/editor-core/src/preview-schemas.ts` - shared preview message and diagnostics schemas.
- `packages/editor-core/src/sanitize.ts` - static-first HTML/CSS sanitizer and sanitizer report.
- `packages/editor-core/src/normalize.ts` - deterministic `data-cdx-id` injection and `EditGraph` construction.
- `packages/editor-core/src/persistence.ts` - parse/serialize helpers and repository interface for local-first, server-portable state.
- `packages/editor-core/src/fixtures.ts` and fixture HTML - deterministic sample artifact.
- `packages/preview-runtime/src/bridge.ts` - app-owned iframe bridge script/document assembly.
- `packages/preview-runtime/src/validation.ts` - postMessage validator with source, nonce, type, and schema checks.
- `apps/web/app/page.tsx` and app components - Phase 01 UI shell, sandboxed iframe, diagnostics panel, local reload flow.
- `apps/web/lib/local-project-store.ts` - localStorage adapter using the portable `ProjectBundle` schema.
- `playwright.config.ts`, `apps/web/tests/phase-01.spec.ts` - browser-level smoke tests for sandbox, reload, diagnostics, and invalid bridge messages.

## Dependencies

Use pinned versions verified from the npm registry on 2026-04-27:

- `next@16.2.4` - web app framework.
- `react@19.2.5`, `react-dom@19.2.5` - UI runtime.
- `typescript@6.0.3` - strict project references and type checking.
- `zod@4.3.6` - runtime schemas for project bundles and bridge messages.
- `parse5@8.0.1` - HTML parse/serialize for sanitizer and normalizer.
- `postcss@8.5.12` - CSS value filtering for dangerous URLs/imports.
- `vitest@4.1.5` - package unit tests.
- `@playwright/test@1.59.1` - Phase 01 browser smoke tests.
- `eslint@10.2.1`, `@typescript-eslint/parser@8.59.0`, `@typescript-eslint/eslint-plugin@8.59.0` - lint gate.
- `tsx@4.21.0` - small TypeScript scripts if needed during implementation.
- `lucide-react@1.11.0` - simple diagnostics icons in the web shell.
- `zustand@5.0.12` - local editor session state if the web shell needs shared state.

No AI SDK, auth, database, object storage, export worker, direct editing, Tweaks, responsive preview, or production observability dependencies should be added in Phase 01.

## Risk Register

| Risk | Mitigation |
|------|------------|
| Scope creep into editing/Tweaks/export | Plan files explicitly forbid direct editing, Tweaks, responsive modes, AI generation, and export. |
| Sanitizer is too weak | Use parse5 traversal, positive element/attribute policy, PostCSS URL/import filtering, and negative tests for scripts, event handlers, forms, top navigation, and embeds. |
| IDs are unstable across reload | Derive `data-cdx-id` from traversal path plus fingerprint and assert deterministic output in tests. |
| Iframe bridge accepts spoofed messages | Validator must reject wrong source, missing nonce, wrong nonce, unknown type, and schema-invalid payloads with tests. |
| Local persistence becomes a throwaway shape | Store and reload the same `ProjectBundle` JSON schema that later server persistence can store as JSONB/object state. |
| Diagnostics are invisible or untestable | Web shell must render readiness, sanitizer report counts, bridge validation failures, runtime errors, and console errors in stable testable text. |
| Next app starts before core contracts are stable | Plan 02 depends on Plan 01 and imports only public `@kdesign/editor-core` exports. |

## RESEARCH COMPLETE
