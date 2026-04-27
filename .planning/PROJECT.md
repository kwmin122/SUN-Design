# K-Design Studio

## What This Is

K-Design Studio is a Korean-first, browser-based AI design workspace. It lets a user enter a prompt, generate a high-fidelity HTML design, preview it in a sandboxed iframe, directly edit visible text and layout/style properties like a lightweight PPT/Figma canvas, adjust a right-side Tweaks panel, and export the result. The first version is an HTML-first design editor, not a full Figma clone.

## Core Value

Turn generated HTML designs into something a user can inspect, tweak, edit, and export without dropping into source code.

## Product Quality Bar

The target is product completeness 100: Claude Design-level quality, not a lightweight demo. Scope remains phased, but each phase must leave production-shaped foundations that can grow into the full deployed product without architectural rewrites.

Design-producing agents must use `docs/prompts/context-driven-design-agent-prompt.md` before creating screens, prototypes, slides, landing pages, animations, infographics, or design reviews. That prompt defines the product's design execution standard: fact-check first, collect source notes and design context, use real assets, avoid generic AI visuals, stage work, and verify in browser before completion.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] User can submit a prompt and receive a generated or mock-generated HTML artifact.
- [ ] User can preview the artifact in a sandboxed iframe.
- [ ] User can select visible editable elements in the preview.
- [ ] User can edit text and common style properties without touching code.
- [ ] User can adjust meaningful tweak controls in a right-side panel.
- [ ] User can persist changes as artifact revisions.
- [ ] User can export the result as HTML and image/PDF in v1.
- [ ] The product uses Korean-first typography and design defaults.

### Out of Scope

- Full Figma vector editor parity - too broad before proving the HTML editing loop.
- Multi-user collaboration - valuable later, not needed for first proof.
- Marketplace or public sharing platform - distribution layer deferred.
- Editable PPTX round trip - export target can come after HTML/PNG/PDF are reliable.
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
*Last updated: 2026-04-27 after adding core design agent prompt*
