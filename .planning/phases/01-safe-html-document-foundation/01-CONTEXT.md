# Phase 01: Safe HTML Document Foundation - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning
**Mode:** Auto-selected recommended defaults because Codex Default mode has no structured question UI.

<domain>

## Phase Boundary

Phase 01 delivers the safe foundation for one HTML design artifact. It must prove that an imported or fixture HTML document can be sanitized, normalized into a stable editable artifact model, rendered inside a sandboxed iframe, persisted, reloaded, and monitored through a validated bridge.

This phase does **not** implement real AI prompt generation, semantic direct visual editing, full Tweaks semantics, responsive preview modes, or export jobs. It creates the contract those later phases depend on while showing the production-shaped product shell those features will inhabit.

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

### Production Readiness Boundary

- **D-10:** Phase 01 should be built as a production-shaped foundation, not a throwaway prototype, while still avoiding full SaaS infrastructure in this phase.
- **Reason:** The product goal is an eventual deployed app. The first foundation must not encode shortcuts that block auth, server persistence, asset storage, export workers, observability, or stricter isolation later.
- **Impact:** Planner should require real schemas, deterministic fixtures, sanitizer/bridge negative tests, reloadable state, and clear module boundaries. Full account/project permissions, hosted storage, queues, billing, quota, and production observability remain outside Phase 01 unless needed as interfaces or seams.

### Product Shell Boundary

- **D-11:** Phase 01 must already look like the product direction: left Chat/Comments, central canvas, top file/tool/share/export controls, right Tweaks/diagnostics, creation modes, recent work, examples, design systems, and search.
- **Reason:** The product target is Claude Design-level completeness with agent-agnostic portability. A plain preview demo would hide layout, state, and diagnostics decisions that later phases depend on.
- **Impact:** Phase 01 may include non-AI, fixture-only controls that rebuild the stored `ProjectBundle` through the safe source-of-truth path. This is not the full Phase 02 Tweaks/direct-editing system and must not persist live iframe DOM mutations.

### Agent's Discretion

The planning or implementation agent may choose the exact local persistence mechanism and sanitizer library during planning, as long as the stored-state contract, static-first policy, bridge validation requirements, product shell boundary, and agent-agnostic portability requirements above are preserved.

</decisions>

<constraints>

## Constraints

- Do not implement real AI prompt generation, semantic direct editing, full Tweaks semantics, responsive preview, or export jobs in Phase 01.
- Do not treat fixture-only shell controls as proof that the later direct-editing, Tweaks, export, sharing, or generation requirements are complete.
- Do not persist or export the live iframe DOM as the source of truth.
- Do not render untrusted generated/imported HTML directly into the app DOM.
- Do not use same-origin iframe access as the core editor architecture.
- Do not make Phase 01 in-memory only; close/reopen must prove serializable stored state.
- Do not choose a local persistence shape that would be hard to port to server-backed projects, object storage, or export workers later.

</constraints>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Direction

- `CLAUDE.md` — Project guide, stack direction, security rules, SUNCO workflow, current phase.
- `.planning/PROJECT.md` — Product vision, core value, out-of-scope boundaries, and key decisions.
- `.planning/PRODUCT-NORTH-STAR.md` — Canonical product intent: Claude Design-level quality benchmark, agent-agnostic runtime, durable source-of-truth, and Phase 01 boundary.
- `.planning/REQUIREMENTS.md` — Phase 01 requirement IDs: CORE-02, CORE-03, CORE-04, CORE-05, PREV-01, PREV-03, SEC-01, SEC-02, SEC-03.
- `.planning/ROADMAP.md` — Phase boundary, success criteria, UI hint, and phase sequencing.
- `docs/superpowers/specs/2026-04-27-k-design-studio-design.md` — Product-level design spec and scope rationale.
- `docs/guides/coding-principles.md` — Mandatory coding agent rules: think first, keep it simple, change surgically, and verify concrete success criteria.

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

- Phase 01 Wave 1 now provides `packages/editor-core` with schemas, sanitizer/normalizer, stable `data-cdx-id`, fixture HTML, and local persistence helpers.
- Phase 01 Wave 2 builds on those contracts with `packages/preview-runtime` and `apps/web`.
- Existing reusable assets are planning artifacts, the core package, preview runtime, web shell, and `CLAUDE.md`.

### Established Patterns

- SUNCO parser compatibility requires zero-padded phase labels such as `Phase 01`.
- The repo is initialized on `main` and connected to `https://github.com/kwmin122/SUN-Design`.
- Planning docs are committed and tracked; future work should preserve `.planning/` as versioned project memory.

### Integration Points

- Phase 01 implementation structure lives under `packages/editor-core`, `packages/preview-runtime`, and `apps/web` as described in `CLAUDE.md`.
- No codebase map exists yet; the implementation surface is still intentionally small.

</code_context>

<specifics>

## Specific Ideas

- The product should feel like a real app, not a skill-only generator.
- The user wants the project to reach real deployment quality, so Phase 01 must avoid demo-only shortcuts even though the first slice remains narrow.
- The preview/editing mental model is "PPT/Figma-like direct manipulation," but Phase 01 only lays the safe document/runtime foundation.
- The product must go beyond Claude Design by turning generated output into a constrained PPT/Figma/Paper-style editable canvas. Phase 01 only lays the safe identity, persistence, bridge, and shell foundation for that later manipulation.
- The app should avoid copying leaked Claude Design prompts or restricted Huashu Design templates.
- Claude Design is the UX/quality benchmark, not the runtime dependency. The same project package must remain usable from Codex, Claude Code, Cursor, local agents, and web agents.
- Coding agents must keep Phase 01 changes simple and surgical: no speculative features, no unrelated refactors, and no completion claim without tests or browser verification.
- The product wedge remains Korean-first design behavior, but Korean presets and typography QA start in Phase 03/04, not Phase 01.

</specifics>

<assumptions>

## Assumptions

- Phase 01 fixtures can stand in for future AI-generated HTML as long as they enter the same sanitize, normalize, persist, preview, and diagnostics pipeline.
- Local-first persistence is acceptable for Phase 01 only if the serialized model is portable to later hosted storage.
- Production hardening for accounts, permissions, quotas, worker queues, deployment environments, and observability should be planned after the core Phase 01-05 product loop is proven.

</assumptions>

<deferred>

## Deferred Ideas

- Real prompt-to-HTML generation — Phase 03.
- Semantic direct text/style/layout editing, constrained PPT/Figma/Paper-style canvas manipulation, and full Tweaks panel behavior — Phase 02.
- Responsive preview modes and export — Phase 04.
- Interactive generated JavaScript preview mode — future phase after static sandbox is reliable.
- Production hardening for auth, project permissions, hosted storage, export worker queues, quota/rate limits, deployment isolation, and observability — after the core Phase 01-05 loop is proven.
- Full Figma parity, realtime multiplayer, template marketplace, native app packaging, full native PowerPoint authoring, and semantic editable Figma/PPTX round-trip — out of v1. Raster PPTX export/handoff and portable agent handoff remain v1 requirements.

</deferred>

---

*Phase: 01-safe-html-document-foundation*
*Context gathered: 2026-04-27*
