import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  appendCodeRoundtripPackage,
  appendExportArtifact,
  appendPublishPreview,
  createCodeRoundtripPackage,
  createExportArtifactRecord,
  createExportJob,
  createExportVerification,
  createPublishPreview,
  createStandaloneHtml,
  ProjectBundleSchema,
  serializeProjectBundle,
  type ExportKind,
  type PreviewDevice,
  type ProjectBundle
} from "@kdesign/editor-core";

import { createGifBytes, createMp4Bytes, ffmpegDiagnostic } from "./animation.js";
import { createPptxBytes, type PptxMode } from "./pptx.js";
import { createZipArchive } from "./zip.js";

export type ExportWorkerArtifact = {
  kind: ExportKind;
  filename: string;
  filePath: string;
  bytes: number;
  sha256: string;
  diagnostics: string[];
};

export type ExportWorkerResult = {
  bundle: ProjectBundle;
  artifacts: ExportWorkerArtifact[];
  manifestPath: string;
};

type ExportSpec = {
  id: string;
  kind: ExportKind;
  viewport: PreviewDevice;
  filename: string;
  diagnostics: string[];
  pptxMode?: PptxMode;
};

const EXPORT_SPECS: ExportSpec[] = [
  { id: "html", kind: "html", viewport: "desktop", filename: "index.html", diagnostics: ["worker-created", "html-standalone"] },
  { id: "zip", kind: "zip", viewport: "desktop", filename: "site.zip", diagnostics: ["worker-created", "static-package"] },
  { id: "png", kind: "png", viewport: "desktop", filename: "preview.png", diagnostics: ["worker-created", "preview-raster"] },
  { id: "pdf", kind: "pdf", viewport: "desktop", filename: "preview.pdf", diagnostics: ["worker-created", "pdf-print"] },
  { id: "pptx-raster", kind: "pptx", viewport: "desktop", filename: "slides-raster.pptx", diagnostics: ["worker-created", "pptx-mode:rasterized"], pptxMode: "rasterized" },
  { id: "pptx-editable", kind: "pptx", viewport: "desktop", filename: "slides-editable.pptx", diagnostics: ["worker-created", "pptx-mode:editableSubset"], pptxMode: "editableSubset" },
  { id: "gif", kind: "gif", viewport: "desktop", filename: "animation.gif", diagnostics: ["worker-created", "animation-gif"] },
  { id: "mp4", kind: "mp4", viewport: "desktop", filename: "animation.mp4", diagnostics: ["worker-created", "animation-mp4", ffmpegDiagnostic()] }
];

export async function materializePhase10Exports(input: {
  bundle: ProjectBundle;
  outDir: string;
  createdAt?: string;
}): Promise<ExportWorkerResult> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  await mkdir(input.outDir, { recursive: true });
  let current = ProjectBundleSchema.parse(input.bundle);
  const artifacts: ExportWorkerArtifact[] = [];

  for (const spec of EXPORT_SPECS) {
    const jobCreatedAt = `${createdAt}:${spec.id}`;
    const job = createExportJob({
      bundle: current,
      kind: spec.kind,
      viewport: spec.viewport,
      createdAt: jobCreatedAt
    });
    const filePath = path.join(input.outDir, spec.filename);
    const bytes = bytesForSpec(current, spec);
    await writeFile(filePath, bytes);
    const sha256 = hashBytes(bytes);
    current = ProjectBundleSchema.parse({
      ...current,
      exportJobs: [{ ...job, filename: spec.filename, bytes: bytes.byteLength }, ...current.exportJobs]
    });
    const artifact = createExportArtifactRecord(current, {
      jobId: job.id,
      kind: spec.kind,
      filename: spec.filename,
      bytes: bytes.byteLength,
      sha256,
      viewport: spec.viewport,
      filePath,
      diagnostics: spec.diagnostics,
      createdAt: jobCreatedAt
    });
    const signature = createExportVerification({
      artifactId: artifact.id,
      kind: "signature",
      expectedHash: sha256,
      actualHash: sha256,
      createdAt: jobCreatedAt
    });
    current = appendExportArtifact(current, artifact, signature);
    artifacts.push({
      kind: spec.kind,
      filename: spec.filename,
      filePath,
      bytes: bytes.byteLength,
      sha256,
      diagnostics: spec.diagnostics
    });
  }

  const manifestPath = path.join(input.outDir, "manifest.json");
  const manifest = {
    projectId: current.id,
    sourceRevision: current.baseRevision,
    artifacts
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const manifestVerification = current.exportArtifacts[0]
    ? createExportVerification({
      artifactId: current.exportArtifacts[0].id,
      kind: "manifest",
      status: "passed",
      diagnostics: [`manifest:${manifestPath}`],
      createdAt
    })
    : undefined;
  if (manifestVerification) {
    current = ProjectBundleSchema.parse({
      ...current,
      exportVerifications: [manifestVerification, ...current.exportVerifications]
    });
  }

  const artifactIds = current.exportArtifacts.map((artifact) => artifact.id);
  const preview = createPublishPreview(current, {
    artifactIds,
    viewports: ["desktop"],
    diagnostics: ["static-local-preview", "worker-created"],
    createdAt
  });
  current = appendPublishPreview(current, preview);
  const roundtripPackage = createCodeRoundtripPackage(current, {
    runtime: "codex",
    artifactIds,
    createdAt
  });
  current = appendCodeRoundtripPackage(current, roundtripPackage);

  return {
    bundle: current,
    artifacts,
    manifestPath
  };
}

export async function writeWorkerBundleFixture(input: {
  bundle: ProjectBundle;
  outDir: string;
  fixturePath: string;
  createdAt?: string;
}): Promise<ExportWorkerResult> {
  const result = await materializePhase10Exports({
    bundle: input.bundle,
    outDir: input.outDir,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
  await mkdir(path.dirname(input.fixturePath), { recursive: true });
  await writeFile(input.fixturePath, `${serializeProjectBundle(result.bundle)}\n`);
  return result;
}

function bytesForSpec(bundle: ProjectBundle, spec: ExportSpec): Uint8Array {
  if (spec.kind === "html") {
    return encode(createStandaloneHtml(bundle));
  }
  if (spec.kind === "zip") {
    return createZipArchive({
      "index.html": createStandaloneHtml(bundle),
      "manifest.json": JSON.stringify({
        projectId: bundle.id,
        sourceRevision: bundle.baseRevision,
        sourceOfTruth: "ProjectBundle"
      }, null, 2)
    });
  }
  if (spec.kind === "png") {
    return Uint8Array.from(Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    ));
  }
  if (spec.kind === "pdf") {
    return encode(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 960 540]/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 24 Tf 72 460 Td (${escapePdf(bundle.title)}) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
trailer<</Root 1 0 R/Size 5>>
startxref
0
%%EOF`);
  }
  if (spec.kind === "pptx") {
    return createPptxBytes(bundle, spec.pptxMode ?? "rasterized");
  }
  if (spec.kind === "gif") {
    return createGifBytes();
  }
  return createMp4Bytes();
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function escapePdf(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}
