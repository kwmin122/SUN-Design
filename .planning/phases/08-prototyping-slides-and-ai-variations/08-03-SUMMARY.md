---
plan: 08-03
title: Canvas-Aware Agent Output Ingestion Gap Closure
phase: 8
wave: 1
status: completed
lint_status: PASS
executed_at: 2026-04-28T21:28:00+09:00
executor_model: inline-codex
---

# Plan 08-03: Canvas-Aware Agent Output Ingestion Gap Closure - Execution Summary

## Objective Achieved

Closed the Phase 08 AI-01 through AI-04 ship hold with a local-first, agent-agnostic ingestion path: selected canvas object context package, structured agent output envelope, validated typed operations/patches, rejected-run diagnostics, side-by-side compare UI, explicit promotion, reload persistence, and browser E2E coverage. The post-review remediation also closes persisted reload/runtime/promote bypasses by reusing the same allowlist and unsafe-patch invariants after load. This is not hosted provider parity; it is the durable product path for Codex, Claude Code, Cursor, local agents, and web agents to produce replayable design changes.

## Tasks Completed

| # | Task | Commit | Notes |
|---|------|--------|-------|
| 1 | Add agent context and structured output schemas | this changeset | Added `AgentContextPackage`, `AgentOutputEnvelope`, diagnostics, runs, ProjectBundle arrays, and exports. |
| 2 | Validate agent output and close corruption paths | this changeset | Added agent-output ingestion helper, strict selected-region allowlists, rejected-run diagnostics, persisted integrity checks, runtime link checks, and agent-output promote safety checks. |
| 3 | Expose selected-region agent ingestion in the web workflow | this changeset | Added context creation, JSON ingestion, diagnostics, provenance labels, and editor-shell wiring. |
| 4 | Verify E2E loop and update completion docs | this changeset | Added unit, persistence, and Playwright coverage; updated requirements, state, and verification boundary. |

## Key Files

### Created

- `packages/editor-core/src/agent-output.ts` - Local-first context package creation, agent output parsing/ingestion, shared direction safety validation, and rejected-run persistence.
- `packages/editor-core/src/__tests__/agent-output.test.ts` - Core coverage for valid ingestion, stale revision, single direction, runtime mismatch, cross-target, unsupported/raw HTML, and promotion.
- `apps/web/tests/phase-08-agent-output.spec.ts` - Browser coverage for selected-region context creation, valid agent output ingestion, promotion, reload, diagnostics, and responsive no-overflow checks.

### Modified

- `packages/editor-core/src/schemas.ts` - Adds durable agent context/output/run schemas and `validated` variation status.
- `packages/editor-core/src/integrity.ts` - Validates persisted agent context packages, outputs, runs, runtime links, and agent-output variation records on load/serialize.
- `packages/editor-core/src/index.ts` - Exports the agent output module.
- `packages/editor-core/src/__tests__/persistence.test.ts` - Adds corrupt persisted agent-output reference, safety, and runtime-link rejection cases.
- `apps/web/components/variation-compare-panel.tsx` - Adds agent context, output JSON input, ingestion, diagnostics, and provenance display.
- `apps/web/components/editor-shell.tsx` - Wires agent context creation and output ingestion through stored bundle updates.
- `apps/web/app/globals.css` - Adds compact tool-rail styling for agent context/output diagnostics and agent-generated direction cards.
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/phases/08-prototyping-slides-and-ai-variations/08-VERIFICATION.md` - Updates Phase 08 execution status and honest completion boundary.

## Acceptance Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| Agent context package contains selected target id, revision, object summary, guardrails, and prompt path | PASS | Unit and E2E assert stored package fields and `docs/prompts/context-driven-design-agent-prompt.md`. |
| Agent output requires at least two generated directions | PASS | Schema uses `.min(2).max(6)`; unit and E2E cover single-direction rejection. |
| Runtime mismatch is rejected with diagnostics | PASS | Unit and E2E assert `runtime-mismatch` rejected runs. |
| Agent output is scoped to selected object and stored ids | PASS | Core validation rejects cross-target operations and patches. |
| Unsupported operations and raw HTML/unsafe patch values are rejected | PASS | Core tests assert `unsupported-operation` and `unsafe-patch`. |
| Persisted agent output cannot bypass validation after reload | PASS | Persistence tests reject unsupported persisted `agentOutputs`, unsafe patch values, runtime mismatches, and agent-output variation records. |
| Persisted agent-output directions cannot bypass validation during promote | PASS | Variation tests reject unsupported `agent-output:*` directions before any typed operation is applied. |
| Valid agent directions appear side by side and can be promoted | PASS | Unit and E2E assert `Agent sharper hierarchy`, `Agent calmer rhythm`, promotion, and reload persistence. |
| No live iframe DOM is persisted | PASS | E2E asserts saved state does not contain `iframe.contentDocument`. |
| Desktop/tablet/mobile no-overflow remains intact | PASS | E2E checks 1440, 768, and 390 px widths. |

## Lint Gate

**Status:** PASS

- `pnpm --filter @kdesign/editor-core typecheck` passed.
- `pnpm --filter @kdesign/web typecheck` passed.
- `pnpm --filter @kdesign/editor-core test -- src/__tests__/agent-output.test.ts src/__tests__/persistence.test.ts src/__tests__/variations.test.ts` passed: 15 files, 84 tests.
- `pnpm exec playwright test apps/web/tests/phase-08-agent-output.spec.ts` passed: 2 browser tests.
- `npx tsc --noEmit`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (16 files, 92 tests), and `pnpm e2e` (24 browser tests) passed.

## Deviations

Execution was performed inline rather than spawning SUNCO executor subagents because this Codex session only permits subagents when the user explicitly asks for delegated/parallel agent work. The executed scope still stayed within `08-03-PLAN.md`.

## Self-Check

PASS
