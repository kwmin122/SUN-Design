# FEATURES Research

## Product Frame

K-Design Studio is an HTML-first Korean AI design IDE:

`Korean prompt/context -> generated or imported HTML -> sandboxed iframe preview -> PPT/Figma-like direct edits -> right Tweaks panel -> export/handoff`

The feature bar is not "can it generate a pretty page once?" The bar is "can the generated result stay editable, inspectable, tweakable, exportable, and portable across Codex, Claude Code, Cursor, local agents, and web agents without source-code work?"

## Reference Signals

| Reference | Relevant feature lesson | Product implication |
|---|---|---|
| Claude Design | Prompt/import from documents, images, web capture, codebase/design files; inline comments, direct text edits, adjustment knobs; export to Canva/PDF/PPTX/HTML; agent handoff expectations. | The category expectation is a continuous create-refine-export loop, not a chatbot that drops a file. Claude Design is the product quality benchmark, not the runtime dependency. |
| Open CoDesign | Local-first/BYOK, sandboxed iframe, built-in design skills, AI-emitted sliders, responsive previews, pin comments that rewrite only a region, on-device HTML/PDF/PPTX/ZIP exports. | Strong model for a solo-builder-friendly, non-cloud-locked design workbench. |
| Figma Make / Figma | Prompt-to-code from existing frames, point-and-edit, direct preview/code edits, version history, design-library context, right-side properties panel, auto layout/responsive concepts. | Use Figma's interaction patterns, but do not chase full Figma parity in v1. |
| Canva | AI design inside the editor, Canva Code for interactive widgets, Magic Layers turning static outputs into editable layered designs. | Users now expect AI outputs to become editable working files, not flat screenshots. |
| Webflow | Right Style panel for layout, spacing, size, position, typography, background, borders, effects, classes, states, breakpoints. | The right panel should feel like safe CSS controls for selected HTML, not a generic form dump. |
| Framer | AI Wireframer, AI component Workshop, visual responsive layouts, effects/interactions, generated components with property controls and style matching. | Use generated component/tweak controls for focused customization; defer publishing/CMS. |
| Portable agent skills | Reusable workflow files, supporting files, templates, examples, scripts, project/personal scope, and model-invoked or command-invoked behavior across tools such as Claude Code, Cursor, Codex CLI, and similar agents. | Later differentiator: project-level design skills for Korean style rules, artifact recipes, export QA, and brand rules without Claude Code-only lock-in. |

## Table Stakes

| Feature | Why it matters | v1 stance |
|---|---|---|
| Korean prompt composer | The user starts with intent, not a blank canvas. | Required. Start with mock or single provider behind `GenerationAdapter`. |
| High-fidelity HTML artifact generation | Product promise is Claude Design-grade output, not wireframes only. | Required. Require stable `data-cdx-id` and optional tweak schema in generated output. |
| Sandboxed iframe preview | Generated HTML is untrusted but must render like the final export. | Required. Preview must be isolated from app privileges. |
| Element hover/select in preview | Direct editing begins with reliable hit testing. | Required. Use overlay + iframe bridge, not parent DOM access. |
| Direct text editing | First "PPT-like" moment. | Required. Double-click or inspector text field for hardcoded text nodes. |
| Basic style inspector | Users need common edits without code. | Required. Text color, font size, weight, align, spacing, radius, background, image replace, visibility. |
| Right Tweaks panel | This is the product's control surface after generation. | Required. Show global artifact tweaks plus selected-node properties. |
| AI-emitted tweak variables | Avoid making users hunt arbitrary CSS. | Required if generation exists. Examples: brand color, density, mood, radius, section spacing, font scale. |
| Undo/redo and revision history | AI/design edits need reversibility. | Required. Patch log first; named versions later. |
| Export HTML | Source-of-truth proof. | Required. Export clean standalone HTML without editor bridge/overlay. |
| Export image/PDF | Common share/review path. | Required by v1, after HTML export works. |
| Responsive preview modes | Generated pages must survive desktop/tablet/mobile review. | Required. Start with viewport switcher, not full breakpoint editor. |
| Korean typography defaults | The wedge is Korean-first, not translated UI chrome. | Required. Provide Hangul-safe font stacks, line-height, word-break, spacing, and Korean sample content defaults. |

## Differentiators

