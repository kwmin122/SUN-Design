---
phase: 09
title: Context Ingestion, Live Data, and Assets
slug: context-ingestion-live-data-and-assets
milestone: 2
status: context_ready
inserted_by: reinforce
source: .planning/research/COMPETITIVE-GAP-REVIEW.md
gathered: 2026-04-28
mode: automated recommended-default discussion
---

# Phase 09 Context — Context Ingestion, Live Data, and Assets

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Mode:** `$sunco-discuss 9`

<domain>

## Phase Boundary

Phase 09 replaces placeholder context records with real, inspectable project context:

- source ingestion for images, screenshots, URLs, DOCX, PPTX, XLSX, Figma exports, and codebase folders.
- generated `source-notes.md` and `design-context.md` files that record official sources, asset paths, uncertain facts, usage rights, and collection date.
- safe live web page or selected-region snapshot import into editable canvas sections.
- data-bound repeated content from CSV, spreadsheet, static JSON, and API fixture snapshots.
- stable project asset references with cache, relink, replace, audit, and provenance metadata.
- local-first sync semantics that can later move to a hosted account without rewriting the project model.

Phase 09 must make context reliable enough for Claude Design / Paper / Figma-level output quality, but it must not become full hosted storage, authenticated scraping, multiplayer collaboration, Dev Mode, publish, or export fidelity work. Those remain Phase 10-11 or later.

</domain>

<decisions>

## Implementation Decisions

### Source Ingestion Contract

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-09-01 | Promote context from loose `ContextAttachment` metadata into a first-class stored context model: `SourceRecord`, `IngestionJob`, parsed context artifacts, generated note files, and asset links. | Phase 03 only records placeholder attachments. Professional design output depends on source material being traceable and reusable, not just visible as chips in the prompt composer. | Planner must extend `ProjectBundle` with versioned context records while preserving old bundles. |
| D-09-02 | Support these Phase 09 input families: image/screenshot, public URL, web capture, DOCX, PPTX, XLSX/CSV, static JSON, API fixture, Figma export/link metadata, and codebase folder manifest. | These are the requirement types in CTX-01/DATA-02 and match Claude Design context upload, Figma Make frame/library context, and Paper's connected-canvas/live-data direction. | Plan should not implement a generic arbitrary-file parser. Each accepted family needs schema validation, status, and deterministic test fixtures. |
| D-09-03 | For documents and folders, the first slice should extract enough useful text/metadata/asset references for design context, not attempt pixel-perfect DOCX/PPTX/Figma reconstruction. | Phase 10 owns export fidelity and deeper file materialization. Phase 09's job is reliable source ingestion and provenance. | Planner can choose parsers conservatively and must expose unsupported/partial parse diagnostics. |
| D-09-04 | Figma support in Phase 09 means Figma export/link/package ingestion as context, not native Figma API roundtrip or pixel-perfect editable Figma import. | Full Figma parity is the final product target, but native Figma roundtrip is broader than this phase. | Store Figma source metadata, frame names, screenshots/assets, and provenance where available; defer full Figma sync/export to later work. |

### Provenance, Source Notes, and Design Context

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-09-05 | Every ingested source must have type, hash, source URL or local path, MIME/type evidence, created/imported timestamp, parse status, usage status, and diagnostics. | This closes the "AI hallucinated or unlicensed assets" risk from the research docs. | `assertProjectBundleIntegrity` or an equivalent validator must reject broken references and invalid status transitions. |
| D-09-06 | Generate/update `source-notes.md` from source records and `design-context.md` from the design-context schema in `docs/prompts/context-driven-design-agent-prompt.md`. | The user explicitly made source notes and design context mandatory for design-producing agents. | These files must be available in the project/handoff/export package and visible in the web UI. |
| D-09-07 | Do not use unverified assets as core visuals. Unknown or rights-unclear sources must stay in `unknown`, `blocked`, or `placeholder` state until user-provided or official/public source evidence exists. | The product must avoid generic or legally risky AI design output. | Generation, Tweaks, export, and agent handoff should surface warnings instead of silently embedding risky assets. |
| D-09-08 | Record uncertainty explicitly: missing official source, guessed brand color, unverifiable logo, partial document parse, unsupported Figma metadata, or non-cacheable asset. | Good design agents need to know what is confirmed and what is assumed. | `source-notes.md`, `design-context.md`, diagnostics, and quality gates should all preserve uncertainty. |

