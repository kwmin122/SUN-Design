import { stableHash } from "./ids.js";
import {
  ExportArtifactSchema,
  ExportVerificationSchema,
  ProjectBundleSchema,
  PublishPreviewSchema,
  type ExportArtifact,
  type ExportKind,
  type ExportVerification,
  type PreviewDevice,
  type ProjectBundle,
  type PublishPreview
} from "./schemas.js";

export function createExportArtifactRecord(
  bundle: ProjectBundle,
  input: {
    jobId: string;
    kind: ExportKind;
    filename: string;
    bytes: number;
    sha256: string;
    sourceRevision?: string;
    viewport: PreviewDevice;
    filePath: string;
    diagnostics?: string[];
    createdAt?: string;
  }
): ExportArtifact {
  const sourceRevision = input.sourceRevision ?? bundle.baseRevision;
  if (sourceRevision !== bundle.baseRevision) {
    throw new Error(`Export artifact source revision is stale: ${sourceRevision}`);
  }
  if (!bundle.exportJobs.some((job) => job.id === input.jobId)) {
    throw new Error(`Export artifact references missing job: ${input.jobId}`);
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  return ExportArtifactSchema.parse({
    id: `artifact_${stableHash(`${bundle.id}:${input.jobId}:${input.filename}:${input.sha256}:${createdAt}`)}`,
    jobId: input.jobId,
    kind: input.kind,
    filename: input.filename,
    mimeType: mimeTypeForKind(input.kind),
    bytes: input.bytes,
    sha256: input.sha256,
    sourceRevision,
    viewport: input.viewport,
    filePath: input.filePath,
    diagnostics: input.diagnostics ?? [],
    createdAt
  });
}

export function createExportVerification(input: {
  artifactId: string;
  kind: ExportVerification["kind"];
  status?: ExportVerification["status"];
  expectedHash?: string;
  actualHash?: string;
  diagnostics?: string[];
  createdAt?: string;
}): ExportVerification {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return ExportVerificationSchema.parse({
    id: `export_verification_${stableHash(`${input.artifactId}:${input.kind}:${input.status ?? "passed"}:${createdAt}`)}`,
    artifactId: input.artifactId,
    kind: input.kind,
    status: input.status ?? "passed",
    ...(input.expectedHash ? { expectedHash: input.expectedHash } : {}),
    ...(input.actualHash ? { actualHash: input.actualHash } : {}),
    diagnostics: input.diagnostics ?? [],
    createdAt
  });
}

export function createPublishPreview(
  bundle: ProjectBundle,
  input: {
    artifactIds: string[];
    viewports?: PreviewDevice[];
    status?: PublishPreview["status"];
    diagnostics?: string[];
    createdAt?: string;
  }
): PublishPreview {
  const artifactIds = [...new Set(input.artifactIds)];
  if (artifactIds.length === 0) {
    throw new Error("Publish preview requires at least one export artifact.");
  }
  const knownArtifacts = new Set(bundle.exportArtifacts.map((artifact) => artifact.id));
  for (const artifactId of artifactIds) {
    if (!knownArtifacts.has(artifactId)) {
      throw new Error(`Publish preview references missing artifact: ${artifactId}`);
    }
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const id = `publish_${stableHash(`${bundle.id}:${bundle.baseRevision}:${artifactIds.join(",")}:${createdAt}`)}`;
  return PublishPreviewSchema.parse({
    id,
    sourceRevision: bundle.baseRevision,
    url: `kdesign://publish/${encodeURIComponent(bundle.id)}/${id}`,
    artifactIds,
    viewports: input.viewports ?? inferViewports(bundle, artifactIds),
    status: input.status ?? "ready",
    diagnostics: input.diagnostics ?? [],
    createdAt
  });
}

export function appendExportArtifact(
  bundle: ProjectBundle,
  artifact: ExportArtifact,
  verification?: ExportVerification
): ProjectBundle {
  const nextArtifacts = [artifact, ...bundle.exportArtifacts.filter((item) => item.id !== artifact.id)];
  const nextVerifications = verification
    ? [verification, ...bundle.exportVerifications.filter((item) => item.id !== verification.id)]
    : bundle.exportVerifications;
  return ProjectBundleSchema.parse({
    ...bundle,
    exportArtifacts: nextArtifacts,
    exportVerifications: nextVerifications,
    updatedAt: artifact.createdAt
  });
}

export function appendPublishPreview(bundle: ProjectBundle, preview: PublishPreview): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    publishPreviews: [preview, ...bundle.publishPreviews.filter((item) => item.id !== preview.id)],
    updatedAt: preview.createdAt
  });
}

function inferViewports(bundle: ProjectBundle, artifactIds: string[]): PreviewDevice[] {
  const byId = new Map(bundle.exportArtifacts.map((artifact) => [artifact.id, artifact]));
  const viewports = artifactIds
    .map((artifactId) => byId.get(artifactId)?.viewport)
    .filter((viewport): viewport is PreviewDevice => Boolean(viewport));
  return [...new Set(viewports)];
}

export function mimeTypeForKind(kind: ExportKind): string {
  return {
    html: "text/html",
    png: "image/png",
    pdf: "application/pdf",
    zip: "application/zip",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    gif: "image/gif",
    mp4: "video/mp4"
  }[kind];
}
