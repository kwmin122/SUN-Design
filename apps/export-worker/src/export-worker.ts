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
  ProjectBundleSchema,
  serializeProjectBundle,
  type ExportKind,
  type PreviewDevice,
  type ProjectBundle
} from "@kdesign/editor-core";

import { createGifBytes, createMp4Bytes, ffmpegDiagnostic } from "./animation.js";
import { collectEditableSubsetDiagnostics, createPptxBytes, type PptxMode } from "./pptx.js";
import { renderBundlePreview, type RenderedBundlePreview } from "./render.js";
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
  const sourceBundle = current;
  const rendered = await renderBundlePreview(sourceBundle, path.join(input.outDir, ".render"));
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
    const bytes = await bytesForSpec(sourceBundle, spec, rendered, input.outDir);
    await writeFile(filePath, bytes);
    const sha256 = hashBytes(bytes);
    const artifactDiagnostics = diagnosticsForSpec(sourceBundle, spec, rendered);
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
      diagnostics: artifactDiagnostics,
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
      diagnostics: artifactDiagnostics
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

async function bytesForSpec(
  bundle: ProjectBundle,
  spec: ExportSpec,
  rendered: RenderedBundlePreview,
  outDir: string
): Promise<Uint8Array> {
  if (spec.kind === "html") {
    return encode(rendered.html);
  }
  if (spec.kind === "zip") {
    return createZipArchive({
      "index.html": rendered.html,
      "manifest.json": JSON.stringify({
        projectId: bundle.id,
        sourceRevision: bundle.baseRevision,
        sourceOfTruth: "ProjectBundle",
        render: rendered.diagnostics
      }, null, 2)
    });
  }
  if (spec.kind === "png") {
    return rendered.png;
  }
  if (spec.kind === "pdf") {
    return rendered.pdf;
  }
  if (spec.kind === "pptx") {
    return createPptxBytes(bundle, spec.pptxMode ?? "rasterized", {
      previewPng: rendered.png,
      renderDiagnostics: rendered.diagnostics
    });
  }
  if (spec.kind === "gif") {
    return createGifBytes(rendered.animationFrames);
  }
  return createMp4Bytes(rendered.animationFrames, path.join(outDir, ".render"));
}

function diagnosticsForSpec(
  bundle: ProjectBundle,
  spec: ExportSpec,
  rendered: RenderedBundlePreview
): string[] {
  if (spec.kind === "pptx" && spec.pptxMode === "editableSubset") {
    return [...spec.diagnostics, ...rendered.diagnostics, ...collectEditableSubsetDiagnostics(bundle)];
  }
  return [...spec.diagnostics, ...rendered.diagnostics];
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
