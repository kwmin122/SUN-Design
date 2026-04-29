# Phase 10 Verification Results

Generated: 2026-04-29T22:52:15+09:00

## Summary

| Layer | Name | Result | Notes |
|-------|------|--------|-------|
| 1 | Multi-agent review | FAIL | Both correctness and security reviewers found remaining Phase 10 contract breaches. |
| 2 | Guardrails | PASS | lint, typecheck, tsc, unit tests, export-worker tests, and browser e2e all pass. |
| 3 | BDD criteria | FAIL | Core happy paths pass, but several explicit plan acceptance criteria are not met. |
| 4 | Permission audit | WARN | No secrets or direct code-level HTTP clients found; support files and planning docs expanded beyond plan file lists. |
| 5 | Adversarial | FAIL | Local probes reproduced manifest tamper acceptance and export-render network access. |
| 6 | Cross-model | FAIL | Skeptical fallback review agrees the remaining issues are structural, not just test gaps. |
| 7 | Human eval | SKIPPED | Automated layers failed, so human approval was not requested. |

## Overall: NEEDS FIXES

Phase 10 must not proceed to `/sunco:ship 10`. Fix the issues listed below, then re-run `/sunco:verify 10`.

## Layer Details

### Layer 1 - Multi-Agent Review

**Agent 1 (implementation correctness): FAIL**

- FAIL: Code roundtrip deep manifest validation is incomplete. The validator accepts a tampered `manifest.projectBundle.html.normalized` because it checks only selected embedded fields rather than the full serialized `ProjectBundle` snapshot. Evidence: `packages/editor-core/src/code-roundtrip.ts`, plan requirement in `10-01-PLAN.md`.
- FAIL: Worker fixture integrity is not guaranteed. The worker test writes `.tmp-export-worker/phase-10/phase-10-worker-export-bundle.json`, while the web UI imports the committed `apps/web/tests/fixtures/phase-10-worker-export-bundle.json`; generated and committed fixtures can drift. Evidence: `apps/export-worker/src/__tests__/export-worker.test.ts`, `apps/web/components/editor-shell.tsx`.
- FAIL: Browser GIF/MP4 export bypasses the animation-template gate. The worker rejects missing animation templates, but web export buttons call the generic `createExport("gif" | "mp4")` path and create degraded records without `animation-template-required`. Evidence: `apps/web/components/editor-shell.tsx`.
- FAIL: Editable PPTX subset does not match the plan. The plan requires `vectorLike` / `button` / `frame` as simple rectangle shapes and a public `createRasterizedPptx(...)`; implementation maps text/image/frame/block and tests assert `unsupported-pptx-node:button`.
- WARN: Worker visual-diff records currently compare the current render hash to itself.
- WARN: Browser-created non-PPTX export records do not consistently include `web-local-record`.

**Agent 2 (security and resilience): FAIL**

- FAIL: Persisted code roundtrip package manifests accept tampered `projectBundle` fields outside the checked subset. Probe result from the agent: `PERSIST_ACCEPTED_HTML_TAMPER`.
- FAIL: Export rendering can perform local/external network requests from untrusted stored HTML. Normal `http(s)` image `src` values survive into standalone HTML, and Playwright `setContent` does not block requests.
- FAIL: `visual-diff` verification is not independent proof; expected and actual hashes come from the same current render value.
- WARN: Worker fixture loading uses `ProjectBundleSchema.parse` instead of `parseProjectBundleJson`, bypassing normal persisted integrity validation at the UI load boundary.
- PASS: ZIP entries, output file paths, fixture paths, MP4 timeout/error wrapping, GIF/MP4 worker template gate, and unsafe roundtrip payload tests are materially improved.

### Layer 2 - Guardrails

Fresh commands run:

