# K-Design Studio Project Guide

## Project Overview

K-Design Studio is a Korean-first AI design workspace. Users enter a prompt, generate or import an HTML design artifact, preview it in a sandboxed iframe, edit visible elements through a PPT/Figma-like overlay, adjust a right-side Tweaks panel, and export the result.

Core value: turn generated HTML designs into something a user can inspect, tweak, edit, and export without dropping into source code.

Current phase: Phase 01 — Safe HTML Document Foundation  
Phase status: context_ready  
Next SUNCO action: `/sunco:plan 1`

## Planned Stack

- Web app: Next.js App Router, React, TypeScript
- Styling/UI: Tailwind CSS, shadcn/Radix primitives, lucide icons
- Editor model: `ProjectBundle`, `EditGraph`, `EditPatch[]`
- Editor state: Zustand for local editor state, TanStack Query for async server/export jobs
- HTML normalization: parse5 plus PostCSS or css-tree
- Preview runtime: sandboxed iframe plus validated postMessage bridge
- Visual editing: parent-owned overlay; `react-moveable` later for drag/resize
- Persistence: Postgres/Drizzle plus object storage for assets and export artifacts
- Export: Playwright worker for HTML/PNG/PDF first; PPTX/MP4 later

## Key Architecture Decisions

| Decision | Reason |
|---|---|
| HTML base + EditGraph + patch log | Keeps generated HTML flexible while giving edits stable semantics. |
| Sandboxed iframe as projection | Generated HTML is untrusted and must not access app privileges. |
| Parent-owned overlay | Selection, inspector state, undo/redo, and persistence stay outside the iframe. |
| Typed patch operations | Avoid brittle string mutation and make replay/export testable. |
| Stored-state export | Export must materialize from base artifact, assets, tweak values, and patch log. |
| Korean-first defaults | Hangul typography and Korean design contexts are part of the product wedge. |

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
2. Continue Phase 01 through `/sunco:plan 1`.
3. Generate a plan before implementation.
4. Verify against `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md`.

Do not make broad implementation edits outside a SUNCO workflow unless explicitly bypassing it.

## Current Phase

Phase 01: Safe HTML Document Foundation

Goal: build the core document model and sandboxed preview path for one imported or mock-generated HTML artifact, including normalization, persistence, bridge validation, and error reporting.

Phase 01 must close only when a single artifact can be sanitized, normalized with stable IDs, rendered in a sandboxed iframe, persisted, reloaded, and monitored for preview errors.