### Web Snapshot and URL Capture

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-09-09 | Web snapshot import must create a sanitized, editable snapshot section from stored fetched/rendered source, never from a trusted live remote DOM. | Phase 01's iframe boundary and Phase 06's no-live-DOM source-of-truth decision still apply. | Use sanitizer/normalizer paths; strip scripts/events/forms; store snapshot provenance and source URL. |
| D-09-10 | Capture both a visual reference and editable structure where feasible: screenshot/thumb, sanitized HTML fragment, extracted text, assets, computed style summary, and mapping to canvas objects. | Paper Snapshot-style value comes from editable sections, but screenshot-only references are still useful when structure extraction is unsafe. | UI should show "editable", "reference-only", or "blocked" snapshot status. |
| D-09-11 | No private-site scraping, credential reuse, browser cookie capture, or hidden authenticated fetch in Phase 09. User-provided files and public/user-entered URLs are allowed. | Security and legal boundaries matter more than appearing magical. | Authenticated connectors belong in a later hosted/integration phase. |

### Data Binding

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-09-12 | Add local-first `DataSource` and `DataBinding` records for CSV, XLSX-derived tables, static JSON, and API fixture snapshots. | Figma Make and Paper both point toward real data-backed design work; Phase 09 can prove this without live authenticated APIs. | Components can preview repeated realistic content while staying deterministic in tests. |
| D-09-13 | Bind data to repeatable canvas/component targets by object id, field mapping, row limit, empty/loading/error preview states, and source revision. | A pro tool needs inspectable bindings, not string replacement hidden inside generated HTML. | Invalid field refs, stale object ids, and unsafe values must be rejected or degraded with diagnostics. |
| D-09-14 | "API fixture" means a captured/static JSON response with provenance and refresh metadata, not a live production API connector. | Full live API auth, secrets, and hosted jobs are out of Phase 09. | The plan can add an adapter-shaped schema while implementing deterministic fixture import first. |

### Asset Cache and Stable Project URLs

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-09-15 | Extend assets from simple refs into an audited asset lifecycle: candidate, verified, cached, relinked, replaced, blocked, placeholder. | Current `AssetRef` has useful status but not enough lifecycle/history for Paper/Figma-grade asset governance. | Planner should add replacement history, hash checks, source note links, and export-safe paths. |
| D-09-16 | Internal references should use stable project URLs such as `kdesign://asset/{projectId}/{assetId}` or an equivalent local-first URL contract, materialized to real paths during preview/export. | Asset URLs must survive reload, replacement, handoff, and later hosted storage. | Preview/export code must resolve project URLs through the asset manifest rather than leaving raw external URLs everywhere. |
| D-09-17 | Replacing an asset must preserve patch logs and update dependent nodes/bindings through typed operations. | Direct editability depends on stable references after asset replacement. | Tests must cover replacing an image used by an edit node, canvas object, context record, and export materialization. |

### Local-First Sync Boundary

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-09-18 | Phase 09 addresses DATA-01 as foundation-only: build an account-shaped, server-portable sync envelope and deterministic local/mock adapter, but do not mark DATA-01 fully complete until hosted-account sync semantics are implemented and verified. | The requirement says documents sync between local storage and a hosted account. Phase 09 can define and validate the portable contract, but production auth, billing, permissions, object storage, and real hosted account behavior belong later. | Implement sync metadata, remote document ids, revision cursors, conflict diagnostics, and import/export tests against a local/mock adapter. Planning and verification must preserve the claim boundary. |
| D-09-19 | Sync must never turn the remote snapshot into the only source of truth. `ProjectBundle + EditGraph + patch log + assets + tweak values + Milestone 2 records` remain canonical. | This preserves the durable architecture contract. | Remote state is a projection/cache/transport package with validation on load. |
| D-09-20 | Conflict handling in Phase 09 can be conservative: detect divergent base revisions and block with diagnostics rather than auto-merging. | Real conflict merging is Phase 11/governance territory. | Tests should prove corrupt or stale remote payloads are rejected. |

