# Phase 09 Research — Context Ingestion, Live Data, and Assets

## Recommended Approach

Implement Phase 09 as a local-first, schema-backed context/data/assets foundation in `packages/editor-core`, then expose a visible product workflow in `apps/web`. The existing code already has placeholder `ContextAttachment` records, simple `AssetRef` records, local persistence, export/handoff paths, and strong integrity validation patterns. The best approach is to extend those records into first-class source, ingestion, note, snapshot, data binding, asset lifecycle, and sync-envelope models while keeping `ProjectBundle` as the durable source of truth.

Use deterministic fixtures and local/mock adapters first. This keeps the phase aligned with the no-hosted-hardening boundary and avoids turning DATA-01 into an overclaim: Phase 09 proves server-portable sync metadata and validation, not a real hosted account. For DOCX/PPTX/XLSX/Figma/codebase inputs, implement structured source records plus parsed-context summaries from supplied document text, slide titles/notes, spreadsheet rows, Figma frame metadata, and codebase folder manifests. A plan that only stores file-kind metadata is not enough for CTX-01. Deeper native reconstruction, hosted connectors, and full Figma roundtrip stay deferred.

The implementation should split into two executable waves:

1. Core model and integrity foundation in `packages/editor-core`.
2. Web workflow surface and browser coverage in `apps/web`.

## Alternative(s) Considered

### Keep Phase 03 ContextAttachment as the Main Model

This is too shallow. Phase 03 attachments are prompt-composer metadata and cannot express source hashes, usage rights, generated notes, data bindings, snapshot states, asset replacement history, or sync diagnostics.

### Add Production Hosted Storage First

This would overbuild Phase 09 and blur DATA-01. The requirement mentions hosted account sync, but the accepted Phase 09 boundary is a server-portable foundation with local/mock adapter. Real auth, permissions, billing, object storage, live jobs, and merge logic belong later.

### Use Live Remote DOM as Web Snapshot Source

Rejected. It violates the Phase 01/06 source-of-truth decisions. Web snapshot capture must sanitize and normalize stored fetched/rendered source and mark unsafe captures as reference-only or blocked.

### Add Many Parser Dependencies Immediately

Rejected for the first pass. The repo currently depends on `parse5`, `postcss`, and `zod` in editor-core. Phase 09 can prove deterministic ingestion and provenance with lightweight fixture helpers and browser/file metadata. If execution discovers a parser is unavoidable, it should justify the dependency in the plan execution summary before adding it.

## Implementation Map

### Core Files

- `packages/editor-core/src/schemas.ts` — add source, ingestion, notes, snapshot, data source, data binding, asset event, project asset URL, and sync envelope schemas to `ProjectBundle`.
- `packages/editor-core/src/context-ingestion.ts` — create source records, ingestion jobs, parsed context artifacts, generated `source-notes.md` and `design-context.md`, web snapshot records, deterministic DOCX/PPTX/XLSX/Figma/codebase/URL summaries, unsafe URL guards, unsupported-source diagnostics, and migration helpers for existing `ContextAttachment[]`.
- `packages/editor-core/src/data-bindings.ts` — create data sources, validate field mappings, materialize preview rows, and return empty/loading/error states.
- `packages/editor-core/src/asset-lifecycle.ts` — resolve stable `kdesign://asset/{projectId}/{assetId}` URLs, create asset replacement/relink audit records, and validate asset status transitions.
- `packages/editor-core/src/sync.ts` — create local/mock sync envelope with account-shaped metadata, revision cursor, remote document id, and conflict diagnostics.
- `packages/editor-core/src/integrity.ts` — validate source/asset/data/sync references on persisted load.
- `packages/editor-core/src/persistence.ts` — ensure serialization/parsing validates the new records and migrates legacy context attachments.
- `packages/editor-core/src/export.ts` — include generated notes and stable asset URLs in standalone/handoff-friendly materialization where applicable.
- `packages/editor-core/src/handoff.ts` — include source records, generated notes, data sources, asset provenance, and sync foundation metadata.
- `packages/editor-core/src/index.ts` — export new helpers.
- `packages/editor-core/src/__tests__/context-ingestion.test.ts` — source records, parsed document/slide/spreadsheet/Figma/codebase/URL summaries, notes, snapshot, migration, unsafe URL, unsupported source, rights-unclear, parse failure, and other negative cases.
- `packages/editor-core/src/__tests__/data-bindings.test.ts` — CSV/JSON/API fixture preview and invalid mapping cases.
- `packages/editor-core/src/__tests__/asset-lifecycle.test.ts` — stable URL, relink, replace, and invalid transition cases.
- `packages/editor-core/src/__tests__/sync.test.ts` — local/mock sync envelope, stale revision, corrupt remote payload rejection.
- `packages/editor-core/src/__tests__/persistence.test.ts` — persisted invalid source/data/asset/sync references rejected.

### Web Files

- `apps/web/components/editor-shell.tsx` — wire context ingestion queue, note viewers, web snapshot action, data binding panel, asset provenance inspector, and local/mock sync status.
- `apps/web/app/globals.css` — style the Phase 09 panels without reintroducing responsive overflow.
- `apps/web/tests/phase-09-context-assets.spec.ts` — create source records, generate notes, web snapshot, asset replace/relink, reload persistence, desktop/tablet/mobile no-overflow checks.
- `apps/web/tests/phase-09-data-sync.spec.ts` — import fixture data, bind component fields, show realistic repeated preview, reject stale sync/corrupt payload states.

## Dependencies

No new dependency is required in the plan. Use existing dependencies:

- `zod` for schemas and persisted validation.
- `parse5` for sanitized HTML fragment/snapshot materialization.
- `postcss` only if style summary parsing needs existing CSS helper behavior.
- Browser-native `File`, `Blob`, `TextDecoder`, `URL`, and localStorage APIs in the web app.

If execution later requires real OOXML parsing, it must be introduced as a scoped dependency with tests and a short justification. Do not add a parser package preemptively during planning.

## Risk Register

| Risk | Mitigation |
|---|---|
| DATA-01 overclaim | Treat Phase 09 sync as foundation-only. Do not mark DATA-01 complete until hosted-account sync semantics are implemented and verified. |
| Context records become detached from assets | Add persisted integrity checks for source ids, asset ids, data source ids, binding targets, note ids, and sync envelope references. |
| Unsafe web snapshots | Sanitize/normalize captured HTML, strip scripts/events/forms, store snapshot status as `editable`, `referenceOnly`, or `blocked`. |
| CTX-01 degrades into metadata-only records | Require parsed context artifacts for DOCX/PPTX/XLSX/Figma/codebase/URL fixture inputs and tests that assert extracted summaries contain real content fields. |
| Web snapshot plan only tests a happy path | Require public URL validation, unsafe URL blocking, reference-only fallback when no safe HTML is available, and E2E assertions that blocked captures never become editable snapshots. |
| Parser scope explodes | First implement deterministic summaries and fixtures; defer pixel-perfect document/Figma reconstruction. |
| Asset replacement breaks patch/export references | Use stable `kdesign://asset/...` URLs and typed replacement/relink audit records. |
| UI becomes schema dump | Web plan must expose queue/status/viewer/panel workflows with Korean-first labels and browser tests. |
| Regressions in previous phases | Run full lint/typecheck/test/e2e gates and persisted corruption probes. |

## RESEARCH COMPLETE
