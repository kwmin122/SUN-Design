# Phase 10 Research: Dev Mode, Publish, and Export Fidelity

Checked: 2026-04-29

## Recommended Approach

Implement Phase 10 as three connected layers and three execution waves:

1. Wave 1 `editor-core` shared contracts: Dev Mode, export, publish, PPTX, animation, and code roundtrip records must live inside `ProjectBundle`, be validated on reload, and be included in handoff packages. This wave owns shared files such as `schemas.ts`, `integrity.ts`, `handoff.ts`, and `index.ts`.
2. Wave 2 local export materialization worker: real files should be created from stored state through a Node worker path, not from live iframe DOM. HTML, ZIP, PNG, PDF, PPTX, GIF, and MP4 should produce deterministic artifacts plus visual/fidelity diagnostics. The worker must also emit a serialized bundle fixture that the web UI can load.
3. Wave 3 web studio workflow: expose Dev Mode, ready-for-dev, version diff, asset download, publish preview, export queue, and code roundtrip in the product shell with browser tests. The web tests must load the worker-created fixture so UI artifact rows are proven against worker output, not browser-only mirrored records.

This keeps the durable source-of-truth contract intact: `ProjectBundle + EditGraph + patch log + assets + tweak values + canvasGraph + designSystem + Phase 09 context`. It also avoids overclaiming production hosting: Phase 10 can publish a responsive static preview package and local preview URL record, but full hosted storage/auth remains out of scope.

Official benchmark alignment:

- Figma Dev Mode sets the handoff bar for inspectable design details, code snippets, assets, and change handoff: <https://www.figma.com/dev-mode/>
- Figma export and Slides references establish the expected export surface for design assets and decks: <https://help.figma.com/hc/en-us/articles/360040028114-Export-from-Figma-Design>, <https://help.figma.com/hc/en-us/articles/24170630629911-Explore-Figma-Slides>
- Figma Sites reinforces responsive publish preview as a first-class product surface: <https://www.figma.com/blog/introducing-figma-sites/>
- Claude Design keeps export/share/handoff and context-aware design workflows in the benchmark set: <https://support.claude.com/en/articles/14604416-get-started-with-claude-design>
- Paper's product direction reinforces HTML/CSS canvas continuity, agents, code, and data on one design surface: <https://paper.design/>, <https://paper.design/roadmap>

## Alternative(s) Considered

### Keep exports as existing `ExportJob` metadata only

Rejected. Phase 10 explicitly requires real file materialization with deterministic verification. Metadata-only export jobs caused earlier phase overclaim risks and would not meet the Paper/Figma/Claude Design product bar.

### Put export generation entirely in the web component

Rejected. Browser-only export makes PNG/PDF/MP4/PPTX fidelity hard to test and tempts the implementation to read the live iframe DOM. A worker-style package keeps export logic testable, deterministic, and independent from React UI state.

### Implement production hosted publish now

Rejected. Phase 10 should create a server-portable static publish package and local preview record. Authenticated hosting, storage backends, CDN, domains, billing, and publish permissions remain out of scope unless a later phase adds them.

## Implementation Map

### Core Dev Mode and Handoff

- `packages/editor-core/src/schemas.ts` — Add Dev Mode, ready-for-dev, version diff, export artifact, publish preview, and code roundtrip schemas to `ProjectBundle`.
- `packages/editor-core/src/dev-mode.ts` — Build selected-object inspect reports, CSS/token/code snippets, ready-for-dev markers, version comparisons, and asset download metadata.
- `packages/editor-core/src/export-fidelity.ts` — Create export artifact, export verification, and static publish preview records.
- `packages/editor-core/src/code-roundtrip.ts` — Create code-agent packages and validate roundtrip imports before applying anything.
- `packages/editor-core/src/integrity.ts` — Validate persisted Dev Mode, ready-for-dev, version diff, export artifact, publish preview, and roundtrip references on load.
- `packages/editor-core/src/handoff.ts` — Include Dev Mode, export, publish, and roundtrip records in portable handoff packages.
- `packages/editor-core/src/index.ts` — Re-export Phase 10 modules.
- `packages/editor-core/src/__tests__/dev-mode.test.ts` — Unit and adversarial tests for inspect/code/readiness/diff/asset metadata.
- `packages/editor-core/src/__tests__/export-fidelity.test.ts` — Unit tests for artifact, verification, and publish preview records.
- `packages/editor-core/src/__tests__/code-roundtrip.test.ts` — Unit tests for package creation, runtime/source validation, operation allowlists, and conflict diagnostics.
- `packages/editor-core/src/__tests__/persistence.test.ts` — Persisted corruption tests for new Phase 10 records.