### Product Surface and Verification

| ID | Decision | Reason | Impact |
|---|---|---|---|
| D-09-21 | The visible UI slice must include a context ingestion queue, source-notes/design-context viewer, web snapshot tool, data-binding panel, and asset provenance inspector. | Schema-only work would not meet the product bar. | E2E tests must exercise user-visible flows and responsive layout. |
| D-09-22 | Completion requires negative tests for unsafe URLs, unsupported file types, parse failures, stale bindings, invalid asset replacements, rights-unclear assets, and corrupt sync payloads. | Previous phases found real integrity bugs only through adversarial checks. | Plan must include unit and browser tests, not only happy-path fixture checks. |
| D-09-23 | Keep implementation local-first and deterministic. Do not introduce paid provider APIs, background queues, full hosted object storage, or browser extension dependencies in this phase. | Scope control keeps the foundation shippable while preserving future portability. | External network tests should use fixtures/mocks unless a specific public URL smoke is clearly isolated and deterministic. |

### Claude's Discretion

- Exact TypeScript type names are up to the planner, but the concepts must remain explicit: source records, ingestion jobs, generated notes, web snapshots, data sources, bindings, asset lifecycle, and sync envelope.
- Exact parsing libraries are research/planning decisions. Prefer small, maintained libraries already compatible with the repo stack, but do not add broad parser abstractions before a real fixture demands them.
- Exact UI labels can be Korean-first, but the product surface must not hide provenance behind developer-only JSON.
- The first sync adapter can be a deterministic local/mock adapter if it proves server-portable semantics and reload validation.

</decisions>

<canonical_refs>

## Canonical References

Downstream agents MUST read these before planning or implementing.

### Project and SUNCO Contracts

- `CLAUDE.md` — project guide, architecture boundaries, security rules, SUNCO workflow.
- `.planning/PRODUCT-NORTH-STAR.md` — canonical product intent and competitive parity contract.
- `.planning/PROJECT.md` — product value, active requirements, out-of-scope boundaries.
- `.planning/REQUIREMENTS.md` — CTX-01 through CTX-03, DATA-01 through DATA-02, and ASSET-01 requirements.
- `.planning/ROADMAP.md` — Phase 09 goal and success criteria.
- `.planning/STATE.md` — current phase status and next action.
- `docs/guides/coding-principles.md` — mandatory engineering principles.
- `docs/prompts/context-driven-design-agent-prompt.md` — required source-notes/design-context behavior for design-producing agents.

### Research and Competitive Context

- `.planning/research/COMPETITIVE-GAP-REVIEW.md` — Phase 09 reinforcement: real context ingestion, notes, snapshots, data bindings, and asset provenance.
- `.planning/research/PITFALLS.md` — asset hallucination/licensing risk and boring asset pipeline.
- `.planning/research/STACK.md` — agent handoff package includes source notes and assets.
- `.planning/research/ARCHITECTURE.md` — source-of-truth, sandbox, asset, and export architecture.
- `.planning/research/SUMMARY.md` — durable architecture and risk summary.
- `.planning/research/FEATURES.md` — feature comparison and Phase 09 gap statement.

### Prior Phase Context

- `.planning/phases/03-prompt-creation-modes-assets-and-korean-presets/03-CONTEXT.md` — current context attachment placeholder behavior.
- `.planning/phases/05-design-systems-sharing-and-agent-agnostic-handoff/05-CONTEXT.md` — portable handoff contract.
- `.planning/phases/06-canvas-and-component-model/06-CONTEXT.md` — canvas graph, typed operations, no-live-DOM source-of-truth decisions.
- `.planning/phases/07-design-system-tokens-and-code-connect/07-CONTEXT.md` — governed tokens and code references.
- `.planning/phases/08-prototyping-slides-and-ai-variations/08-CONTEXT.md` — selected-region context package and agent-output validation decisions.

### Current Official Benchmark Checks

