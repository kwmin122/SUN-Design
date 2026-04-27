---
plan: 01-02
title: Build sandboxed preview runtime and reloadable diagnostics UI
phase: 1
wave: 2
status: completed
lint_status: PASS
executed_at: 2026-04-27T13:03:25Z
executor_model: inline-codex
---

# Plan 01-02: Build Sandboxed Preview Runtime and Reloadable Diagnostics UI - Execution Summary

## Objective Achieved

Created the Phase 01 browser path on top of `editor-core`: `packages/preview-runtime`, the Next.js web app, sandboxed iframe preview, validated parent-side bridge handling, local-first reloadable `ProjectBundle` state, visible diagnostics, and a production-shaped agent-agnostic studio shell.

The shell now exposes the expected product surface: left Chat/Comments, creation modes, fidelity choices, design library/search, central sandboxed canvas, top file/share/export/tool controls, and a right Tweaks/diagnostics rail. Phase 01 functionality remains fixture/imported HTML only; the visible controls either remain shell affordances or rebuild stored fixture state through the safe pipeline.

## Tasks Completed

| # | Task | Commit | Notes |
|---|------|--------|-------|
| 1 | Create preview-runtime bridge and validator | 77a40c4 | Nonce generation, CSP-wrapped `srcDoc`, app-owned bridge script, and strict source/nonce/type/schema validation. |
| 2 | Create the agent-agnostic studio shell with sandboxed iframe preview | 77a40c4 | Next app, Claude Design-level working surface, Korean fixture preview, and right-side diagnostics/Tweaks rail. |
| 3 | Add reloadable local persistence and parent-side message handling | 77a40c4 | `localStorage` persistence uses editor-core serialization and schema parsing; invalid saved state is cleared. |
| 4 | Add Phase 01 browser smoke tests and final gates | 77a40c4 | Playwright tests cover sandbox, diagnostics, spoof rejection, reload, and fixture-only Tweaks state rebuild. |

## Key Files

### Created

- `packages/preview-runtime/src/bridge.ts` - preview nonce, app-owned bridge script, and CSP-wrapped preview document.
- `packages/preview-runtime/src/validation.ts` - strict parent-side bridge message validation.
- `apps/web/components/editor-shell.tsx` - Phase 01 studio shell and fixture-only Tweaks state regeneration.
- `apps/web/components/preview-frame.tsx` - sandboxed iframe and message listener.
- `apps/web/components/diagnostics-panel.tsx` - readiness, sanitizer, bridge, runtime, and console diagnostics.
- `apps/web/lib/local-project-store.ts` - reloadable local-first `ProjectBundle` persistence.
- `apps/web/lib/preview-message-handler.ts` - bridge/runtime/console message conversion into `PreviewError`.
- `apps/web/tests/phase-01.spec.ts` - browser smoke coverage.
- `docs/brand/app-shell-visual-source-notes.md` and `apps/web/public/brand/studio-foundation-art.png` - generated visual foundation asset and source notes.

### Modified

- `packages/editor-core/src/fixtures.ts` and `packages/editor-core/src/fixtures/basic-landing.html` - higher-fidelity Korean fixture with data-URI product art, unsafe negative cases, and mobile-stable layout.
- Root package, TypeScript, Playwright, and lockfile configuration for the web app and preview runtime.
- `.gitignore` to ignore generated Playwright output and temporary screenshots.

## Acceptance Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| `packages/preview-runtime` builds a preview document with only the app-owned bridge | PASS | `buildPreviewDocument` wraps normalized HTML with CSP and one injected bridge script. |
| Bridge validation rejects wrong source, missing nonce, wrong nonce, unknown type, and malformed payloads | PASS | `validation.test.ts` covers all cases. |
| Web app renders fixture in `sandbox="allow-scripts"` iframe without `allow-same-origin` | PASS | Playwright assertion passed. |
| Parent app saves and reloads schema-validated `ProjectBundle` from localStorage | PASS | E2E reload test passed. |
| Diagnostics separate readiness, sanitizer, bridge, runtime, and console signals | PASS | Test IDs and counts verified. |
| Studio shell shows Chat/Comments, file tabs, Share/Export/tools, canvas, Tweaks, creation modes, fidelity options, library tabs, and search | PASS | Browser screenshot check verified all labels. |
| Fixture-only Tweaks rebuild stored `ProjectBundle` through the safe pipeline | PASS | E2E test clicked layout, density, and point color controls and verified stored normalized HTML. |
| Mobile iframe preview avoids horizontal overflow | PASS | Browser check recorded `scrollW === clientW` at 390px viewport. |

## Verification Commands

| Command | Result |
|---|---|
| `pnpm build:packages` | PASS |
| `pnpm --filter @kdesign/web typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS: 4 files, 17 tests |
| `pnpm typecheck` | PASS |
| `pnpm e2e` | PASS: 5 browser tests |
| Playwright screenshot smoke | PASS: desktop/mobile shell labels, sandbox, local storage, diagnostics ready, no console/page errors |

## Deviations

The local SUNCO runtime does not expose the documented `sunco-executor` agent type or `phase-plan-index` command, so execution ran inline. Browser Use's required callable tool was not exposed in this session and Computer Use previously failed with macOS Apple event permission error `-1743`, so browser verification used Playwright screenshots instead.

## Self-Check

PASS

