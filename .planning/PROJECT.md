# K-Design Studio

## What This Is

K-Design Studio is a Korean-first, browser-based AI design workspace. It lets a user create prototypes, slide decks, template-based artifacts, and other design outputs from prompt plus context, preview the live HTML artifact in a sandboxed canvas, directly edit visible text and layout/style properties, use inline comments and right-side Tweaks, manage versions, share, and export or hand off the result to Codex, Claude Code, Cursor, local agents, or web agents. The first version is an HTML-first design editor, not a full Figma clone.

## Core Value

Turn generated HTML designs into something a user can inspect, tweak, edit, and export without dropping into source code.

## Product Quality Bar

The target is product completeness 100: Claude Design-level quality, not a lightweight demo. Scope remains phased, but each phase must leave production-shaped foundations that can grow into the full deployed product without architectural rewrites.

Design-producing agents must use `docs/prompts/context-driven-design-agent-prompt.md` before creating screens, prototypes, slides, landing pages, animations, infographics, or design reviews. That prompt defines the product's design execution standard: fact-check first, collect source notes and design context, use real assets, avoid generic AI visuals, stage work, and verify in browser before completion.

The canonical product intent is `.planning/PRODUCT-NORTH-STAR.md`. Claude Design is the quality and UX benchmark, but the runtime must be agent-agnostic. Prompts, project files, artifact packages, and handoff flows must remain portable across Codex, Claude Code, Cursor, and similar agents. If a planning, research, or phase file differs from this north star, the differing file is stale.

Coding agents must follow `docs/guides/coding-principles.md`: think before coding, keep the solution simple, make surgical changes, and execute against verifiable success criteria.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] User can submit a prompt and receive a generated or mock-generated HTML artifact.
- [ ] User can start from a Claude Design-level, agent-agnostic workspace with left Chat/Comments, central canvas, top tool/export/share controls, and right Tweaks.
- [ ] User can choose prototype, slide deck, template-based, or other artifact creation modes.
- [ ] User can attach screenshots, images, documents, codebase references, existing design files, and web captures as context.
- [ ] User can preview the artifact in a sandboxed iframe.
- [ ] User can select visible editable elements in the preview.
- [ ] User can edit text and common style properties without touching code.
- [ ] User can adjust meaningful tweak controls in a right-side panel and see changes apply immediately.
- [ ] User can persist changes as artifact revisions.
- [ ] User can export the result as HTML, ZIP, image/PDF, and PPTX in v1, with Canva and agent-agnostic handoff surfaces planned in v1.
- [ ] User can continue work from Codex, Claude Code, Cursor, local agents, or web agents without changing the core artifact model.
- [ ] The product uses Korean-first typography and design defaults.

### Out of Scope

- Full Figma vector editor parity - too broad before proving the HTML editing loop.
- Multi-user collaboration - valuable later, not needed for first proof.
- Marketplace or public sharing platform - distribution layer deferred.
- Full editable PPTX round trip - v1 supports PPTX export/handoff first; full native PowerPoint authoring is later.
- Verbatim use of leaked Claude Design prompts - legal and ethical risk.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| HTML-first source of truth | The generated artifact is already HTML, and export fidelity depends on rendered HTML matching source. | Accepted |
| Sandboxed iframe preview | Generated HTML is untrusted and must not run with app privileges. | Accepted |
| Overlay-based direct editing | Keeps the generated page visually intact while the parent app owns selection and editing UI. | Accepted |
| Patch-limited visual editing | Full arbitrary DOM editing is too fragile for v1. | Accepted |
| Korean-first design system | The user's wedge is not just "Claude Design clone"; it is a Korean product/design sensibility. | Accepted |
| Claude Design-level quality bar | The product must reach the same class of completeness and polish; phase scope may be narrow, but foundations cannot be throwaway shortcuts. | Accepted |
| Context-driven design agent prompt | Visual artifact generation must be driven by `docs/prompts/context-driven-design-agent-prompt.md`, not ad-hoc generic web design behavior. | Accepted |
| Claude Design capability parity | Official and Korean reference checks define v1 parity surfaces: Chat/Comments, canvas, top tools, Tweaks, context attachments, inline comments, live knobs, versioning, design systems, sharing, exports, Canva, and agent handoff. | Accepted |
| Agent-agnostic runtime | Huashu Design shows the value of skill-style portability. K-Design Studio should provide a product UI while keeping prompts, artifact packages, and handoffs portable across Codex, Claude Code, Cursor, and similar agents. | Accepted |
| Coding principles | Implementation agents must follow `docs/guides/coding-principles.md` so changes stay thoughtful, simple, surgical, and verifiable. | Accepted |

## Context

**Target users:** Korean AI-native builders, designers, and small teams who want polished generated design artifacts but need direct control after generation.
**Current alternative:** Use Claude Design, use an HTML-generating skill such as Huashu Design, hand-edit generated HTML, or move screenshots into Figma/Canva.
**v1 deadline:** Not set.
**Constraints:** Solo-builder scope, current folder is greenfield, prioritize proof of the core loop before product sprawl while preserving the Claude Design-level product quality bar.

## Office Hours Summary

- **Goal:** Build a real product, not only a prompt skill.
- **Demand evidence:** User directly wants the Claude Design-grade loop with prompt generation, iframe preview, direct editing, Tweaks, and export.
- **Status quo:** Existing options split between proprietary product, skill-only HTML generation, and generic design editors.
- **Target user:** Korean AI-native builder who works through agents and wants design output that can be edited without source-code work.
- **Narrowest wedge:** One local web app proving prompt-to-edit-to-export for a single HTML artifact.
- **Risks:** Overbuilding Figma, unsafe arbitrary HTML, poor edit persistence, weak Korean design identity, export mismatch.

## Brainstorming Summary

Three approaches were considered:

1. **Skill-only generator:** Fastest, but misses direct manipulation.
2. **Full design editor clone:** Ambitious, but too large for the first proof.
3. **HTML-first visual editor:** Chosen because it matches the user's desired product loop while keeping scope shippable.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/sunco:phase`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/sunco:milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-27 after agent-agnostic north star sync*
