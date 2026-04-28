# Phase 07 Research — Design System, Tokens, and Code Connect

Generated: 2026-04-28

## Objective

Plan the implementation path for turning K-Design Studio's Phase 05 design-system placeholder and Phase 06 local component foundation into a governed, versioned, code-connected design-system workflow. This phase must move toward Claude Design, Paper, Figma Dev Mode/Code Connect, and Huashu Design-level capability without copying proprietary UI, prompts, or licensed source code.

## Sources Checked

- Claude Design guide: <https://support.claude.com/en/articles/14604416-get-started-with-claude-design>
- Claude Design design-system setup: <https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design>
- Paper roadmap: <https://paper.design/roadmap>
- Figma Dev Mode: <https://www.figma.com/dev-mode/>
- Figma Code Connect docs: <https://developers.figma.com/docs/code-connect/>
- Huashu Design GitHub repository: <https://github.com/alchaincyf/huashu-design>
- Local competitive gap review: `.planning/research/COMPETITIVE-GAP-REVIEW.md`

## Reference Capability Extraction

### Claude Design

Observed from official docs:

- Project creation inherits an organization design system automatically.
- Design systems are extracted from codebases, presentations, documents, brand guidelines, logos, color palettes, typography specs, screenshots, prototypes, and other references.
- The extracted design system includes reusable components, colors, typography, and layout patterns.
- Users validate the system with test projects, then publish it for team use.
- Updates/remix are supported when the brand evolves.

Phase 07 implication: K-Design must stop treating `learnDesignSystem` as a one-click final result. It needs candidate extraction, review, publish, version history, rollback, source provenance, and published state.

### Paper

Observed from Paper roadmap:

- Code components are a target source of truth.
- Tailwind integration, CSS Grid, components with props/slots, themes, and tokens are core product directions.
- MCP/live-data/canvas-aware agents are important but belong to later phases when connected data and agent protocol are available.

Phase 07 implication: implement local code-component references, token mappings to CSS variables and Tailwind classes, and slot/prop metadata. Do not claim live Paper-style code execution or agent runtime yet.

### Figma Dev Mode and Code Connect

Observed from official Figma docs:

- Dev Mode links design systems to codebases through Code Connect.
- Component playground lets users test component variations without changing the design file.
- Variables/token values can surface with corresponding code syntax.
- Code Connect supports one-to-many connections across frameworks and template files that define true production snippets.

Phase 07 implication: implement a component playground that is explicitly non-mutating, plus code mapping records that can point to GitHub/Storybook/docs/template snippets. Do not require real Figma API or external publishing in this phase.

### Huashu Design

Observed repository goal: HTML-native, high-fidelity design skill / prototype / slides / animation / review workflow, agent-agnostic positioning. Prior project decision remains: treat it as workflow inspiration and avoid copying code or prompts.

Phase 07 implication: keep portable agent-facing design-system artifacts in repo-visible project files and handoff packages. Do not tie the model to Claude-only hidden prompts.

## Current Local State

Relevant foundation already exists:

- `ProjectBundle.designSystem` exists but is a simple flat object with colors, typography, radius, spacing, source, and createdAt.
- `learnDesignSystem` extracts a few colors and fixed typography/radius/spacing from stored HTML.
- `CanvasGraph.components` and `CanvasGraph.instances` now have props, variants, overrides, slots, state, detach, and persisted graph integrity.
- Agent handoff packages include `designSystem`, `canvasGraph`, `components`, and `componentInstances`.

Main gaps:

1. No reviewable design-system candidate state.
2. No governed token model with modes, provenance, status, code mappings, or export names.
3. No version history, publish/remix, or rollback semantics.
4. No component pattern registry connected to canvas components.
5. No Storybook/GitHub/docs/code reference validation.
6. No non-mutating component playground UI.
7. No browser workflow for review/publish/rollback and token mapping.

## Architecture Recommendation

### Core Data Model

Extend the current `DesignSystem` schema instead of replacing it, preserving old bundles:

- `DesignToken`: id, name, category, value, optional modes, provenance, status, cssVariable, tailwindClass, codeReferenceId.
- `DesignTokenMode`: mode name and value.
- `CodeComponentReference`: id, name, framework, importPath, exportName, sourceUrl/sourcePath, docsUrl, storybookUrl, propMappings, slotMappings, status.
- `DesignComponentPattern`: id, name, sourceObjectId, componentId, variantIds, propNames, tokenIds, codeReferenceId, provenance, status.
- `DesignSystemVersion`: id, label, createdAt, sourceRevision, tokenCount, componentPatternCount, snapshot hash.
- `DesignSystemReview`: candidates with statuses `candidate`, `approved`, `rejected`, `published`.

Keep `colors`, `typography`, `radius`, and `spacing` for compatibility, but generate richer `tokens` and `componentPatterns` from them.

### Core Helpers

Add `packages/editor-core/src/design-system.ts` with deterministic helpers:

- `extractDesignSystemCandidates(bundle, options)`: parse stored HTML, existing designSystem, canvas components, and assets to produce reviewable tokens and component patterns.
- `approveDesignSystemCandidate(system, ids)`: marks tokens/patterns approved.
- `publishDesignSystem(system, label)`: creates a version snapshot and sets published metadata.
- `remixDesignSystem(system, changes)`: creates an unpublished revision without deleting prior versions.
- `rollbackDesignSystem(system, versionId)`: restores a previous version snapshot.
- `mapTokenToCode(system, tokenId, mapping)`: validates CSS variable, Tailwind class, and code reference ids.
- `validateCodeComponentReference(ref)`: local-only validation for safe repo paths/https docs/Storybook/GitHub links.
- `createComponentPlaygroundState(graph, componentId, props, variantId, mode)`: returns a derived non-mutating preview state.

### UI Workflow

Update the right rail with a real design-system section:

1. `Extract candidates` creates reviewable tokens/patterns.
2. User can approve/reject candidates.
3. User can map a selected token to CSS variable and Tailwind class.
4. User can add a code component reference with framework/import/export/source/doc/storybook fields.
5. User can publish a design-system version, remix current system, and rollback.
6. Component playground renders selected component variants/props/modes in a contained preview and explicitly avoids canvas mutation.
7. Handoff shows design tokens and code references as included payloads.

### Tests

Required tests:

- Unit tests for schema compatibility with old designSystem shape.
- Unit tests for candidate extraction from deterministic fixture HTML.
- Negative tests for duplicate token names, invalid CSS variable names, unsafe source paths, unknown token/code refs, and rollback of missing version.
- Unit tests proving playground state does not mutate `CanvasGraph`.
- Playwright test for extract -> approve -> map -> add code ref -> publish -> remix -> rollback -> reload.
- Playwright test for component playground changing variant/props/mode without increasing canvas operation count or changing selected object state.

## Recommended Plan Shape

Two waves:

1. `07-01` Core design-system governance and code mapping.
   - Extend schemas, add deterministic design-system helpers, update handoff, add unit tests.
2. `07-02` Product UI for review, publish, token mapping, code refs, and component playground.
   - Add panels/components, wire editor shell, add CSS and browser tests.

## Explicit Non-Goals

- No real Figma API calls.
- No Storybook/GitHub fetching or OAuth.
- No Tailwind compiler/runtime integration beyond validated mapping records.
- No organization permissions or hosted team publishing.
- No marketplace or public design-system distribution.
- No copying Huashu Design source or proprietary Claude/Paper/Figma UI assets.

## Quality Bar

Phase 07 is complete only when the user can see and operate a governed design-system workflow. A schema-only implementation is not enough.