| Command | Result |
|---------|--------|
| `git diff --check ab01718..HEAD && git diff --cached --check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `npx tsc --noEmit` | PASS |
| `pnpm --filter @kdesign/export-worker build` | PASS |
| `pnpm --filter @kdesign/export-worker test` | PASS: 1 file / 2 tests |
| `pnpm --filter @kdesign/editor-core exec vitest run src/__tests__/dev-mode.test.ts src/__tests__/export-fidelity.test.ts src/__tests__/code-roundtrip.test.ts src/__tests__/persistence.test.ts` | PASS: 4 files / 31 tests |
| `pnpm test` | PASS: 23 files / 134 tests |
| `pnpm e2e` | PASS: 30 browser tests |
| `node ~/.codex/sunco/bin/sunco-tools.cjs init phase-op 10` | PASS: context, research, plans, verification present |
| `node ~/.codex/sunco/bin/sunco-tools.cjs artifact-hash check` | PASS: changed false |

### Layer 3 - BDD Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 10-01 shared ProjectBundle contract fields exist | PASS | Required schemas and default arrays exist in `packages/editor-core/src/schemas.ts`. |
| 10-01 Dev Mode helpers derive inspect/code/readiness/diff/asset metadata from stored state | PASS | `dev-mode.ts` helpers exist and targeted tests pass. |
| 10-01 export/publish/roundtrip helpers create validated records | PARTIAL | Helpers exist, but roundtrip package manifest validation is not full-snapshot deep validation. |
| 10-01 persisted corruption probes reject missing references/stale revisions/runtime mismatches | PARTIAL | Many probes pass, but persisted `manifest.projectBundle.html.normalized` tamper is accepted. |
| 10-01 handoff packages include Phase 10 records | PASS | `handoff.ts` includes Phase 10 surfaces; tests pass. |
| 10-02 export worker package builds and tests independently | PASS | `pnpm --filter @kdesign/export-worker build/test` pass. |
| 10-02 worker writes real HTML, ZIP, PNG, PDF, PPTX, GIF, and MP4 files from stored state | PARTIAL | File signatures pass, but export render can still load external/local URLs from untrusted HTML. |
| 10-02 PPTX supports rasterized slides and editable subset | PARTIAL | PPTX files exist, but `createRasterizedPptx(...)` public API is missing and button/vector-like simple shape mapping is not implemented. |
| 10-02 static publish preview is `kdesign://publish/...` | PASS | Publish schema/tests verify `kdesign://publish/...`. |
| 10-02 code roundtrip package materialization validates 10-01 contracts | FAIL | Full embedded `projectBundle` tamper is accepted. |
| 10-02 worker writes UI-loadable fixture from real worker output | PARTIAL | A committed fixture exists and parses, but worker tests write a temp fixture, not the committed fixture path. |
| 10-03 Dev Mode panel exposes inspect/snippet/readiness/diff/asset workflows | PASS | `phase-10-dev-mode.spec.ts` passes. |
| 10-03 export/publish panel exposes export/publish/roundtrip flows | PARTIAL | UI flows exist, but GIF/MP4 web records bypass animation-template eligibility and some browser-created records miss `web-local-record`. |
| 10-03 web UI loads worker fixture records | PARTIAL | UI loads records, but uses `ProjectBundleSchema.parse` rather than `parseProjectBundleJson`. |
| 10-03 top Export button is wired | PASS | Top export creates stored export records. |
| 10-03 reload persistence and responsive overflow checks | PASS | Browser e2e passes desktop/tablet/mobile overflow checks. |
| All plan smoke commands | PASS | Layer 2 commands pass. |

### Layer 4 - Permission Audit

