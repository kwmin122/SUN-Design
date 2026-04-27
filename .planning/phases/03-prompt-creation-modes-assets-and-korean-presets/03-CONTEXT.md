# Phase 03: Prompt, Creation Modes, Assets, and Korean Presets — Context

**Gathered:** 2026-04-27
**Status:** Ready for execution planning
**Mode:** autonomous continuation from `$sunco-auto`

## Phase Boundary

Phase 03 connects the studio shell to prompt-based creation controls, artifact modes, fidelity targets, context attachments, asset manifest status, web capture placeholders, and Korean-first presets. It must feed created artifacts into the same `sanitize -> normalize -> ProjectBundle -> sandbox preview -> direct edit` pipeline already proven in Phases 01 and 02.

This phase does not add paid/real AI provider calls, real browser scraping, production upload storage, worker queues, sharing, export jobs, or design-system learning.

## Product Bar

- The user persona is a vibe coder: they should type a Korean prompt, choose prototype/slide/template/other, choose wireframe/high fidelity, attach context placeholders, and immediately get an editable artifact.
- The output must be deterministic for tests and local-first work.
- Context attachments are represented as source material metadata and asset manifest entries. No outbound transfer occurs in Phase 03.
- Korean-first typography and copy rhythm must be visible in generated/sample artifacts, not hidden in docs.

## Required Outcomes

- Prompt composer creates a new generated bundle from Korean or English text.
- Creation mode tabs and fidelity controls are stateful and affect generated output.
- Context attachment actions add image, document, slide, spreadsheet, codebase, and web capture entries.
- Generated bundles record `source.kind = generated`, prompt, mode, fidelity, and preset.
- External/context assets appear in the bundle asset manifest with explicit `cached`, `placeholder`, or `verified` status.
- Three Korean presets exist: SaaS/product landing, pitch/explainer deck, and mobile app screen.
- Generated artifacts remain directly editable through the Phase 02 inspector after creation.

## Verification Plan

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm e2e`
- Browser screenshot smoke for generated artifact and attachment manifest.
