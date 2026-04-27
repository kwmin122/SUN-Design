# K-Design Studio Project Guide

## Project Overview

K-Design Studio is a Korean-first AI design workspace. Users create prototypes, slide decks, template-based artifacts, and other design outputs from prompt plus context, preview the live HTML artifact in a sandboxed canvas, edit visible elements through a PPT/Figma-like overlay, use inline comments and right-side Tweaks, manage versions, share, and export or hand off the result to Codex, Claude Code, Cursor, local agents, or web agents.

Core value: turn generated HTML designs into something a user can inspect, tweak, edit, and export without dropping into source code.

Product quality bar: the target is production-complete, Claude Design-level quality. Scope can be staged by phase, but phase outputs must be production-shaped foundations rather than throwaway demos.

Core design implementation prompt: `docs/prompts/context-driven-design-agent-prompt.md`. This prompt is for the AI that produces or implements design artifacts with HTML/CSS/JS. Pass it to design-producing agents before they create screens, prototypes, slides, landing pages, animations, infographics, or design reviews.

Canonical product intent: `.planning/PRODUCT-NORTH-STAR.md`. Claude Design is the quality benchmark, not a runtime lock-in. Prompts, project files, artifact packages, and handoff flows must stay portable across Codex, Claude Code, Cursor, and similar agents. If another frequently-read planning file disagrees with that north star, update the other file before continuing.

Mandatory coding principles: `docs/guides/coding-principles.md`. Every coding agent must think before coding, prefer simplicity, make surgical changes, and execute against verifiable success criteria.

Current phase: Phase 01 — Safe HTML Document Foundation
Phase status: executed - awaiting verification
Next SUNCO action: `/sunco:verify 1`

## Planned Stack

- Web app: Next.js App Router, React, TypeScript
- Styling/UI: Tailwind CSS, shadcn/Radix primitives, lucide icons
- Editor model: `ProjectBundle`, `EditGraph`, `EditPatch[]`
- Editor state: Zustand for local editor state, TanStack Query for async server/export jobs
- HTML normalization: parse5 plus PostCSS or css-tree
- Preview runtime: sandboxed iframe plus validated postMessage bridge
- Visual editing: parent-owned overlay; `react-moveable` later for drag/resize
- Persistence: Postgres/Drizzle plus object storage for assets and export artifacts
- Export: Playwright worker for HTML/ZIP/PNG/PDF/PPTX first; Canva and agent handoff surfaces in v1; MP4 later

## Key Architecture Decisions

| Decision | Reason |
|---|---|
| HTML base + EditGraph + patch log | Keeps generated HTML flexible while giving edits stable semantics. |
| Sandboxed iframe as projection | Generated HTML is untrusted and must not access app privileges. |
| Parent-owned overlay | Selection, inspector state, undo/redo, and persistence stay outside the iframe. |
| Typed patch operations | Avoid brittle string mutation and make replay/export testable. |
| Stored-state export | Export must materialize from base artifact, assets, tweak values, and patch log. |
| Korean-first defaults | Hangul typography and Korean design contexts are part of the product wedge. |
| Claude Design-level product bar | The final product should compete at the same quality level; every phase should avoid shortcuts that block that bar. |
| Context-driven design agent prompt | Design-producing AI must use `docs/prompts/context-driven-design-agent-prompt.md` before creating visual artifacts. |
| Claude Design capability parity | The product baseline includes Chat/Comments, canvas, top Share/Export/tool controls, right Tweaks, context attachments, inline comments, live knobs/sliders, versions, design systems, sharing permissions, Canva handoff, and agent handoff. |
| Agent-agnostic runtime | Prompts, project files, artifact packages, and handoff flows must work across Codex, Claude Code, Cursor, and similar agents instead of assuming Claude Code-only tooling. |
| Coding principles | All implementation must follow `docs/guides/coding-principles.md`: think first, keep it simple, change surgically, and verify against concrete success criteria. |

## File Conventions

When implementation begins, prefer this structure:

```text
apps/web/
apps/export-worker/
packages/editor-core/
packages/preview-runtime/
packages/export/
packages/ui/
packages/shared/
```

Core model code belongs in `packages/editor-core`, not inside React components. The iframe bridge belongs in `packages/preview-runtime`. Export logic belongs in `packages/export` or `apps/export-worker`.

## Security Rules

- Treat all generated/imported HTML as untrusted.
- Do not render model HTML directly into app DOM.
- Do not use same-origin iframe access as the editor architecture.
- Validate iframe bridge messages by source, nonce, and schema.
- Strip or block scripts, inline event handlers, forms, popups, top navigation, and unknown embeds by default.
- Do not copy leaked Claude Design prompts or restricted Huashu Design files/templates.

## SUNCO Workflow

This project is managed with SUNCO. Before substantial work:

1. Check state with `/sunco:status`.
2. Continue the current phase from `.planning/STATE.md`.
3. Generate or update a plan before implementation unless the phase is already executing.
4. Verify against `.planning/PRODUCT-NORTH-STAR.md`, `.planning/REQUIREMENTS.md`, and `.planning/ROADMAP.md`.

Do not make broad implementation edits outside a SUNCO workflow unless explicitly bypassing it.

## Design Agent Prompt

When a task asks an AI to create a visual artifact, first provide it with `docs/prompts/context-driven-design-agent-prompt.md`.

This prompt is not a general engineering prompt. It is the production standard for design-producing agents: confirm facts, collect design context and source notes, use real assets where required, avoid generic AI design tropes, stage design work, and verify the artifact in a browser before claiming completion.

## Current Phase

Phase 01: Safe HTML Document Foundation

Goal: build the core document model and sandboxed preview path for one imported or mock-generated HTML artifact, including normalization, persistence, bridge validation, and error reporting.

Phase 01 must close only when a single artifact can be sanitized, normalized with stable IDs, rendered in a sandboxed iframe, persisted, reloaded, and monitored for preview errors.
