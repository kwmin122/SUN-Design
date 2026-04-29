import { describe, expect, it } from "vitest";

import {
  appendCodeRoundtripImport,
  appendCodeRoundtripPackage,
  createCodeRoundtripPackage,
  validateCodeRoundtripImport
} from "../code-roundtrip.js";
import { createExportJob } from "../export.js";
import { appendExportArtifact, createExportArtifactRecord } from "../export-fidelity.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import { parseProjectBundleJson, serializeProjectBundle } from "../persistence.js";
import { ProjectBundleSchema } from "../schemas.js";

const NOW = "2026-04-29T00:00:00.000Z";

function createBundleWithArtifact() {
  let bundle = normalizeHtml({
    id: "phase-10-roundtrip-fixture",
    title: "Phase 10 Roundtrip Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  });
  const job = createExportJob({ bundle, kind: "zip", viewport: "desktop", createdAt: NOW });
  bundle = ProjectBundleSchema.parse({ ...bundle, exportJobs: [job] });
  const artifact = createExportArtifactRecord(bundle, {
    jobId: job.id,
    kind: "zip",
    filename: job.filename,
    bytes: 512,
    sha256: "sha256-roundtrip",
    viewport: "desktop",
    filePath: "artifacts/roundtrip.zip",
    createdAt: NOW
  });
  return appendExportArtifact(bundle, artifact);
}

describe("code roundtrip packages", () => {
  it("creates portable runtime packages from export artifacts", () => {
    let bundle = createBundleWithArtifact();
    const artifactId = bundle.exportArtifacts[0]!.id;
    const roundtripPackage = createCodeRoundtripPackage(bundle, {
      runtime: "codex",
      artifactIds: [artifactId],
      createdAt: NOW
    });
    bundle = appendCodeRoundtripPackage(bundle, roundtripPackage);

    expect(roundtripPackage.runtime).toBe("codex");
    expect(roundtripPackage.manifestJson).toContain("\"sourceOfTruth\": \"ProjectBundle\"");
    expect(bundle.codeRoundtripPackages[0]?.artifactIds).toEqual([artifactId]);
  });

  it("validates roundtrip imports and records source revision conflicts", () => {
    let bundle = createBundleWithArtifact();
    const artifactId = bundle.exportArtifacts[0]!.id;
    const roundtripPackage = createCodeRoundtripPackage(bundle, {
      runtime: "claudeCode",
      artifactIds: [artifactId],
      createdAt: NOW
    });
    bundle = appendCodeRoundtripPackage(bundle, roundtripPackage);

    const result = validateCodeRoundtripImport(bundle, {
      packageId: roundtripPackage.id,
      runtime: "claudeCode",
      sourceRevision: "stale-revision",
      createdAt: NOW
    });
    bundle = appendCodeRoundtripImport(bundle, result);

    expect(result.status).toBe("conflict");
    expect(result.diagnostics).toContain("source-revision-mismatch");
    expect(parseProjectBundleJson(serializeProjectBundle(bundle)).codeRoundtripImports[0]?.status).toBe("conflict");
  });

  it("rejects missing artifacts and invalid import operation references", () => {
    const bundle = createBundleWithArtifact();
    expect(() => createCodeRoundtripPackage(bundle, {
      runtime: "codex",
      artifactIds: ["missing_artifact"],
      createdAt: NOW
    })).toThrow("missing artifact");

    const roundtripPackage = createCodeRoundtripPackage(bundle, {
      runtime: "codex",
      artifactIds: [bundle.exportArtifacts[0]!.id],
      createdAt: NOW
    });
    const withPackage = appendCodeRoundtripPackage(bundle, roundtripPackage);
    const result = validateCodeRoundtripImport(withPackage, {
      packageId: roundtripPackage.id,
      runtime: "cursor",
      sourceRevision: withPackage.baseRevision,
      operationIds: ["missing_operation"],
      createdAt: NOW
    });

    expect(result.status).toBe("rejected");
    expect(result.diagnostics).toContain("runtime-mismatch:cursor:codex");
    expect(result.diagnostics).toContain("missing-operation:missing_operation");
  });
});
