# Design Product Capability Baseline

Sources checked:

- <https://support.claude.com/ko/articles/14604416-claude-design-%EC%8B%9C%EC%9E%91%ED%95%98%EA%B8%B0>
- <https://brunch.co.kr/@ghidesigner/470>
- <https://simsimit00.tistory.com/580>
- <https://daleseo.com/claude-design/>
- <https://github.com/alchaincyf/huashu-design>

Checked date: 2026-04-27

## Product Baseline

The official Claude Design guide describes Claude Design as a tool for creating designs, interactive prototypes, presentations, and more through conversation with Claude.

Huashu Design is also a key reference because it demonstrates the opposite packaging model: a design-producing skill that is agent-agnostic and can run from Claude Code, Cursor, Codex, OpenClaw, Hermes, or similar coding agents. K-Design Studio should combine the product surface and polish of Claude Design with the runtime portability of that skill-style model.

The core product layout has two main areas:

- Left-side chat or creation interface.
- Right-side canvas where generated designs are reviewed and iterated.

The expected workflow is:

1. Create a project and add relevant context.
2. Describe what to create.
3. Review the generated design on the canvas.
4. Iterate with chat messages and inline comments.
5. Export or share when satisfied.

## Required Capability Surface

K-Design Studio must cover these capabilities at product-complete quality:

- Project home with creation entry points, recent designs, user designs, examples, design systems, and search.
- Creation modes for prototypes, slide decks, templates, and other design artifacts.
- Fidelity choices such as wireframe and high fidelity before creation.
- Prompt composer that captures goal, layout, content, audience, and style.
- Context attachment for screenshots, images, existing assets, slide decks/documents, codebase, and existing design files.
- Context parsing for DOCX, PPTX, XLSX, and product/spec documents when the user wants source content transformed into slides or UI.
- Web capture by URL or selected page region for visual reference and redesign workflows.
- Organization or project design system setup for colors, typography, and component patterns.
- Design-system learning from codebase, brand assets, uploaded references, and existing UI patterns.
- Canvas review of generated artifacts.
- Chat-based iteration for broad changes.
- Inline comments for targeted component-level changes.
- Direct canvas text editing for copy adjustments.
- Live adjustment knobs, sliders, and segmented controls that update spacing, color, density, and layout without rewriting prompts.
- Semantic propagation of tweaks across similar sections, not isolated one-off CSS changes only.
- Version and revision handling for saved alternatives.
- Export to `.zip`, PDF, PPTX, Canva, standalone HTML, and a runtime-agnostic agent handoff package for Codex, Claude Code, Cursor, local coding agents, or web coding agents.
- Shareable links with view-only, comment, and edit access.
- Design critique/review for accessibility, contrast, hierarchy, and usability.
- Portable design-agent instruction assets stored as regular project files, not as Claude-only hidden prompts or Claude-only extension points.

## Phase Impact

The earlier roadmap covered the core safe artifact, editing, prompt, responsive preview, and export path. It did not explicitly cover the Claude Design project home, mode selection, document/web-capture context attachment, design system setup/learning, inline comments, live adjustment controls, sharing permissions, Canva/agent handoff, or saved alternative versions.

The roadmap now treats those as first-class v1 requirements instead of optional polish.

## Runtime Independence Decision

K-Design Studio must not be Claude Code-only. The durable contract is:

- `ProjectBundle`, `EditGraph`, patch log, assets, tweak values, and diagnostics are the source of truth.
- Design-agent prompts and skills live as portable Markdown/project files.
- Agent handoff exports a plain package that Codex, Claude Code, Cursor, and similar tools can read.
- Provider/runtime adapters are replaceable; no core data model should assume Anthropic-only APIs or Claude-only tool semantics.
