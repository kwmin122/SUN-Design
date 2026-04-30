# Phase 10 Verification Results

Generated: 2026-04-30T09:24:40+09:00

## Summary

| Layer | Name | Result | Notes |
|-------|------|--------|-------|
| 1 | Multi-agent review | FAIL | Independent correctness and security reviewers found structural Phase 10 contract gaps. |
| 2 | Guardrails | PASS | lint, typecheck, tsc, export-worker tests, unit tests, e2e, phase-op, and artifact hash pass. |
| 3 | BDD criteria | FAIL | Most visible workflows pass, but roundtrip, append integrity, persisted HTML safety, and PPTX API criteria are not met. |
| 4 | Permission audit | WARN | No secrets; network scan found only planned ffmpeg child process, but support files and planning docs exceed plan file lists. |
| 5 | Adversarial | FAIL | Local probes reproduced recomputed-hash manifest tamper, append bypasses, unsafe HTML persistence/export, and API mismatch. |
| 6 | Cross-model | FAIL | Skeptical review found additional semantic integrity gaps in artifact verification/revision matching. |
| 7 | Human eval | SKIPPED | Automated layers failed, so human approval was not requested. |

## Overall: NEEDS FIXES

Phase 10 must not proceed to `/sunco:ship 10`. Fix the issues listed below, then re-run `/sunco:verify 10`.

## Layer Details

### Layer 1 - Multi-Agent Review

**Agent 1 (implementation correctness): FAIL**

- FAIL: Roundtrip manifest validation is not full-snapshot validation. `projectBundleHash` is computed against the embedded `manifest.projectBundle` itself and only selected fields are compared to the stored bundle. Recomputed-hash tampering of `manifest.projectBundle.title` is accepted on package creation and persisted reload. Evidence: `packages/editor-core/src/code-roundtrip.ts`.
- FAIL: `appendExportArtifact` and `appendPublishPreview` can return invalid bundles because append paths schema-parse but do not call full integrity validation. Probes accepted a detached export artifact with a missing job and a detached publish preview with a missing artifact. Evidence: `packages/editor-core/src/export-fidelity.ts`.
- FAIL: `createRasterizedPptx` does not match the planned public API. The plan declares a raw `Uint8Array` export, but the implementation returns `{ data, diagnostics }` and accepts missing preview paths. Evidence: `apps/export-worker/src/pptx.ts`.
- PASS: Network request blocking, browser GIF/MP4 gating, worker fixture loading through `parseProjectBundleJson`, and button/frame/vector-like PPTX mapping are present.

**Agent 2 (security and resilience): FAIL**

- FAIL: Persisted `ProjectBundle` JSON can carry unsafe `html.normalized` after tampering/import. `parseProjectBundleJson` validates references but does not re-sanitize or reject script/local-resource HTML; `createStandaloneHtml` then exports it. Probe evidence: `persistAccepted:true`, `standaloneHasPersistedScript:true`.
- FAIL: Normal sanitization allows local/private resource URLs such as `file:` and `http://127.0.0.1` into standalone export HTML. Worker rendering aborts requests, but exported HTML/ZIP can still trigger local/private requests when opened. Evidence: `packages/editor-core/src/sanitize.ts`, `packages/editor-core/src/export.ts`.
- WARN: Public filesystem helpers are not boundary-safe if reused with untrusted inputs: `createRasterizedPptx` reads a caller-provided path and `exportAnimationMp4` writes a caller-provided output path. Current orchestrated callers are internal/trusted.
- PASS: ZIP entry traversal, worker output directory checks, and fixture load through persisted integrity validation are materially improved.

### Layer 2 - Guardrails