- Claude Design help: `https://support.claude.com/en/articles/14604416-get-started-with-claude-design` — project context, screenshots/assets/codebases/design files, inline comments, export/share.
- Claude Design system help: `https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design` — codebases, slide decks, documents, brand assets, extraction, publish.
- Paper roadmap: `https://paper.design/roadmap` — Paper Snapshot, live data, asset hosting, MCP-connected source of truth.
- Paper homepage: `https://paper.design/` — connected canvas for teams, agents, code, and data.
- Figma Make: `https://www.figma.com/make/` — design/library context, selected-region prompting, direct editing, real data via Supabase, Figma Sites integration.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `packages/editor-core/src/schemas.ts` already has `ContextAttachment`, `AssetRef`, `ProjectBundle.source.contextAttachments`, `assets`, agent context packages, and agent outputs.
- `packages/editor-core/src/generation.ts` has `createMockContextAttachment` and `contextAttachmentsToAssets`, which are Phase 03 placeholder paths that Phase 09 should replace or migrate.
- `packages/editor-core/src/normalize.ts` already captures image assets from normalized HTML and assigns stable node asset ids.
- `packages/editor-core/src/integrity.ts` is the right precedent for persisted reference validation and should be extended for context/assets/bindings/sync.
- `apps/web/components/editor-shell.tsx` already shows context attachment buttons, context chips, and a basic `Context & Assets` card in the right rail.
- Phase 08's `AgentContextPackage` path is useful precedent for small, selected, portable context payloads.

### Established Patterns

- Stored state is authoritative; the iframe remains a sandboxed projection.
- Direct changes must become typed operations, typed patches, or validated stored records.
- External/unknown inputs must be represented with status and diagnostics instead of being silently trusted.
- Browser-facing workflows need E2E coverage and responsive overflow checks.
- Product claims must be honest: a local adapter can prove server-portable semantics, but not full hosted production readiness.

### Integration Points

- Core schema: add versioned context/source/data/asset/sync records to `ProjectBundle` or a referenced subrecord.
- Core helpers: ingestion record creation, note generation, web snapshot materialization, data source parsing, binding validation, asset replacement/relink, sync envelope validation.
- Web UI: context queue, notes viewers, snapshot import action, binding panel, asset inspector, diagnostics.
- Persistence: `parseProjectBundleJson` and `assertProjectBundleIntegrity` must validate all new references on load.
- Export/handoff: include generated notes, context/source records, and stable asset references.

</code_context>

<specifics>

## Specific Ideas

- The product target remains Claude Design / Paper / Figma-level parity, not a context-chip demo.
- Claude Design benchmark: project context from screenshots/images/assets/documents/slide decks/codebases/design files and inline targeted iteration.
- Paper benchmark: editable live-site snapshots, live data via agents/APIs/Sheets, asset hosting, and source-of-truth continuity across code/data/agents.
- Figma benchmark: design/library/frame context, selected-region prompting, direct editing of generated output, and real-data app prototyping.
- The user's design-producing prompt requires `source-notes.md` before work and `design-context.md` before brand/design work.
- Phase 09 should make those files concrete generated artifacts, not only documentation.

</specifics>

<assumptions>

## Assumptions

- No production hosted account, auth, billing, or object storage is available by default.
- No browser extension is required in Phase 09; web snapshot can be implemented as an app-level import/capture surface with deterministic fixtures first.
- Public URLs and user-provided files are acceptable inputs; private or credentialed scraping is not.
- Existing Phase 03 placeholder attachments must continue to load and can migrate to richer context records.
- Existing v1 export/handoff paths should continue to work after adding context/source records.
- The first data binding slice can focus on repeatable content in existing canvas/component objects rather than arbitrary app logic.

</assumptions>

<deferred>

## Deferred Ideas

- Phase 10: Dev Mode inspect, real export files, publish previews, code-agent roundtrip, and deeper PPTX/export materialization.
- Phase 11: team permissions, activity/audit logs, collaboration, search, governance, and real conflict handling.
- Later: authenticated SaaS connectors, private-site scraping with user consent, browser extension capture, production object storage/CDN, full Figma API roundtrip, live API secrets, and marketplace asset distribution.

</deferred>

---

*Phase: 09-context-ingestion-live-data-and-assets*
*Context gathered: 2026-04-28*
