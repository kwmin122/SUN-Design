---
phase: 08
title: Prototyping, Slides, and AI Variations
slug: prototyping-slides-and-ai-variations
milestone: 2
status: gap_context_ready
inserted_by: reinforce
source: .planning/research/COMPETITIVE-GAP-REVIEW.md
gathered: 2026-04-28
mode: gaps-only
---

# Phase 08 Context — Prototyping, Slides, and AI Variations

**Gathered:** 2026-04-28
**Status:** Ready for gap planning
**Mode:** `$sunco-discuss 8 --gaps-only`

<domain>

## Phase Boundary

Phase 08 already has a verified foundation for prototype interactions, presentation preview, slide decks, deterministic variation comparison, promotion, portable agent recipes, and persisted reference integrity.

This gap discussion is narrower than the original Phase 08 discussion. It exists only to close the Phase 08 ship hold for AI-01 through AI-04:

- selected-region AI rewrite/restyle.
- side-by-side generated visual directions.
- right-click or selected-object localized remix with provenance.
- canvas-aware agent action that reads the current canvas object model and emits typed operations instead of raw DOM edits.

Prototype graph, presentation state, slide decks, presenter notes, feedback primitives, and AI-05 portable recipe export are not reopened unless they directly block the AI-01 through AI-04 gap.

</domain>

<decisions>

## Implementation Decisions

### Gap Scope

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-08G-01 | Treat AI-01 through AI-04 as the only Phase 08 gap scope. | Phase 08 foundation and integrity blockers are already fixed. Reopening prototype/slide scope would create churn without addressing the ship hold. | Planner must create a gap-only plan and avoid broad Phase 08 rework. |
| D-08G-02 | Do not mark AI-01 through AI-04 complete from deterministic local directions alone. | Prior verification correctly found that `Tighter hierarchy`, `Roomier rhythm`, and `Presentation emphasis` are demo/foundation directions, not generated model output. | Deterministic directions can stay as test fixtures or offline fallback, but cannot be the completion evidence. |
| D-08G-03 | Complete the gap only when a selected-region request flows through a real model-shaped ingestion path: canvas context package -> agent/model structured output -> validated typed operations or patches -> compare/promote. | The product target is Claude Design/Paper/Figma-level workflow, but runtime must stay agent-agnostic. The durable contract is output ingestion, validation, provenance, and replayability, not a single vendor API. | Plans must add new schemas/helpers and UI states for agent runs and generated directions. |

### Agent Runtime and Output Contract

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-08G-04 | Keep the runtime agent-agnostic: Codex, Claude Code, Cursor, local agents, and web agents are all valid producers. | `.planning/PRODUCT-NORTH-STAR.md` forbids Claude-only or Anthropic-only architecture. | Any adapter interface must be replaceable and stored as portable project state. |
| D-08G-05 | For this gap plan, allow a local-first bridge/import path for agent output, plus a deterministic fixture adapter for tests. Do not require hosted auth, paid model API keys, worker queues, or provider billing. | The repo is still local-first. A model/provider adapter can come later, but the product can still ingest real agent-produced structured output from another runtime. | Planner should implement an `AgentRun`/`AgentOutput` ingestion contract without adding cloud infrastructure. |
| D-08G-06 | Agent output must be structured data, not prose instructions or raw HTML. It should include direction metadata, target object id, base revision, typed `CanvasOperation[]`, typed `EditPatch[]`, rationale, provenance, and diagnostics. | Paper/Figma-style direct editability requires operation-level state. Raw HTML or live DOM mutation would violate the architecture contract. | Add schema validation and negative tests for malformed output, missing refs, stale revision, cross-target operations, raw HTML, and unsafe patch values. |

### Canvas Context Package

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-08G-07 | Package only the selected region and necessary surrounding context: target canvas object, ancestor chain, relevant sibling summary, linked edit node, design tokens/system references, source revision, and user prompt. | Full-bundle prompts are noisy and risk broad unintended edits. Selected-region remix must preserve surrounding layout. | Add helper to build a small `AgentContextPackage` from `ProjectBundle` and selected object. |
| D-08G-08 | The package must explicitly forbid live iframe DOM as a source of truth and require operation output against stored ids. | This carries forward the Phase 01 and Phase 06 source-of-truth decisions. | Include guard text in the package and reject output that cannot map back to stored ids. |
| D-08G-09 | Include the design-producing prompt path `docs/prompts/context-driven-design-agent-prompt.md` as a required instruction reference for visual artifact work. | User explicitly made this the core codex-design prompt for design-producing AI. | Generated agent packages and UI copy must point to the same prompt path instead of embedding hidden vendor prompts. |

