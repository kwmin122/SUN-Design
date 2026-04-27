# Phase 01: Safe HTML Document Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 01-safe-html-document-foundation
**Areas discussed:** artifact input scope, source of truth, normalization, sanitization, sandbox bridge, persistence, diagnostics, tool compatibility
**Mode:** auto/defaults

---

## Artifact Input Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Fixture/imported HTML only | Deterministic foundation first; no model variability in Phase 01. | yes |
| Mock prompt generation | Gives a demo feel but blurs Phase 01 and Phase 03. | |
| Real provider generation | Too early; hides core artifact/sandbox problems. | |

**User's choice:** Auto-selected fixture/imported HTML only.
**Notes:** The user wants prompt generation overall, but roadmap assigns that to Phase 03.

---

## Source of Truth

| Option | Description | Selected |
|--------|-------------|----------|
| `ProjectBundle + EditGraph + patch log` | Durable, replayable, exportable stored state. | yes |
| Live iframe DOM | Fast demo but brittle and unsafe as persistence source. | |
| Strict DSL only | Cleaner long term but too restrictive before proving HTML-native editing. | |

**User's choice:** Auto-selected stored-state source of truth.
**Notes:** Matches prior verification fix around export source-of-truth.

---

## Normalization Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Inject stable `data-cdx-id` and classify editable candidates | Minimum needed for later selection/edit patches. | yes |
| Keep arbitrary HTML untouched | Easier import, but Phase 02 would lack stable anchors. | |
| Convert all HTML into a strict component DSL | Too much upfront schema work for Phase 01. | |

**User's choice:** Auto-selected stable IDs plus basic classification.
**Notes:** Phase 01 classification is intentionally shallow: frame/block, text, image, button/link, form-like, unknown/decorative.

---

## Sanitization Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Static-first sanitizer, app-owned bridge only | Strongest safe baseline for untrusted HTML. | yes |
| Allow generated scripts by default | Better fidelity but unacceptable first boundary. | |
| Same-origin preview for convenience | Easier parent DOM access but violates the security model. | |

**User's choice:** Auto-selected static-first sanitizer.
**Notes:** Interactive generated scripts are deferred until the static sandbox is reliable.

---

## Sandbox Bridge

| Option | Description | Selected |
|--------|-------------|----------|
| Sandbox iframe + validated postMessage with nonce/source/type/schema | Robust across opaque-origin/local preview modes. | yes |
| Direct DOM access from parent | Simpler but unsafe and incompatible with strict sandboxing. | |
| Origin-only postMessage validation | Insufficient for sandboxed `srcdoc`/opaque origins. | |

**User's choice:** Auto-selected validated bridge protocol.
**Notes:** Planner must include negative tests for invalid bridge messages.

---

## Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Local-first serializable stored-state shape | Proves close/reopen without backend/auth scope. | yes |
| Full hosted DB in Phase 01 | More realistic production path but adds unrelated backend work. | |
| In-memory only | Fastest but fails CORE-04 persistence requirement. | |

**User's choice:** Auto-selected local-first serializable model.
**Notes:** Exact mechanism is planner discretion: local JSON or IndexedDB are acceptable if the state shape stays portable.

---

## Diagnostics

| Option | Description | Selected |
|--------|-------------|----------|
| Compact visible preview diagnostics | Makes sanitizer/bridge/render problems testable. | yes |
| Silent logging only | Faster UI but poor debugging. | |
| Full developer console | Useful later but overkill for Phase 01. | |

**User's choice:** Auto-selected compact diagnostics.
**Notes:** Diagnostics should include readiness, sanitizer changes, bridge validation failures, runtime errors, and console errors.

---

## Tool Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| Use zero-padded `Phase 01` labels | Required by local SUNCO phase parser. | yes |
| Keep human-style `Phase 1:` labels | Readable but parser could not find the phase. | |

**User's choice:** Auto-selected SUNCO-compatible labels.
**Notes:** Roadmap, requirements traceability, state, and CLAUDE.md were normalized.

---

## Claude's Discretion

- Exact local persistence mechanism, if it preserves the serializable stored-state contract.
- Exact sanitizer/HTML parsing library, if it enforces the static-first policy.
- Exact UI layout of the diagnostics surface, if it remains visible and testable.

## Deferred Ideas

- AI prompt generation, direct editing, Tweaks, responsive preview, and export remain in later phases per roadmap.

