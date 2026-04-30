# Phase 11 Research — Collaboration, Search, and Governance

**Date:** 2026-05-01
**Status:** Ready for planning
**Scope:** Project home, smart search, organization metadata, collaboration/review/audit primitives, quality gates, and regeneration replay conflict handling.

## Sources

- Phase context: `.planning/phases/11-collaboration-search-and-governance/11-CONTEXT.md`
- Product north star: `.planning/PRODUCT-NORTH-STAR.md`
- Competitive review: `.planning/research/COMPETITIVE-GAP-REVIEW.md`
- Requirements: `.planning/REQUIREMENTS.md`
- Official Claude Design guide: <https://support.claude.com/en/articles/14604416-get-started-with-claude-design>
- Official Paper roadmap: <https://paper.design/roadmap>
- Official Figma sharing guide: <https://help.figma.com/hc/en-us/articles/360040531773-Share-files-and-prototypes>

## Product Reading

Phase 11 should not become a hosted SaaS rewrite. The phase must make the existing local-first artifact model navigable and team-ready: a user can find work, understand ownership/status, leave comments and implementation notes, run quality checks, and safely replay edits after regenerated bases.

The competitive bar is Claude Design / Paper / Figma-level product direction, but the phase claim must remain honest: this is the verified collaboration/search/governance foundation, not full realtime multiplayer, enterprise policy, or public template marketplace.

## Recommended Approach

Use the existing `ProjectBundle` as the durable source of truth and add small, typed governance records that are portable across local storage and future hosted storage:

- Project home metadata: folder path, tags, owner, lifecycle status, pinned/recent/template/example/design-system-library categories.
- Search index helpers: deterministic records derived from bundle title, tags, source records, assets, design system names/tokens, artifact types, comments, notes, and parsed context summaries.
- Collaboration records: collaborators, roles, share entries, presence snapshots, follow/spotlight state, comment/annotation threads, review/approval records, activity/audit events.
- Quality gate reports: deterministic checks over stored state and rendered snapshot inputs. Reports must include pass/warn/fail status, issue codes, target references, and provenance diagnostics.
- Regeneration replay: reapply stored patches and canvas operations onto a regenerated base revision only when target ids/kinds/revisions are compatible. Missing or changed targets become explicit conflicts.

Keep all helpers pure and testable in `packages/editor-core`; the web app should only call these helpers and display records.

## Alternatives Rejected

- Full CRDT multiplayer first: too broad and not necessary before typed collaboration records and conflict policy exist.
- External search service: would make the first implementation non-local and create a hosted dependency before indexing semantics are stable.
- Hosted auth/permissions first: conflicts with the local-first milestone; Phase 11 should model roles and audits now, then allow hosted account semantics later.
- Live iframe DOM quality checks as source of truth: violates the stored-state architecture and repeats earlier security risks.

## Plan Shape

### Wave 1: Project home/search/organization

Create the workspace library and search model. This can execute independently from collaboration because it only owns project metadata, folders/tags, and deterministic search helpers/UI.

### Wave 2: Collaboration/review/audit primitives

Create local-first collaboration and governance records after the workspace/search contract lands. This keeps shared `schemas.ts`, `integrity.ts`, `handoff.ts`, and `index.ts` edits serial instead of allowing concurrent overwrite risk.

### Wave 3: Quality gates and regeneration replay

Depends on Wave 1 and Wave 2. Quality gate output should feed project activity/audit records, and regeneration conflicts should be visible in governance/review surfaces.

## Risk Register

- Shared schema conflicts: all Phase 11 plans touch shared schema/integrity contracts, so execution is intentionally serial: 11-01, then 11-02, then 11-03. Do not parallelize these plans.
- Overclaiming realtime collaboration: presence and follow/spotlight in this phase are local persisted records and UI affordances, not live sockets or CRDT.
- Search becoming demo-only: search must derive from multiple fields and source/context artifacts, not just project title.
- Quality gate false confidence: gate reports must state deterministic limitations and include negative tests for missing provenance, generic AI visuals, low contrast, overflow risk, and stale rendered snapshots.
- Replay data loss: regeneration replay must default to conflict instead of silently dropping or force-applying edits.

## Verification Expectations

- Unit tests for schema/integrity/search/collaboration/review/quality/replay helpers, including corrupt persisted references.
- Browser tests for project home browsing/search, comments/review/audit, quality gate dashboard, and replay conflict UI.
- Reload proof for every new persisted record.
- Negative tests for missing folders, duplicate ids, bad role transitions, stale review revisions, missing annotation targets, unsafe replay targets, and quality gate issue references.
- Standard gates: `pnpm lint`, `pnpm typecheck`, `npx tsc --noEmit`, `pnpm test`, `pnpm e2e`.
