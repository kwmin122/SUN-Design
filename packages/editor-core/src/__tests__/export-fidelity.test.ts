import { describe, expect, it } from "vitest";

import { createExportJob } from "../export.js";
import {
  appendExportArtifact,
  appendPublishPreview,
  createExportArtifactRecord,
  createExportVerification,
  createPublishPreview,
  mimeTypeForKind
} from "../export-fidelity.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import { parseProjectBundleJson, serializeProjectBundle } from "../persistence.js";
import { ProjectBundleSchema } from "../schemas.js";

const NOW = "2026-04-29T00:00:00.000Z";

describe("export fidelity records", () => {
  it("creates export artifact and verification records linked to stored export jobs", () => {
    let bundle = normalizeHtml({
      id: "phase-10-export-fixture",
      title: "Phase 10 Export Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
    });
    const job = createExportJob({ bundle, kind: "html", viewport: "desktop", createdAt: NOW });
    bundle = ProjectBundleSchema.parse({ ...bundle, exportJobs: [job] });

    const artifact = createExportArtifactRecord(bundle, {
      jobId: job.id,
      kind: "html",
      filename: job.filename,
      bytes: job.bytes,
      sha256: "sha256-html",
      viewport: "desktop",
      filePath: "artifacts/index.html",
      createdAt: NOW
    });
    const verification = createExportVerification({
      artifactId: artifact.id,
      kind: "signature",
      expectedHash: "sha256-html",
      actualHash: "sha256-html",
      createdAt: NOW
    });
    bundle = appendExportArtifact(bundle, artifact, verification);

    expect(artifact.mimeType).toBe("text/html");
    expect(bundle.exportArtifacts[0]?.id).toBe(artifact.id);
    expect(bundle.exportVerifications[0]?.status).toBe("passed");
  });

  it("creates static publish previews that survive reload", () => {
    let bundle = normalizeHtml({
      id: "phase-10-publish-fixture",
      title: "Phase 10 Publish Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
    });
    const job = createExportJob({ bundle, kind: "zip", viewport: "mobile", createdAt: NOW });
    bundle = ProjectBundleSchema.parse({ ...bundle, exportJobs: [job] });
    const artifact = createExportArtifactRecord(bundle, {
      jobId: job.id,
      kind: "zip",
      filename: job.filename,
      bytes: 120,
      sha256: "sha256-zip",
      viewport: "mobile",
      filePath: "artifacts/site.zip",
      createdAt: NOW
    });
    bundle = appendExportArtifact(bundle, artifact);
    const preview = createPublishPreview(bundle, { artifactIds: [artifact.id], createdAt: NOW });
    bundle = appendPublishPreview(bundle, preview);

    const parsed = parseProjectBundleJson(serializeProjectBundle(bundle));
    expect(parsed.publishPreviews[0]?.url).toMatch(/^kdesign:\/\/publish\/phase-10-publish-fixture\/publish_/);
    expect(parsed.publishPreviews[0]?.artifactIds).toEqual([artifact.id]);
  });

  it("rejects stale artifact revisions and missing artifact publish previews", () => {
    const bundle = normalizeHtml({
      id: "phase-10-export-negative",
      title: "Phase 10 Export Negative",
      html: BASIC_LANDING_FIXTURE_HTML
    });
    const job = createExportJob({ bundle, kind: "pdf", viewport: "tablet", createdAt: NOW });
    const withJob = ProjectBundleSchema.parse({ ...bundle, exportJobs: [job] });

    expect(() => createExportArtifactRecord(withJob, {
      jobId: job.id,
      kind: "pdf",
      filename: job.filename,
      bytes: 12,
      sha256: "sha256-pdf",
      sourceRevision: "stale",
      viewport: "tablet",
      filePath: "artifacts/file.pdf",
      createdAt: NOW
    })).toThrow("source revision is stale");
    expect(() => createPublishPreview(withJob, { artifactIds: ["missing_artifact"], createdAt: NOW }))
      .toThrow("missing artifact");
  });

  it("maps animation export kinds to concrete MIME types", () => {
    expect(mimeTypeForKind("gif")).toBe("image/gif");
    expect(mimeTypeForKind("mp4")).toBe("video/mp4");
  });
});