### Export Materialization Worker

- `apps/export-worker/package.json` — New workspace package `@kdesign/export-worker`.
- `apps/export-worker/tsconfig.json` — Composite TypeScript project referencing `packages/editor-core`.
- `apps/export-worker/src/export-worker.ts` — Materialize HTML, ZIP, PNG, PDF, PPTX, GIF, MP4, static publish preview, and code-agent packages from stored state.
- `apps/export-worker/src/pptx.ts` — Strict PPTX subset writer for rasterized deck export and editable text/image/shape subset export.
- `apps/export-worker/src/zip.ts` — Deterministic ZIP helper using `fflate`.
- `apps/export-worker/src/animation.ts` — Capture deterministic frames and encode GIF/MP4 through `gifenc` and bundled ffmpeg.
- `apps/export-worker/src/__tests__/export-worker.test.ts` — Artifact tests that assert file signatures, manifest contents, and no live iframe DOM dependency.
- `apps/web/tests/fixtures/phase-10-worker-export-bundle.json` — Serialized bundle fixture generated by the worker tests and consumed by Phase 10 web tests.
- `package.json` and `tsconfig.json` — Add export-worker to build/typecheck scripts and project references.
- `pnpm-lock.yaml` — Updated by installing worker dependencies.

### Web Studio Workflow

- `apps/web/components/dev-mode-panel.tsx` — Dev Mode inspect, code snippets, ready-for-dev, version diff, and asset download UI.
- `apps/web/components/export-publish-panel.tsx` — Export queue, deterministic verification diagnostics, publish preview, and code roundtrip UI.
- `apps/web/components/editor-shell.tsx` — Wire Phase 10 callbacks, records, and right-rail/top-toolbar actions.
- `apps/web/app/globals.css` — Responsive professional tool UI for Dev Mode/export surfaces.
- `apps/web/tests/phase-10-dev-mode.spec.ts` — Browser tests for inspect/code/ready/diff/assets/reload.
- `apps/web/tests/phase-10-export-publish.spec.ts` — Browser tests for export artifacts, publish preview, code roundtrip, and desktop/tablet/mobile overflow.

## Wave and Write-Set Rationale

Phase 10 intentionally uses three waves. This is an exception to the usual two-wave preference because a two-wave split would either run shared `ProjectBundle` contract edits in parallel or allow the web UI to ship before the worker-created artifact path exists.

- Wave 1: `10-01` owns all shared editor-core contract files.
- Wave 2: `10-02` depends on `10-01` and owns only export-worker/package files plus the worker-created web fixture.
- Wave 3: `10-03` depends on `10-01` and `10-02`, owns only web UI/tests/docs, and verifies worker-created records render in the browser.

No two plans in the same wave should modify the same file.

## Dependencies

New dependencies should be limited to the export worker package:

- `fflate@0.8.2` — deterministic ZIP/PPTX package writing.
- `gifenc@1.0.3` — deterministic GIF encoding for authored animation templates.
- `@ffmpeg-installer/ffmpeg@1.1.0` — local MP4 encoding without requiring a globally installed ffmpeg binary.
- Existing `@playwright/test@1.59.1` can be used by the worker for deterministic PNG/PDF rendering from stored HTML.

No new runtime dependency should be added to `apps/web` unless the UI implementation proves it cannot use existing React and editor-core helpers.

## Risk Register

| Risk | Mitigation |
|------|------------|
| Export worker accidentally captures live iframe DOM | Worker input must be serialized `ProjectBundle` only; tests must fail if output includes editor overlays, bridge scripts, or live-only mutation markers. |
| PPTX support overclaims full editability | Implement two explicit modes: `rasterized` and `editableSubset`. Editable subset supports only text, image, and simple shape/vector-like objects; unsupported nodes must produce diagnostics. |
| MP4/GIF becomes a fake placeholder | Require real file signatures and non-zero bytes. MP4 path uses bundled ffmpeg; if ffmpeg fails, job status is failed and the requirement is not marked complete. |
| Dev Mode values drift from stored state | Inspect reports must derive from `canvasGraph`, `editGraph`, design tokens, prototype graph, and optional rendered rect snapshots. Persisted reports with missing object/token/prototype references must be rejected. |
| Publish path overclaims hosted production | Use `kdesign://publish/{projectId}/{publishId}` and static package records only. Hosted account/CDN semantics stay deferred. |
| Code roundtrip corrupts canvas state | Roundtrip imports must validate source revision, object/node ids, and allowed patch/operation kinds before applying. Conflicts must be stored as diagnostics instead of applying unsafe edits. |

## RESEARCH COMPLETE
