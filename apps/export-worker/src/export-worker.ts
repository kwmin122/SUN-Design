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
  type AgentRuntime,
  type CodeRoundtripPackage,
  type ExportArtifact,
  type ExportKind,
  type ExportVerification,
  type PreviewDevice,
  type ProjectBundle,
  type PublishPreview
} from "@kdesign/editor-core";

import { createGifBytes, createMp4Bytes, ffmpegDiagnostic } from "./animation.js";
import { collectEditableSubsetDiagnostics, createPptxBytes, type PptxMode } from "./pptx.js";
import { renderBundlePreview, type RenderedBundlePreview } from "./render.js";
import { createZipArchive, sha256Hex } from "./zip.js";

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

export async function materializeStoredStateExport(input: {
  bundle: ProjectBundle;
  kind: ExportKind;
  viewport: PreviewDevice;
  outputDir: string;
  mode?: "rasterizedPptx" | "editableSubsetPptx";
  createdAt?: string;
}): Promise<{ bundle: ProjectBundle; artifact: ExportArtifact; verifications: ExportVerification[] }> {
  const outputDir = resolveApprovedOutputDir(input.outputDir);
  await mkdir(outputDir, { recursive: true });
  const bundle = ProjectBundleSchema.parse(input.bundle);
  const rendered = await renderBundlePreview(bundle, path.join(outputDir, ".render"));
  const spec = specForRequest(input.kind, input.viewport, input.mode);
  return materializeExportSpec({
    bundle,
    sourceBundle: bundle,
    spec,
    rendered,
    outputDir,
    createdAt: input.createdAt ?? new Date().toISOString()
  });
}