| Differentiator | What to build | Why it can win |
|---|---|---|
| Korean-first design taste | Presets for Korean SaaS/product pages, startup pitch decks, Naver/Kakao/Toss-inspired clarity, public-sector/business document styles without copying brands. | Most global AI design tools still feel English-first in typography, density, copy rhythm, and template assumptions. |
| Editable HTML as the native artifact | Normalize generated HTML into `EditGraph + patch log + tweak schema`. | Avoids Canva-style "flat output then recover layers"; editability is built in from generation. |
| Tweaks that do not re-prompt for every nudge | Model emits meaningful controls; user drags sliders/color pickers locally. | Faster than chat-only refinement and closer to Claude Design/Open CoDesign knobs. |
| Region-level prompt edits | Select a section, button, or card and ask for a targeted rewrite/restyle. | Prevents whole-page drift and makes AI feel controllable. |
| Design intent handoff | Export `index.html` plus `project.cdx.json` with tweak values, patch history, design notes, source notes, and agent instructions. | Useful for Codex, Claude Code, Cursor, local agents, and web agents to continue the same artifact, not just static publishing. |
| Project-level design skills | Later: `.kdesign/skills/<skill>/SKILL.md` for landing pages, dashboards, pitch decks, Korean typography QA, export QA. | Borrow durable skill-style workflow patterns for design consistency without copying restricted prompts or files. |
| Local-first / BYOK option | Save artifacts locally; optionally import runtime-family/provider settings later. | Strong wedge for builders who dislike cloud lock-in or token opacity. |
| Design QA as a first-class pass | Detect generic AI visuals, weak Hangul typography, contrast issues, overflow, export mismatch. | Turns "AI made a draft" into "AI helped polish a deliverable." |

## Anti-Features

| Anti-feature | Why to avoid |
|---|---|
| Full Figma clone | Vector tools, component variants, advanced auto layout, multiplayer, comments, plugins, and dev mode are too broad before proving HTML editability. |
| Full PPT clone | Slide authoring, transitions, speaker notes, chart editing, and PPTX round-trip will distract from the core HTML loop. |
| Unsandboxed iframe / same-origin preview | Security risk and bad architecture; the editor should communicate through a narrow bridge. |
| Live iframe DOM as durable source of truth | Easy demo, brittle product. Save patches against normalized source instead. |
| Whole-artifact regeneration for small edits | Causes design drift and breaks user trust. Prefer selected-node patches and region prompts. |
| Provider/API-key chooser as the first UX | The user wants a design IDE, not a model settings page. Hide providers behind sensible defaults. |
| Marketplace/public gallery in v1 | Distribution is not the proof. Editing/export reliability is. |
| Collaboration in v1 | Valuable later, but it multiplies state, permissions, and conflict complexity too early. |
| Fully editable semantic PPTX/Figma round-trip in v1 | Nice later; hard to do well. HTML, ZIP, PNG, PDF, raster PPTX, and portable agent handoff prove the core loop first. |
| Leaked/private Claude Design prompt cloning | Legal, ethical, and product-risky. Compete through workflow and Korean-first execution. |

## Recommended v1 Feature Cut

Build the first vertical slice around one artifact:

1. Prompt or sample prompt creates a single normalized HTML artifact.
2. Artifact renders in a sandboxed iframe.
3. User selects visible text/block/image elements.
4. User edits text and 5-8 safe style properties.
5. Right Tweaks panel updates global design variables.
6. Patch log persists edits with undo/redo.
7. User exports clean HTML, ZIP, PNG/PDF, raster PPTX, and a portable agent handoff package.
8. Korean typography and content defaults are visible in the generated result.

Defer: multiplayer, public marketplace, full layer tree, advanced drag layout, semantic editable Figma/PPTX round-trip, CMS, publishing, and complex code editing.

## Open Questions for Planning

- Should v1 generation require a structured artifact contract from the model, or should the app normalize arbitrary HTML best-effort?
- Which Korean style presets define the first taste wedge: SaaS dashboard, startup landing, pitch one-pager, public-sector explainer, or mobile app screen?
- Is the first export path browser-only download, local filesystem project folder, or both?
- How much JavaScript interactivity is allowed in v1 preview: static-only by default, interactive mode opt-in, or always enabled with stricter bridge rules?

## Machine-Verified Sources

- Anthropic: [Introducing Claude Design by Anthropic Labs](https://www.anthropic.com/news/claude-design-anthropic-labs)
- Open CoDesign: [Open-source AI design tool](https://opencoworkai.github.io/open-codesign/)
- Figma: [Introducing Figma Make](https://www.figma.com/blog/introducing-figma-make/)
- Figma Help: [Create and edit a Figma Make file](https://help.figma.com/hc/en-us/articles/31304485164695-Create-and-edit-a-Figma-Make-file)
- Figma Help: [Design, prototype, and explore layer properties in the right sidebar](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar)
- Framer: [Website builder overview](https://www.framer.com/)
- Framer: [Workshop AI component generator](https://www.framer.com/workshop/)
- Claude Code Docs: [Extend Claude with skills](https://code.claude.com/docs/en/skills)
- GrapesJS Docs: [Getting started](https://grapesjs.com/docs/getting-started.html)
- tldraw SDK: [Infinite canvas SDK for React](https://tldraw.dev/)
- Playwright: [Screenshots](https://playwright.dev/docs/screenshots)
- PptxGenJS: [HTML to PowerPoint](https://gitbrent.github.io/PptxGenJS/docs/html-to-powerpoint/)

Canva and Webflow remain contextual product references in the comparison table above, but their official pages returned automated `403` responses during verification and are intentionally excluded from the machine-verified source log.