- `git diff ab01718..HEAD --name-only` shows expected Phase 10 implementation, tests, export-worker package files, fixture, planning summaries/checkpoints, status docs, and hash updates.
- WARN: `apps/export-worker/src/render.ts`, `apps/export-worker/src/gifenc.d.ts`, and `packages/editor-core/src/__tests__/handoff.test.ts` are support files outside the original explicit file lists. They are reasonable for rendering/typing/handoff proof, but remain scope expansion.
- WARN: `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/.hashes.json`, summaries, checkpoints, and verification docs changed as bookkeeping outside implementation plan file lists.
- Secrets audit produced no output for `*.env`, `*.key`, `*.pem`, `*.secret`, `secrets*`, or `*credentials*`.
- Static direct network-call scan found no `fetch(`, `axios.`, `http.get`, `https.get`, `got(`, or `ky.` in `apps` / `packages`. This does not clear the Playwright resource-load issue from Layer 5.
- Git status before this verification document update: `## main...origin/main`.

### Layer 5 - Adversarial

Result: FAIL.

Local probes:

| Probe | Result | Evidence |
|-------|--------|----------|
| `manifest.projectBundle.html.normalized` tamper on append | FAIL: ACCEPTED | Probe output: `append_html_tamper: ACCEPTED`. |
| `manifest.projectBundle.html.normalized` tamper on persisted reload | FAIL: ACCEPTED | Probe output: `reload_html_tamper: ACCEPTED`. |
| Export standalone HTML preserves local URL | FAIL: ACCEPTED | Probe output: `standalone_contains_local_url: true`. |
| Playwright export render requests local URL | FAIL: REQUESTED | Probe output: `local_request_count: 1` for `http://127.0.0.1:9/private.png`. |
| Deep canvasGraph/exportArtifact manifest tamper | PASS | Targeted tests now reject those specific fields. |
| Unsafe ZIP entry path | PASS | Worker test rejects `../escape.txt`. |
| Unsafe export output directory | PASS | Worker test rejects output outside approved roots. |
| GIF export with no animation template in worker | PASS | Worker returns failed verification with `animation-template-required`. |

### Layer 6 - Cross-Model

Result: FAIL.

Additional cross-model agent spawn was blocked by the active agent thread limit, so this layer used the workflow's skeptical fallback. The fallback did not introduce new categories beyond Layers 1 and 5, but it agrees these are structural blockers:

- Full `ProjectBundle` roundtrip snapshot validation is still incomplete.
- Export render must be local-first and deterministic; untrusted HTML resource requests break that boundary.
- Current `visual-diff` records are self-comparisons and should not be claimed as deterministic visual-diff verification.
- Phase 10 is still a strong foundation, but not yet at the claimed export fidelity contract level.

### Layer 7 - Human Eval

SKIPPED. Automated layers failed, so human approval was not requested and must not override unresolved blockers.

## Issues to Fix

- [ ] Deep-validate the complete embedded `manifest.projectBundle` snapshot, not only selected fields. Add regression tests for `projectBundle.html.normalized` and other non-selected-field tampering on append and persisted reload.
- [ ] Block or rewrite all external/local resource loads during export-worker Playwright rendering. At minimum, abort network requests and add tests for `127.0.0.1`, private IPs, and external image/script/style URLs.
- [ ] Replace self-comparison `visual-diff` records with a deterministic baseline/actual comparison, or revise the Phase 10 contract before marking EXP-10 verified.
- [ ] Make worker fixture generation hermetic against the committed `apps/web/tests/fixtures/phase-10-worker-export-bundle.json`, or add an equality check proving the committed fixture equals worker output.
- [ ] Load worker fixture records in the web UI through `parseProjectBundleJson` / integrity validation, not raw `ProjectBundleSchema.parse`.
- [ ] Apply the animation-template gate to browser GIF/MP4 export actions; missing template should create failed/degraded records with `animation-template-required`, not a normal worker-required artifact.
- [ ] Implement the planned `createRasterizedPptx(...)` public API.
- [ ] Update editable PPTX subset behavior so `vectorLike`, `button`, and `frame` nodes map to simple rectangle shapes; do not assert `unsupported-pptx-node:button` as the expected behavior.
- [ ] Ensure every browser-created export record includes `web-local-record` diagnostics where the plan requires it.