| Command | Result |
|---------|--------|
| `git status --short --branch --ahead-behind` | PASS: `## main...origin/main` before verification doc update |
| `git diff --check HEAD~1..HEAD && git diff --cached --check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `npx tsc --noEmit` | PASS |
| `pnpm --filter @kdesign/export-worker build && pnpm --filter @kdesign/export-worker test` | PASS: 1 file / 3 tests |
| `pnpm test` | PASS: 23 files / 135 tests |
| `pnpm e2e` | PASS: 30 browser tests |
| `node ~/.codex/sunco/bin/sunco-tools.cjs init phase-op 10` | PASS: context, research, plans, verification present |
| `node ~/.codex/sunco/bin/sunco-tools.cjs artifact-hash check` | PASS: changed false |

Environment:

- `node --version`: `v25.9.0`
- `pnpm --version`: `10.33.0`
- `npm --version`: `11.12.1`

### Layer 3 - BDD Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 10-01 shared Phase 10 ProjectBundle contract fields exist | PASS | `schemas.ts` contains Dev Mode, export, publish, roundtrip schemas and ProjectBundle arrays. |
| Dev Mode helpers derive inspect/code/readiness/diff/asset metadata from stored state | PASS | `dev-mode.ts` helpers exist; `phase-10-dev-mode.spec.ts` and unit tests pass. |
| Export/publish/roundtrip helpers create validated records without hosted-production overclaim | FAIL | Append helpers can accept detached invalid records; semantic revision/hash matching is incomplete. |
| Persisted Phase 10 corruption probes reject missing references/stale revisions/runtime mismatches | PARTIAL | Missing references are often rejected, but unsafe `html.normalized`, recomputed roundtrip snapshot tamper, artifact/job semantic mismatch, and signature hash mismatch can persist. |
| Handoff packages include Phase 10 records | PASS | `handoff.ts` includes Phase 10 surfaces; tests pass. |
| 10-02 export worker package builds and tests independently | PASS | `pnpm --filter @kdesign/export-worker build/test` pass. |
| Worker writes real HTML, ZIP, PNG, PDF, PPTX, GIF, and MP4 files from stored ProjectBundle state | PARTIAL | File materialization tests pass, but stored/exported HTML can preserve unsafe local/private resource URLs. |
| PPTX export supports rasterized slides and editable subset with diagnostics | PARTIAL | Editable subset mapping is improved, but `createRasterizedPptx` API does not match the planned raw-bytes contract. |
| Static publish preview is a server-portable `kdesign://publish/...` package | PASS | Publish preview tests and schema pass. |
| Code roundtrip package materialization validates against 10-01 shared contracts | FAIL | Recomputed-hash tampering of unlisted embedded ProjectBundle fields is accepted. |
| Worker writes UI-loadable `phase-10-worker-export-bundle.json` fixture from real worker output | PASS | Fixture parses through `parseProjectBundleJson`; worker contract test passes. |
| 10-03 Dev Mode panel exposes inspect/snippet/readiness/diff/asset workflows | PASS | Browser e2e passes. |
| Export/publish panel exposes export, publish, roundtrip, and fixture-load workflows | PASS | Browser e2e passes. |
| Web UI can load/display worker-created artifact records | PASS | Browser e2e passes and local fixture parses. |
| Top Export button is wired to stored-state export path | PASS | Browser tests and code path confirm non-inert top export. |
| Browser tests verify reload persistence and no horizontal overflow | PASS | 30 e2e tests pass including desktop/tablet/mobile overflow checks. |
| All plan smoke commands | PASS | Layer 2 commands pass. |

### Layer 4 - Permission Audit

- File access audit from `ab01718..HEAD` shows Phase 10 implementation, tests, worker package, fixture, planning summaries/checkpoints, verification docs, and hash updates.
- WARN: Support files outside the original plan file lists include `apps/export-worker/src/render.ts`, `apps/export-worker/src/gifenc.d.ts`, and `packages/editor-core/src/__tests__/handoff.test.ts`. These are reasonable for rendering/typing/handoff coverage but still scope expansion.
- WARN: `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/.hashes.json`, checkpoint files, summaries, and verification docs changed as SUNCO bookkeeping outside implementation file lists.
- Network/process scan over changed files found no app/package `fetch`, `axios`, `http.get`, `https.get`, `got`, or `ky` calls. It found `execFile` in `apps/export-worker/src/animation.ts`, which is expected for bundled ffmpeg MP4 generation.
- Secrets audit over `*.env`, `*.key`, `*.pem`, `*.secret`, `secrets*`, and `*credentials*` produced no diff output.
- Commit history is phase-scoped but includes repeated fix/doc commits because Phase 10 had multiple verification-remediation loops.

### Layer 5 - Adversarial

Result: FAIL.

Local probes:

