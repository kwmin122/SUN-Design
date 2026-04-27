# Product North Star

## Canonical Intent

K-Design Studio is a Korean-first, browser-based AI design workspace for creating prototypes, slide decks, template-based artifacts, animations, infographics, and product screens from prompt plus context.

The quality benchmark starts at Claude Design-level product completeness and then goes further: the generated result must become a directly editable working document, closer to a PPT/Figma/Paper-style canvas than a static preview. The runtime must be agent-agnostic. The user must be able to continue the same design work from Codex, Claude Code, Cursor, local agents, or web agents without changing the artifact model.

## Non-Negotiable Product Shape

- Left side: Chat and Comments for broad iteration and targeted feedback.
- Center: live sandboxed canvas for the current HTML artifact.
- Top: file tabs, Share, Export, Comment, Edit, Draw, zoom, and Present controls.
- Right side: Tweaks that immediately change the artifact through stored state.
- Direct manipulation: generated text, images, cards, sections, and slide-like/artboard blocks can be selected, moved, resized, restyled, reordered, commented on, and revised through the canvas without editing source code.
- Creation surface: prototype, slide deck, template-based, and other artifact modes.
- Context surface: screenshots, images, assets, DOCX, PPTX, XLSX, product/spec docs, codebase references, existing design files, and web capture.
- Output surface: standalone HTML, ZIP, PNG, PDF, PPTX handoff/export, Canva handoff, and coding-agent handoff.

## Durable Architecture Contract

- Source of truth: `ProjectBundle + EditGraph + patch log + assets + tweak values`.
- Editable canvas contract: direct edits are typed operations against structured nodes and layout constraints, not live iframe DOM saves.
- Preview: sandboxed iframe projection, never the persistence source.
- Bridge: validated by source, nonce, type, and schema.
- Handoff: portable package readable by Codex, Claude Code, Cursor, local agents, and web agents.
- Prompts/skills: portable Markdown/project files, not Claude-only hidden prompts or Claude-only extension points.
- Provider adapters: replaceable. No core schema may assume Anthropic-only APIs, Claude Code-only tools, or a single runtime.

## Document Consistency Rule

This file is the first source to check when a project document differs. `CLAUDE.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, phase context files, phase plans, and research docs must all preserve the same product intent:

- Claude Design-level quality is the benchmark.
- PPT/Figma/Paper-style direct editability of generated output is a product requirement, not optional polish.
- The runtime is agent-agnostic, not Claude Code-only.
- The artifact package is the durable handoff surface.
- Phase scope may be staged, but no phase may introduce throwaway architecture that blocks the full product.

## Coding Agent Rule

Every coding agent must also read and follow `docs/guides/coding-principles.md`: think before coding, keep the solution simple, make surgical changes, and define verifiable success criteria before calling work complete.

## Phase 01 Boundary

Phase 01 implements only the safe foundation: fixture/imported HTML, sanitize/normalize, stable `data-cdx-id`, ProjectBundle persistence, sandbox preview, validated bridge, diagnostics, and a production-shaped app shell that visually reflects the full product direction.

Phase 01 does not implement real AI generation, semantic direct visual editing, full Tweaks semantics, responsive preview modes, export jobs, sharing permissions, design-system learning, or hosted production hardening. Fixture-only controls may immediately change the preview only by regenerating stored `ProjectBundle` state through the safe pipeline.

## Source References

- Official Claude Design guide: <https://support.claude.com/ko/articles/14604416-claude-design-%EC%8B%9C%EC%9E%91%ED%95%98%EA%B8%B0>
- Korean Claude Design references:
  - <https://brunch.co.kr/@ghidesigner/470>
  - <https://simsimit00.tistory.com/580>
  - <https://daleseo.com/claude-design/>
- Agent-agnostic design-skill reference: <https://github.com/alchaincyf/huashu-design>
- Editable web-standard canvas reference: <https://paper.design/>