### Product Workflow

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-08G-10 | Add an explicit selected-object "Ask agent" / "Remix selection" workflow in the variation panel and right-click/selected-object affordance where feasible. | Claude Design and Paper emphasize targeted iteration from the canvas, not only a detached form. | Plan should wire the workflow from the selected canvas object and keep the panel visible. |
| D-08G-11 | Show generated directions as reviewable candidates with status: `draft`, `validated`, `rejected`, `promoted`. | A pro design tool must not silently apply model output. | UI must show validation failures, operation count, rationale, and promote action per direction. |
| D-08G-12 | Keep promotion explicit and replay typed operations through existing operation/patch helpers. No direct iframe mutation and no silent partial apply. | Prior graph integrity work exists to avoid corruption. | Planner must reuse `applyCanvasOperationToBundle`, `applyEditPatchToBundle`, and integrity validators. |

### Validation, Diagnostics, and Tests

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-08G-13 | Reuse and extend `assertProjectBundleIntegrity` for agent-output validation before saving generated directions. | Phase 08 already fixed persisted-state corruption. The agent path must not reintroduce the same bug class. | Add helper-level and persistence-level negative tests. |
| D-08G-14 | Diagnostics must distinguish model parse errors, schema errors, stale revision, out-of-scope target edits, unsafe raw HTML, and unsupported operation kinds. | Users and later agents need actionable failure states, not a generic "generation failed". | Add visible UI diagnostics and test coverage for rejection paths. |
| D-08G-15 | Completion requires browser E2E for the full selected-region agent loop: create package, ingest generated output, compare directions, promote one, reload, and prove no body overflow. | The quality bar is product workflow, not schema-only. | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`, artifact hash, and targeted negative tests are required before ship. |

### Claude's Discretion

- Exact TypeScript type names are up to the planner, but the concepts must remain clear: context package, agent run/output, generated direction, validation diagnostics.
- Exact UI labels may be adjusted for Korean-first clarity, as long as the workflow is not hidden behind developer-only terminology.
- The first real ingestion path can be local-first/import-based if it genuinely accepts model/agent-produced structured output and validates it through the same production path. A hardcoded direction generator alone is not acceptable.

</decisions>

<canonical_refs>

## Canonical References

Downstream agents MUST read these before planning or implementing.

### Project and SUNCO Contracts

- `CLAUDE.md` — project guide, architecture boundaries, security rules, SUNCO workflow.
- `.planning/PRODUCT-NORTH-STAR.md` — canonical product intent and competitive parity contract.
- `.planning/PROJECT.md` — product value, active requirements, out-of-scope boundaries.
- `.planning/REQUIREMENTS.md` — AI-01 through AI-04 foundation-only status and AI-05/prototype/slide completion status.
- `.planning/ROADMAP.md` — Phase 08 success criteria and current ship hold wording.
- `.planning/STATE.md` — current phase status and next action.
- `docs/guides/coding-principles.md` — mandatory engineering principles.

### Phase 08 Artifacts

- `.planning/phases/08-prototyping-slides-and-ai-variations/08-RESEARCH.md` — original Phase 08 research and rejected alternatives.
- `.planning/phases/08-prototyping-slides-and-ai-variations/08-01-PLAN.md` — completed foundation plan with AI-01 through AI-04 corrected to foundation-only.
- `.planning/phases/08-prototyping-slides-and-ai-variations/08-02-PLAN.md` — completed web workflow plan with AI-01 through AI-04 corrected to foundation-only.
- `.planning/phases/08-prototyping-slides-and-ai-variations/08-01-SUMMARY.md` — foundation execution summary.
- `.planning/phases/08-prototyping-slides-and-ai-variations/08-02-SUMMARY.md` — UI execution summary.
- `.planning/phases/08-prototyping-slides-and-ai-variations/08-VERIFICATION.md` — ship-hold evidence and post-review remediation.

### Prior Phase Context

- `.planning/phases/05-design-systems-sharing-and-agent-agnostic-handoff/05-CONTEXT.md` — runtime-agnostic handoff contract.
- `.planning/phases/06-canvas-and-component-model/06-CONTEXT.md` — stored canvas graph, operation log, and no-live-DOM decisions.
- `.planning/phases/07-design-system-tokens-and-code-connect/07-CONTEXT.md` — governed tokens/code references and component playground context.

### Competitive and Design References

- `.planning/research/COMPETITIVE-GAP-REVIEW.md` — Claude Design, Paper, and Figma capability gap matrix.
- `docs/prompts/context-driven-design-agent-prompt.md` — required prompt for design-producing agents.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `packages/editor-core/src/schemas.ts` already defines `VariationSet`, `VariationDirection`, `AgentRecipe`, `CanvasOperation`, `EditPatch`, and `ProjectBundle` fields for `variationSets` and `agentRecipes`.
- `packages/editor-core/src/variations.ts` already creates variation sets, deterministic directions, promotion, and agent recipes. The gap plan should extend this rather than replacing it wholesale.
- `packages/editor-core/src/integrity.ts` now validates persisted prototype, presentation, slide, variation, and recipe references. Agent-output ingestion should reuse this validation style.
- `packages/editor-core/src/canvas-operations.ts` and `packages/editor-core/src/patches.ts` are the application paths for stored typed changes.
- `apps/web/components/variation-compare-panel.tsx` already has selected-region prompt, direction list, promote, runtime selector, and recipe export UI.
- `apps/web/tests/phase-08-variations.spec.ts` already covers the deterministic remix workflow and should be expanded or paired with a real ingestion E2E.

### Established Patterns

- Stored state is authoritative. The iframe is a sandboxed projection and must not be used as a persistence source.
- Canvas edits are typed operations or typed patches with source revision and target ids.
- Portable agent handoff uses safe repo-relative prompt paths under `docs/prompts/`.
- Product claims must be honest: deterministic local helpers can prove structure, but they do not complete "AI-generated" requirements.

### Integration Points

- Core schema: extend `ProjectBundleSchema` with agent-run/output records only if needed for durable state and reloadability.
- Core helpers: add context-package creation, output parse/validate, generated direction ingestion, and rejection diagnostics.
- Web UI: extend the variation panel and selected-object workflow to create packages, accept/import/run agent output, show status, compare directions, and promote.
- Tests: add unit tests around invalid output and E2E around the user-visible selected-region agent path.

</code_context>

<specifics>

## Specific Ideas

- The target is Claude Design / Paper / Figma / huashu-design class, but not vendor lock-in.
- Claude Design benchmark: chat/canvas iteration, selected feedback, variations, export/share, and design-system inheritance.
- Paper benchmark: web-standard canvas, code components, Tailwind/CSS Grid semantics, live data, canvas-aware agent/right-click remix direction.
- Figma benchmark: object selection, variables/components, Dev Mode-style inspect/code connection, and explicit ready/review workflows.
- huashu-design benchmark: agent-agnostic high-fidelity prototype, slides, review, animation, and export workflow direction. Do not copy restricted files/templates.
- The first gap closure should be practical and local-first: model-shaped structured output ingestion is required; hosted model billing/auth is not.

</specifics>

<assumptions>

## Assumptions

- No API key or hosted model provider is available by default.
- The user prefers moving forward with strong defaults instead of pausing for a long decision interview.
- The next plan may add a structured import/bridge path for agent output and a deterministic fixture adapter for tests.
- A later phase can add richer provider adapters, live data/context ingestion, and hosted collaboration.

</assumptions>

<deferred>

## Deferred Ideas

- Phase 09: real source ingestion, source notes, design context files, live web snapshots, data binding, asset provenance.
- Phase 10: Dev Mode inspect, publish, deterministic export fidelity, code-agent roundtrip.
- Phase 11: collaboration, search, governance, review states, audit log.
- Later: advanced media/effects, full vector editor, marketplace, realtime multiplayer.

</deferred>

---

*Phase: 08-prototyping-slides-and-ai-variations*
*Context gathered: 2026-04-28*
