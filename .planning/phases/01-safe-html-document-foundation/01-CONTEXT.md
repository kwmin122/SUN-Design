# Phase 01: Safe HTML Document Foundation - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning
**Mode:** Auto-selected recommended defaults because Codex Default mode has no structured question UI.

<domain>

## Phase Boundary

Phase 01 delivers the safe foundation for one HTML design artifact. It must prove that an imported or fixture HTML document can be sanitized, normalized into a stable editable artifact model, rendered inside a sandboxed iframe, persisted, reloaded, and monitored through a validated bridge.

This phase does **not** implement AI prompt generation, direct visual editing, Tweaks controls, responsive preview modes, or export. It creates the contract those later phases depend on.

</domain>

<decisions>

## Implementation Decisions

### Artifact Input Scope

- **D-01:** Phase 01 starts with fixture/imported HTML only. No real model generation in this phase.
- **Reason:** The hard dependency is safe artifact handling. Prompt generation belongs to Phase 03 and would hide normalization/security failures behind model variability.
- **Impact:** Planner should build a deterministic fixture set and an import path before any provider adapter.

### Source of Truth

- **D-02:** The durable source of truth is `ProjectBundle + EditGraph + patch log + assets`, not the live iframe DOM.
- **Reason:** Stored-state export, later direct editing, undo/redo, and regeneration require deterministic replayable state.
- **Impact:** The iframe is a projection/runtime boundary. It can report geometry and errors but cannot be persisted as the canonical document.

### Minimum Phase 01 Data Contract

- **D-03:** Define the minimal model in Phase 01: `ProjectBundle`, `EditGraph`, `EditNode`, `AssetRef`, `PreviewMessage`, and `PreviewError`.
- **Reason:** Later phases need typed contracts for selection, patches, tweaks, and export. Defining the minimum now prevents ad-hoc string mutation.
- **Impact:** Implementation should prioritize schema/types and fixtures over UI polish.

### HTML Normalization Contract

- **D-04:** Normalize imported HTML into an editor-safe subset and inject stable `data-cdx-id` identifiers for editable candidates.
- **Reason:** Generated or imported HTML is not naturally editable. Stable IDs are the anchor for Phase 02 selection/edit patches.
- **Impact:** Phase 01 only needs classification for basic candidates: frame/block, text, image, button/link, form-like control, and unknown/decorative.

### Sanitization Policy

- **D-05:** Default sanitizer policy is static-first: strip generated scripts, inline event handlers, forms, popups/top navigation, unknown embeds, and dangerous URLs.
- **Reason:** Phase 01 should establish trust boundaries before allowing interactive generated content.
- **Impact:** Interactive preview is explicitly deferred. The only script permitted in preview is the app-owned bridge/runtime code.

### Sandbox and Bridge Policy

- **D-06:** Preview uses a sandboxed iframe with an app-owned bridge and validated `postMessage` protocol. Every message must pass source, nonce, type, and schema validation.
- **Reason:** `srcdoc`/iframe content may be opaque-origin or untrusted. Origin alone is insufficient in local/sandbox modes.
- **Impact:** Planner must include bridge protocol tests for missing nonce, wrong source, unknown type, and malformed payload.

### Persistence Scope

- **D-07:** Phase 01 persistence can be local-first, but it must use the same stored-state shape planned for server persistence.
- **Reason:** The phase needs close/reopen behavior without forcing auth/backend scope too early.
- **Impact:** Acceptable implementations include local file/project JSON or IndexedDB. The model must be serializable and later portable to Postgres/object storage.

### Preview Diagnostics

- **D-08:** Phase 01 must surface preview readiness, sanitizer changes, bridge validation failures, runtime errors, and console errors in a compact diagnostics surface.
- **Reason:** This phase is infrastructure-heavy; without diagnostics, later editing bugs will be impossible to distinguish from render/security failures.
- **Impact:** Diagnostics do not need a full developer console, but they must be visible and testable.

### Tool Compatibility

- **D-09:** Phase headings and traceability use zero-padded `Phase 01` formatting for SUNCO parser compatibility.
- **Reason:** The local SUNCO `phase-op` parser only recognized `Phase 01` style headings, not `Phase 1:` headings.
- **Impact:** Downstream planning should preserve zero-padded phase labels.

### Claude's Discretion

Claude/planner may choose the exact local persistence mechanism and sanitizer library during planning, as long as the stored-state contract, static-first policy, and bridge validation requirements above are preserved.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Direction

- `CLAUDE.md` — Project guide, stack direction, security rules, SUNCO workflow, current phase.
- `.planning/PROJECT.md` — Product vision, core value, out-of-scope boundaries, and key decisions.
- `.planning/REQUIREMENTS.md` — Phase 01 requirement IDs: CORE-02, CORE-03, CORE-04, PREV-01, PREV-03, SEC-01, SEC-02, SEC-03.
- `.planning/ROADMAP.md` — Phase boundary, success criteria, UI hint, and phase sequencing.
- `docs/superpowers/specs/2026-04-27-k-design-studio-design.md` — Product-level design spec and scope rationale.

### Research Inputs

- `.planning/research/SUMMARY.md` — Recommended stack, table stakes, dominant architecture, and top risks.
- `.planning/research/ARCHITECTURE.md` — HTML base + EditGraph + patch log + sandbox bridge pattern.
- `.planning/research/PITFALLS.md` — First-month risk ranking and mitigations for sandboxing, mutability, export, and legal contamination.
- `.planning/research/STACK.md` — Recommended monorepo, preview runtime, HTML parser, state, and export stack.
- `.planning/research/FEATURES.md` — Feature scoping and anti-feature boundaries.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- No implementation code exists yet. This is a greenfield planning repository.
- Existing reusable assets are planning artifacts only: project spec, requirements, roadmap, research files, and `CLAUDE.md`.

### Established Patterns

- SUNCO parser compatibility requires zero-padded phase labels such as `Phase 01`.
- The repo is initialized on `main` and connected to `https://github.com/kwmin122/SUN-Design`.
- Planning docs are committed and tracked; future work should preserve `.planning/` as versioned project memory.

### Integration Points

- Phase 01 should create the first implementation structure later, likely under `packages/editor-core`, `packages/preview-runtime`, and `apps/web` as described in `CLAUDE.md`.
- No codebase map exists because there is no implementation code yet.

</code_context>

<specifics>

## Specific Ideas

- The product should feel like a real app, not a skill-only generator.
- The preview/editing mental model is "PPT/Figma-like direct manipulation," but Phase 01 only lays the safe document/runtime foundation.
- The app should avoid copying leaked Claude Design prompts or restricted Huashu Design templates.
- The product wedge remains Korean-first design behavior, but Korean presets and typography QA start in Phase 03/04, not Phase 01.

</specifics>

<deferred>

## Deferred Ideas

- Real prompt-to-HTML generation — Phase 03.
- Direct text/style editing and Tweaks panel — Phase 02.
- Responsive preview modes and export — Phase 04.
- Interactive generated JavaScript preview mode — future phase after static sandbox is reliable.
- Full Figma/PPT parity, collaboration, template marketplace, native app packaging, editable PPTX/Figma export — out of v1.

</deferred>

---

*Phase: 01-safe-html-document-foundation*
*Context gathered: 2026-04-27*

