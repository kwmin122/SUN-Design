# K-Design Studio Project Guide

## Project Overview

K-Design Studio is a Korean-first AI design workspace. Users create prototypes, slide decks, template-based artifacts, and other design outputs from prompt plus context, preview the live HTML artifact in a sandboxed canvas, edit visible elements through a PPT/Figma/Paper-like overlay, use inline comments and right-side Tweaks, manage versions, share, and export or hand off the result to Codex, Claude Code, Cursor, local agents, or web agents.

Core value: turn generated HTML designs into directly editable working documents a user can inspect, tweak, move, resize, restyle, comment on, and export without dropping into source code.

Product quality bar: the final target is production-complete Claude Design / Paper / Figma-level quality, with stronger direct editability than Claude Design through a constrained PPT/Figma/Paper-style canvas. Scope can be staged by phase, but phase outputs must be production-shaped foundations rather than throwaway demos.

Core design implementation prompt: `docs/prompts/context-driven-design-agent-prompt.md`. This prompt is for the AI that produces or implements design artifacts with HTML/CSS/JS. Pass it to design-producing agents before they create screens, prototypes, slides, landing pages, animations, infographics, or design reviews.

Canonical product intent: `.planning/PRODUCT-NORTH-STAR.md`. Claude Design, Paper, and Figma-level parity is the final product target, not a runtime lock-in or a license to copy restricted internals. Prompts, project files, artifact packages, and handoff flows must stay portable across Codex, Claude Code, Cursor, and similar agents. If another frequently-read planning file disagrees with that north star, update the other file before continuing.

Mandatory coding principles: `docs/guides/coding-principles.md`. Every coding agent must think before coding, prefer simplicity, make surgical changes, and execute against verifiable success criteria.

Current phase: Phase 09 — Context Ingestion, Live Data, and Assets
Phase status: context ready; ready for planning
Next SUNCO action: `/sunco:plan 9`

Competitive parity plan: `.planning/research/COMPETITIVE-GAP-REVIEW.md`. Official Claude Design, Paper, and Figma checks showed the next bar is professional canvas/component modeling, governed tokens/code connection, prototype/slide interactions, real context ingestion/live data, Dev Mode/publish/export fidelity, and collaboration/search/governance across Phase 06-11. These phases are the path to full product parity, not optional polish.

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
| Claude Design / Paper / Figma-level product bar | The final product must compete at that quality level; every phase should avoid shortcuts that block that bar. |
| Beyond Claude Design editability | Generated output must become a constrained PPT/Figma/Paper-style editable canvas, not a static preview or one-shot HTML drop. |
| Context-driven design agent prompt | Design-producing AI must use `docs/prompts/context-driven-design-agent-prompt.md` before creating visual artifacts. |
| Claude Design capability parity | The product baseline includes Chat/Comments, canvas, top Share/Export/tool controls, right Tweaks, context attachments, inline comments, live knobs/sliders, versions, design systems, sharing permissions, Canva handoff, and agent handoff. |
| Agent-agnostic runtime | Prompts, project files, artifact packages, and handoff flows must work across Codex, Claude Code, Cursor, and similar agents instead of assuming Claude Code-only tooling. |
| Coding principles | All implementation must follow `docs/guides/coding-principles.md`: think first, keep it simple, change surgically, and verify against concrete success criteria. |
| Competitive parity reinforcement | Phase 06-11 close Paper/Claude Design/Figma gaps without replacing the HTML-first source-of-truth family. Calling a phase "foundation-only" only limits that phase's completion claim; it does not lower the final target. |

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

Phase 09: Context Ingestion, Live Data, and Assets

Goal: plan the real context foundation: source ingestion, provenance, generated `source-notes.md` and `design-context.md`, safe editable web snapshots, local-first data bindings, asset lifecycle, stable project URLs, and server-portable sync semantics.

Phase 09 should proceed through `/sunco:plan 9`. Planning must preserve the full Claude Design / Paper / Figma-level product target while keeping Phase 09 scoped to context/data/assets and avoiding production hosted storage, authenticated scraping, Dev Mode, publish/export fidelity, collaboration, and full Figma roundtrip.
