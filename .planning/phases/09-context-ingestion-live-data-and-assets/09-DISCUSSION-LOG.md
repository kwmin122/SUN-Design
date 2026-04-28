# Phase 09: Context Ingestion, Live Data, and Assets - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 09-context-ingestion-live-data-and-assets
**Areas discussed:** Source ingestion contract, provenance and notes, web snapshot capture, data binding, asset lifecycle, local-first sync, product verification
**Mode:** automated recommended-default discussion

---

## Source Ingestion Contract

| Option | Description | Selected |
|---|---|---|
| Keep existing context chips | Continue using Phase 03 `ContextAttachment` metadata as the main context model. | |
| First-class structured context model | Add source records, ingestion jobs, parsed artifacts, generated notes, and asset links. | yes |
| Full native importer for every file type | Attempt deep DOCX/PPTX/Figma/codebase reconstruction in one phase. | |

**Selected choice:** First-class structured context model.
**Notes:** Existing `ContextAttachment` records are placeholders. Phase 09 needs a durable model but should not attempt full native file reconstruction or Figma roundtrip in one phase.

---

## Provenance and Notes

| Option | Description | Selected |
|---|---|---|
| Human-readable notes only | Generate markdown notes without enforcing schema references. | |
| Schema-backed notes and design context | Generate `source-notes.md` and `design-context.md` from stored source records, asset records, uncertainty, and rights metadata. | yes |
| Delay notes until export | Keep source records internal and only write notes during final export. | |

**Selected choice:** Schema-backed notes and design context.
**Notes:** The design-producing prompt explicitly requires `source-notes.md` and `design-context.md`; Phase 09 must make them real project artifacts.

---

## Web Snapshot Capture

| Option | Description | Selected |
|---|---|---|
| Screenshot-only web references | Store web pages only as screenshots for visual context. | |
| Sanitized editable snapshot where safe | Capture screenshot plus sanitized HTML/text/style/assets and mark snapshot as editable, reference-only, or blocked. | yes |
| Live remote DOM editing | Treat the fetched remote page as the editable source. | |

**Selected choice:** Sanitized editable snapshot where safe.
**Notes:** This follows Paper Snapshot's product direction without violating the existing sandbox/no-live-DOM source-of-truth contract.

---

## Data Binding

| Option | Description | Selected |
|---|---|---|
| Static mock rows only | Keep repeated content as hardcoded fixture text. | |
| Local-first data source and binding records | Add CSV/XLSX/static JSON/API fixture sources, field mappings, row limits, and preview states. | yes |
| Full authenticated API connectors | Add secrets, OAuth, live jobs, and hosted refresh logic now. | |

**Selected choice:** Local-first data source and binding records.
**Notes:** Real data-backed design work is required, but live authenticated connectors are too broad for Phase 09.

---

## Asset Lifecycle

| Option | Description | Selected |
|---|---|---|
| Keep simple `AssetRef` status only | Continue with verified/cached/placeholder/blocked/unknown and no lifecycle history. | |
| Audited asset lifecycle with stable project URLs | Add provenance, hash, source note links, replacement history, relink/replace, and stable `kdesign://asset/...` references. | yes |
| Hosted CDN first | Build production object storage/CDN as the first implementation. | |

**Selected choice:** Audited asset lifecycle with stable project URLs.
**Notes:** Phase 09 needs server-portable URL semantics, not production CDN hardening.

---

## Local-First Sync

| Option | Description | Selected |
|---|---|---|
| Defer DATA-01 completely | Do not address local-to-hosted portability in Phase 09. | |
| Account-shaped sync envelope with local/mock adapter | Add remote ids, revision cursors, sync diagnostics, and deterministic validation without production auth/storage. | yes |
| Production hosted account sync | Implement real hosted accounts, auth, permissions, billing, object storage, and conflict merge. | |

**Selected choice:** Account-shaped sync envelope with local/mock adapter.
**Notes:** This satisfies only the Phase 09 foundation for DATA-01. DATA-01 should not be marked fully complete until hosted-account sync semantics are implemented and verified.

---

## Product Verification

| Option | Description | Selected |
|---|---|---|
| Schema-only implementation | Implement only core records and unit tests. | |
| Visible workflow plus adversarial tests | Build context queue, notes viewer, snapshot tool, data-binding panel, asset inspector, and negative tests. | yes |
| Full professional product parity in one phase | Attempt all future hosted/collaboration/export/dev-mode behavior now. | |

**Selected choice:** Visible workflow plus adversarial tests.
**Notes:** The user target is Claude Design/Paper/Figma-level product quality, but Phase 09 must stay scoped and production-shaped.

---

## Claude's Discretion

- Exact TypeScript names and parser libraries are left to planning and implementation.
- UI labels can be adjusted for Korean-first clarity.
- The first sync adapter can be local/mock if it proves the server-portable invariant.

## Deferred Ideas

- Authenticated SaaS connectors and private-site scraping.
- Browser extension capture.
- Production object storage/CDN.
- Full native Figma API roundtrip.
- Live API secrets and background refresh jobs.
- Full conflict merge and collaboration governance.