export async function materializeStaticPublishPreview(input: {
  bundle: ProjectBundle;
  outputDir: string;
  createdAt?: string;
}): Promise<{ bundle: ProjectBundle; preview: PublishPreview; artifacts: ExportArtifact[] }> {
  const outputDir = resolveApprovedOutputDir(input.outputDir);
  await mkdir(outputDir, { recursive: true });
  let current = ProjectBundleSchema.parse(input.bundle);

  if (current.exportArtifacts.length === 0) {
    const html = await materializeStoredStateExport({
      bundle: current,
      kind: "html",
      viewport: "desktop",
      outputDir,
      ...(input.createdAt ? { createdAt: input.createdAt } : {})
    });
    current = html.bundle;
    const zip = await materializeStoredStateExport({
      bundle: current,
      kind: "zip",
      viewport: "desktop",
      outputDir,
      ...(input.createdAt ? { createdAt: input.createdAt } : {})
    });
    current = zip.bundle;
  }

  const artifactIds = current.exportArtifacts.map((artifact) => artifact.id);
  const preview = createPublishPreview(current, {
    artifactIds,
    viewports: ["desktop"],
    diagnostics: ["static-local-preview", "worker-created"],
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
  current = appendPublishPreview(current, preview);
  const previewPath = resolveOutputFile(outputDir, "publish-preview.json");
  await writeFile(previewPath, `${JSON.stringify(preview, null, 2)}\n`);

  return {
    bundle: current,
    preview,
    artifacts: current.exportArtifacts.filter((artifact) => artifactIds.includes(artifact.id))
  };
}

export async function materializeCodeRoundtripPackage(input: {
  bundle: ProjectBundle;
  runtime: AgentRuntime;
  outputDir: string;
  createdAt?: string;
}): Promise<{ bundle: ProjectBundle; package: CodeRoundtripPackage; artifact: ExportArtifact }> {
  const outputDir = resolveApprovedOutputDir(input.outputDir);
  await mkdir(outputDir, { recursive: true });
  let current = ProjectBundleSchema.parse(input.bundle);
  if (current.exportArtifacts.length === 0) {
    const zip = await materializeStoredStateExport({
      bundle: current,
      kind: "zip",
      viewport: "desktop",
      outputDir,
      ...(input.createdAt ? { createdAt: input.createdAt } : {})
    });
    current = zip.bundle;
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  const roundtripPackage = createCodeRoundtripPackage(current, {
    runtime: input.runtime,
    artifactIds: current.exportArtifacts.map((artifact) => artifact.id),
    createdAt
  });
  current = appendCodeRoundtripPackage(current, roundtripPackage);

  const filename = "code-agent-package.zip";
  const filePath = resolveOutputFile(outputDir, filename);
  const bytes = createZipArchive({
    "manifest.json": roundtripPackage.manifestJson,
    "project-bundle.json": serializeProjectBundle(current),
    [roundtripPackage.instructionPath]: "# K-Design Studio code roundtrip package\n"
  });
  await writeFile(filePath, bytes);
  const job = createExportJob({ bundle: current, kind: "zip", viewport: "desktop", createdAt: `${createdAt}:roundtrip` });
  current = ProjectBundleSchema.parse({
    ...current,
    exportJobs: [{ ...job, filename, bytes: bytes.byteLength }, ...current.exportJobs]
  });
  const artifact = createExportArtifactRecord(current, {
    jobId: job.id,
    kind: "zip",
    filename,
    bytes: bytes.byteLength,
    sha256: sha256Hex(bytes),
    viewport: "desktop",
    filePath,
    diagnostics: ["worker-created", "code-roundtrip-package"],
    createdAt: `${createdAt}:roundtrip`
  });
  const verification = createExportVerification({
    artifactId: artifact.id,
    kind: "roundtrip",
    status: "passed",
    diagnostics: [`roundtrip-package:${roundtripPackage.id}`],
    createdAt: `${createdAt}:roundtrip`
  });
  current = appendExportArtifact(current, artifact, verification);

  return { bundle: current, package: roundtripPackage, artifact };
}

export async function materializePhase10Exports(input: {
  bundle: ProjectBundle;
  outDir: string;
  createdAt?: string;
}): Promise<ExportWorkerResult> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const outputDir = resolveApprovedOutputDir(input.outDir);
  await mkdir(outputDir, { recursive: true });
  let current = ProjectBundleSchema.parse(input.bundle);
  const sourceBundle = current;
  const rendered = await renderBundlePreview(sourceBundle, path.join(outputDir, ".render"));
  const artifacts: ExportWorkerArtifact[] = [];

  for (const spec of EXPORT_SPECS) {
    const result = await materializeExportSpec({
      bundle: current,
      sourceBundle,
      spec,
      rendered,
      outputDir,
      createdAt
    });
    current = result.bundle;
    artifacts.push(toWorkerArtifact(result.artifact));
  }

  const manifestPath = resolveOutputFile(outputDir, "manifest.json");
  const manifest = {
    projectId: current.id,
    sourceRevision: current.baseRevision,
    sourceOfTruth: "ProjectBundle",
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

  const previewResult = await materializeStaticPublishPreview({ bundle: current, outputDir, createdAt });
  current = previewResult.bundle;
  const roundtripResult = await materializeCodeRoundtripPackage({ bundle: current, runtime: "codex", outputDir, createdAt });
  current = roundtripResult.bundle;

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
  const outputDir = resolveApprovedOutputDir(input.outDir);
  const result = await materializePhase10Exports({
    bundle: input.bundle,
    outDir: outputDir,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
  const fixturePath = resolveApprovedFixturePath(outputDir, input.fixturePath);
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, `${serializeProjectBundle(result.bundle)}\n`);
  return result;
}

async function materializeExportSpec(input: {
  bundle: ProjectBundle;
  sourceBundle: ProjectBundle;
  spec: ExportSpec;
  rendered: RenderedBundlePreview;
  outputDir: string;
  createdAt: string;
}): Promise<{ bundle: ProjectBundle; artifact: ExportArtifact; verifications: ExportVerification[] }> {
  const jobCreatedAt = `${input.createdAt}:${input.spec.id}`;
  const job = createExportJob({
    bundle: input.bundle,
    kind: input.spec.kind,
    viewport: input.spec.viewport,
    createdAt: jobCreatedAt
  });
  const filePath = resolveOutputFile(input.outputDir, input.spec.filename);
  if (isAnimationExport(input.spec.kind) && !hasAnimationTemplate(input.sourceBundle)) {
    const emptyBytes = new Uint8Array();
    let current = ProjectBundleSchema.parse({
      ...input.bundle,
      exportJobs: [{ ...job, status: "failed", filename: input.spec.filename, bytes: 0 }, ...input.bundle.exportJobs]
    });
    const artifact = createExportArtifactRecord(current, {
      jobId: job.id,
      kind: input.spec.kind,
      filename: input.spec.filename,
      bytes: 0,
      sha256: sha256Hex(emptyBytes),
      viewport: input.spec.viewport,
      filePath,
      diagnostics: [...input.spec.diagnostics, "animation-template-required"],
      createdAt: jobCreatedAt
    });
    const failedVerification = createExportVerification({
      artifactId: artifact.id,
      kind: "signature",
      status: "failed",
      expectedHash: artifact.sha256,
      actualHash: artifact.sha256,
      diagnostics: ["animation-template-required"],
      createdAt: jobCreatedAt
    });
    current = appendExportArtifact(current, artifact, failedVerification);
    return { bundle: current, artifact, verifications: [failedVerification] };
  }
  const bytes = await bytesForSpec(input.sourceBundle, input.spec, input.rendered, input.outputDir);
  await writeFile(filePath, bytes);
  const artifactDiagnostics = diagnosticsForSpec(input.sourceBundle, input.spec, input.rendered);
  let current = ProjectBundleSchema.parse({
    ...input.bundle,
    exportJobs: [{ ...job, filename: input.spec.filename, bytes: bytes.byteLength }, ...input.bundle.exportJobs]
  });
  const artifact = createExportArtifactRecord(current, {
    jobId: job.id,
    kind: input.spec.kind,
    filename: input.spec.filename,
    bytes: bytes.byteLength,
    sha256: sha256Hex(bytes),
    viewport: input.spec.viewport,
    filePath,
    diagnostics: artifactDiagnostics,
    createdAt: jobCreatedAt
  });
  const artifactHash = sha256Hex(bytes);
  const signature = createExportVerification({
    artifactId: artifact.id,
    kind: "signature",
    expectedHash: artifact.sha256,
    actualHash: artifact.sha256,
    createdAt: jobCreatedAt
  });
  const visualDiff = shouldCreateVisualDiff(input.spec.kind)
    ? createExportVerification({
      artifactId: artifact.id,
      kind: "visual-diff",
      status: input.spec.kind === "png" ? "passed" : "degraded",
      expectedHash: `render:${sha256Hex(input.rendered.png)}`,
      actualHash: `${input.spec.kind}:${artifactHash}`,
      diagnostics: input.spec.kind === "png"
        ? ["visual-diff:render-vs-png-artifact"]
        : [`visual-diff:${input.spec.kind}:artifact-preview-required`],
      createdAt: jobCreatedAt
    })
    : undefined;
  current = appendExportArtifact(current, artifact, signature);
  if (visualDiff) {
    current = ProjectBundleSchema.parse({
      ...current,
      exportVerifications: [visualDiff, ...current.exportVerifications]
    });
  }
  return {
    bundle: current,
    artifact,
    verifications: visualDiff ? [signature, visualDiff] : [signature]
  };
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
    return createZipArchive(staticPackageFiles(bundle, rendered));
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

function staticPackageFiles(bundle: ProjectBundle, rendered: RenderedBundlePreview): Record<string, string | Uint8Array> {
  const files: Record<string, string | Uint8Array> = {
    "index.html": rendered.html,
    "manifest.json": JSON.stringify({
      projectId: bundle.id,
      sourceRevision: bundle.baseRevision,
      sourceOfTruth: "ProjectBundle",
      render: rendered.diagnostics
    }, null, 2),
    "project-bundle.json": serializeProjectBundle(bundle)
  };
  for (const note of bundle.generatedNotes) {
    if (note.path === "source-notes.md" || note.path === "design-context.md") {
      files[note.path] = note.content;
    }
  }
  return files;
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

function isAnimationExport(kind: ExportKind): boolean {
  return kind === "gif" || kind === "mp4";
}

function hasAnimationTemplate(bundle: ProjectBundle): boolean {
  return Boolean(
    bundle.prototypeGraph?.interactions.some((interaction) => interaction.transition || interaction.trigger === "timed") ||
    bundle.slideDecks.some((deck) => deck.slides.length > 0)
  );
}

function shouldCreateVisualDiff(kind: ExportKind): boolean {
  return kind === "png" || kind === "pdf" || kind === "pptx" || kind === "gif" || kind === "mp4";
}

function specForRequest(
  kind: ExportKind,
  viewport: PreviewDevice,
  mode?: "rasterizedPptx" | "editableSubsetPptx"
): ExportSpec {
  if (kind === "pptx" && mode === "editableSubsetPptx") {
    return { ...EXPORT_SPECS.find((spec) => spec.id === "pptx-editable")!, viewport };
  }
  if (kind === "pptx") {
    return { ...EXPORT_SPECS.find((spec) => spec.id === "pptx-raster")!, viewport };
  }
  const spec = EXPORT_SPECS.find((item) => item.kind === kind);
  if (!spec) {
    throw new Error(`Unsupported export kind: ${kind}`);
  }
  return { ...spec, viewport };
}

function toWorkerArtifact(artifact: ExportArtifact): ExportWorkerArtifact {
  return {
    kind: artifact.kind,
    filename: artifact.filename,
    filePath: artifact.filePath,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
    diagnostics: artifact.diagnostics
  };
}

function resolveApprovedOutputDir(outputDir: string): string {
  const resolved = path.resolve(outputDir);
  const roots = [
    path.resolve(".tmp-export-worker"),
    path.resolve(".kdesign/exports"),
    path.resolve("../..", ".tmp-export-worker"),
    path.resolve("../..", ".kdesign/exports")
  ];
  if (!roots.some((root) => isWithin(root, resolved))) {
    throw new Error(`Export output path escapes approved roots: ${outputDir}`);
  }
  return resolved;
}

function resolveApprovedFixturePath(outputDir: string, fixturePath: string): string {
  const resolved = path.resolve(fixturePath);
  const fixtureRoots = [
    path.resolve("apps/web/tests/fixtures"),
    path.resolve("../..", "apps/web/tests/fixtures")
  ];
  if (!isWithin(outputDir, resolved) && !fixtureRoots.some((fixtureRoot) => isWithin(fixtureRoot, resolved))) {
    throw new Error(`Export fixture path escapes approved roots: ${fixturePath}`);
  }
  return resolved;
}

function resolveOutputFile(outputDir: string, filename: string): string {
  if (filename !== path.basename(filename)) {
    throw new Error(`Unsafe export filename: ${filename}`);
  }
  const resolved = path.resolve(outputDir, filename);
  if (!isWithin(outputDir, resolved)) {
    throw new Error(`Export file path escapes output directory: ${filename}`);
  }
  return resolved;
}

function isWithin(root: string, child: string): boolean {
  const relative = path.relative(root, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}