| Probe | Result | Evidence |
|-------|--------|----------|
| Recomputed-hash `manifest.projectBundle.title` tamper on append | FAIL: ACCEPTED | `roundtrip_recomputed_hash_title_tamper_rejected_on_append: FAIL — accepted` |
| Recomputed-hash `manifest.projectBundle.title` tamper on persisted reload | FAIL: ACCEPTED | `roundtrip_recomputed_hash_title_tamper_rejected_on_reload: FAIL — accepted` |
| Detached export artifact append with missing job | FAIL: ACCEPTED | `append_export_artifact_missing_job_rejected: FAIL — accepted` |
| Detached publish preview append with missing artifact | FAIL: ACCEPTED | `append_publish_missing_artifact_rejected: FAIL — accepted` |
| `createRasterizedPptx` raw bytes API | FAIL | `type=[object Object] keys=data,diagnostics` |
| Persisted unsafe `html.normalized` with script/local URLs | FAIL: ACCEPTED | `persisted_html_script_rejected_or_stripped: FAIL — accepted=true` |
| Normal sanitize/export of local/private URLs | FAIL: ACCEPTED | `standaloneHasLocal=true standaloneHasFile=true` |
| Existing unsupported roundtrip operation | PASS | `unsupported-operation:reorderObject` rejected |
| Worker render requested resources | PASS | Requested `http://127.0.0.1` and `https://example.com` resources were aborted and diagnosed. |
| ZIP entry traversal | PASS | `../escape.txt` rejected. |
| Export output directory escape | PASS | Output outside approved roots rejected. |
| GIF export without animation template | PASS | Failed artifact with `animation-template-required`. |
| Worker fixture parse/hash/button/visual-diff smoke | PASS | Fixture parses, `projectBundleHash` exists, no `unsupported-pptx-node:button`, no self-equal visual-diff records. |

### Layer 6 - Cross-model

Result: FAIL.

Skeptical fallback review agreed with Layers 1 and 5, and added these structural gaps:

- Export artifact integrity checks job existence but not semantic match between artifact and job fields such as kind, viewport, filename, bytes, and source revision.
- Export verification records are not tied to artifact hashes; `signature: passed` with arbitrary wrong `expectedHash` / `actualHash` can survive as long as `artifactId` exists.
- Publish previews and roundtrip packages validate artifact ID existence but not artifact revision consistency with the preview/package source revision.
- Unsafe `html.normalized` remains trusted on reload/export and is also projected into preview `srcDoc`.
- `createRasterizedPptx` remains incompatible with the planned raw `Uint8Array` API.

### Layer 7 - Human Eval

SKIPPED. Automated layers failed, so human approval was not requested and must not override unresolved blockers.

## Issues to Fix

- [ ] Deep-validate the complete embedded roundtrip `manifest.projectBundle` against the stored/source bundle, not only selected fields and not a self-hash. Recomputed-hash tampering of title/metadata/non-selected fields must reject on append and persisted reload.
- [ ] Make `appendExportArtifact` and `appendPublishPreview` enforce full persisted integrity before returning, including missing job/artifact rejection.
- [ ] Add semantic integrity checks tying export artifacts to their jobs: kind, viewport, filename, bytes, source revision, and any other stored job contract fields that must match.
- [ ] Add semantic integrity checks tying `signature` verification hashes to the referenced artifact hash; invalid passed signatures must reject on append/reload.
- [ ] Ensure publish previews and code roundtrip packages only reference artifacts whose source revision matches the preview/package source revision.
- [ ] Fix persisted HTML safety: `parseProjectBundleJson` / integrity must reject or re-sanitize tampered `html.normalized` containing scripts, event handlers, forms, local/private resource URLs, or mismatches with sanitized/normalized state.
- [ ] Tighten normal sanitizer/export URL policy so standalone HTML/ZIP exports do not preserve `file:`, localhost, loopback, link-local, private IP, or other unsafe local/private resource URLs.
- [ ] Align `createRasterizedPptx` with the Phase 10 public API contract or explicitly revise the plan before verification; add tests proving the chosen contract.
- [ ] Harden public filesystem helpers or document and enforce trusted-only boundaries for `createRasterizedPptx` path reads and `exportAnimationMp4` output paths.
