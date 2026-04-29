import { stableHash } from "./ids.js";
import { applyCanvasOperationsToBundle } from "./canvas-operations.js";
import { applyEditPatchesToBundle } from "./patches.js";
import {
  CanvasOperationSchema,
  CodeRoundtripImportSchema,
  CodeRoundtripPackageSchema,
  EditPatchSchema,
  ProjectBundleSchema,
  type AgentRuntime,
  type CanvasOperation,
  type CodeRoundtripImport,
  type CodeRoundtripPackage,
  type EditPatch,
  type ProjectBundle
} from "./schemas.js";

const DEFAULT_INSTRUCTION_PATH = "docs/prompts/context-driven-design-agent-prompt.md";
const ALLOWED_ROUNDTRIP_CANVAS_OPS = new Set<CanvasOperation["op"]>([
  "setObjectName",
  "setObjectVisibility",
  "setObjectLock",
  "setLayoutConstraints"
]);

export function createCodeRoundtripPackage(
  bundle: ProjectBundle,
  input: {
    runtime: AgentRuntime;
    artifactIds: string[];
    instructionPath?: string;
    manifestJson?: string;
    createdAt?: string;
  }
): CodeRoundtripPackage {
  const artifactIds = [...new Set(input.artifactIds)];
  if (artifactIds.length === 0) {
    throw new Error("Code roundtrip package requires at least one artifact.");
  }
  const knownArtifacts = new Set(bundle.exportArtifacts.map((artifact) => artifact.id));
  for (const artifactId of artifactIds) {
    if (!knownArtifacts.has(artifactId)) {
      throw new Error(`Code roundtrip package references missing artifact: ${artifactId}`);
    }
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const instructionPath = input.instructionPath ?? DEFAULT_INSTRUCTION_PATH;
  const roundtripPackage = CodeRoundtripPackageSchema.parse({
    id: `roundtrip_pkg_${stableHash(`${bundle.id}:${input.runtime}:${bundle.baseRevision}:${artifactIds.join(",")}:${createdAt}`)}`,
    runtime: input.runtime,
    sourceRevision: bundle.baseRevision,
    artifactIds,
    instructionPath,
    manifestJson: input.manifestJson ?? createCodeRoundtripManifest(bundle, {
      runtime: input.runtime,
      artifactIds,
      instructionPath
    }),
    createdAt
  });
  validateCodeRoundtripPackageManifest(bundle, roundtripPackage);
  return roundtripPackage;
}

export function appendCodeRoundtripPackage(
  bundle: ProjectBundle,
  roundtripPackage: CodeRoundtripPackage
): ProjectBundle {
  validateCodeRoundtripPackageManifest(bundle, roundtripPackage);
  return ProjectBundleSchema.parse({
    ...bundle,
    codeRoundtripPackages: [
      roundtripPackage,
      ...bundle.codeRoundtripPackages.filter((item) => item.id !== roundtripPackage.id)
    ],
    updatedAt: roundtripPackage.createdAt
  });
}

export function createCodeRoundtripManifest(
  bundle: ProjectBundle,
  input: {
    runtime: AgentRuntime;
    artifactIds: string[];
    instructionPath?: string;
  }
): string {
  const snapshot = ProjectBundleSchema.parse(bundle);
  return JSON.stringify({
    sourceOfTruth: "ProjectBundle",
    projectId: snapshot.id,
    baseRevision: snapshot.baseRevision,
    sourceRevision: snapshot.baseRevision,
    runtime: input.runtime,
    artifactIds: [...input.artifactIds],
    instructionsPath: input.instructionPath ?? DEFAULT_INSTRUCTION_PATH,
    projectBundle: snapshot,
    canvasGraph: snapshot.canvasGraph ?? null,
    editGraph: snapshot.editGraph,
    assets: snapshot.assets,
    designSystem: snapshot.designSystem ?? null,
    sourceRecords: snapshot.sourceRecords,
    exportArtifacts: snapshot.exportArtifacts
  }, null, 2);
}

export function validateCodeRoundtripPackageManifest(
  bundle: ProjectBundle,
  roundtripPackage: CodeRoundtripPackage
): void {
  const manifest = parseRoundtripManifest(roundtripPackage.manifestJson);
  assertManifestValue(manifest, "sourceOfTruth", "ProjectBundle", roundtripPackage.id);
  assertManifestValue(manifest, "projectId", bundle.id, roundtripPackage.id);
  assertManifestValue(manifest, "baseRevision", roundtripPackage.sourceRevision, roundtripPackage.id);
  assertManifestValue(manifest, "sourceRevision", roundtripPackage.sourceRevision, roundtripPackage.id);
  assertManifestValue(manifest, "runtime", roundtripPackage.runtime, roundtripPackage.id);
  assertManifestValue(manifest, "instructionsPath", roundtripPackage.instructionPath, roundtripPackage.id);

  const artifactIds = getStringArray(manifest, "artifactIds", roundtripPackage.id);
  if (!sameStringArray(artifactIds, roundtripPackage.artifactIds)) {
    throw new Error(`Code roundtrip manifest artifact mismatch: ${roundtripPackage.id}`);
  }

  for (const requiredKey of [
    "projectBundle",
    "canvasGraph",
    "editGraph",
    "assets",
    "designSystem",
    "sourceRecords",
    "exportArtifacts"
  ]) {
    if (!(requiredKey in manifest)) {
      throw new Error(`Code roundtrip manifest missing ${requiredKey}: ${roundtripPackage.id}`);
    }
  }

  const projectBundle = getRecord(manifest, "projectBundle", roundtripPackage.id);
  if (projectBundle["id"] !== bundle.id || projectBundle["baseRevision"] !== roundtripPackage.sourceRevision) {
    throw new Error(`Code roundtrip manifest project bundle mismatch: ${roundtripPackage.id}`);
  }

  const exportArtifacts = getRecordArray(manifest, "exportArtifacts", roundtripPackage.id);
  const manifestArtifactIds = new Set(exportArtifacts.map((artifact) => artifact["id"]).filter((id): id is string => typeof id === "string"));
  for (const artifactId of roundtripPackage.artifactIds) {
    if (!manifestArtifactIds.has(artifactId)) {
      throw new Error(`Code roundtrip manifest missing export artifact: ${artifactId}`);
    }
  }
}

export function validateCodeRoundtripImport(
  bundle: ProjectBundle,
  input: {
    packageId: string;
    runtime: AgentRuntime;
    sourceRevision: string;
    patchIds?: string[];
    operationIds?: string[];
    patches?: EditPatch[];
    operations?: CanvasOperation[];
    createdAt?: string;
  }
): CodeRoundtripImport {
  const roundtripPackage = bundle.codeRoundtripPackages.find((item) => item.id === input.packageId);
  if (!roundtripPackage) {
    throw new Error(`Unknown code roundtrip package: ${input.packageId}`);
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const diagnostics: string[] = [];
  if (input.runtime !== roundtripPackage.runtime) {
    diagnostics.push(`runtime-mismatch:${input.runtime}:${roundtripPackage.runtime}`);
  }
  if (input.sourceRevision !== roundtripPackage.sourceRevision) {
    diagnostics.push("source-revision-mismatch");
  }
  const knownPatchIds = new Set(bundle.patches.map((patch) => patch.id));
  const knownOperationIds = new Set(bundle.canvasOperations.map((operation) => operation.id));
  for (const patchId of input.patchIds ?? []) {
    if (!knownPatchIds.has(patchId)) {
      diagnostics.push(`missing-patch:${patchId}`);
    }
  }
  for (const operationId of input.operationIds ?? []) {
    if (!knownOperationIds.has(operationId)) {
      diagnostics.push(`missing-operation:${operationId}`);
    }
  }
  const payloadDiagnostics = validateRoundtripPayload(bundle, roundtripPackage, input);
  diagnostics.push(...payloadDiagnostics);
  const status: CodeRoundtripImport["status"] = diagnostics.length === 0
    ? "validated"
    : diagnostics.some((diagnostic) => (
      diagnostic.startsWith("missing-") ||
      diagnostic.startsWith("unsupported-operation") ||
      diagnostic.startsWith("unsafe-patch") ||
      diagnostic.startsWith("unsafe-operation")
    ))
      ? "rejected"
      : "conflict";

  return CodeRoundtripImportSchema.parse({
    id: `roundtrip_import_${stableHash(`${bundle.id}:${input.packageId}:${input.runtime}:${input.sourceRevision}:${createdAt}`)}`,
    packageId: roundtripPackage.id,
    runtime: input.runtime,
    sourceRevision: input.sourceRevision,
    status,
    patchIds: [...new Set([...(input.patchIds ?? []), ...(input.patches ?? []).map((patch) => patch.id)])],
    operationIds: [...new Set([...(input.operationIds ?? []), ...(input.operations ?? []).map((operation) => operation.id)])],
    diagnostics,
    createdAt
  });
}

function validateRoundtripPayload(
  bundle: ProjectBundle,
  roundtripPackage: CodeRoundtripPackage,
  input: {
    patches?: EditPatch[];
    operations?: CanvasOperation[];
  }
): string[] {
  const diagnostics: string[] = [];
  const patches = (input.patches ?? []).map((patch) => EditPatchSchema.parse(patch));
  const operations = (input.operations ?? []).map((operation) => CanvasOperationSchema.parse(operation));
  for (const patch of patches) {
    if (patch.baseRevision !== roundtripPackage.sourceRevision) {
      diagnostics.push(`payload-patch-revision-mismatch:${patch.id}`);
    }
    if (!bundle.editGraph.nodes[patch.nodeId]) {
      diagnostics.push(`missing-patch-node:${patch.nodeId}`);
    }
  }
  for (const operation of operations) {
    if (!ALLOWED_ROUNDTRIP_CANVAS_OPS.has(operation.op)) {
      diagnostics.push(`unsupported-operation:${operation.op}`);
    }
    if (operation.baseRevision !== roundtripPackage.sourceRevision) {
      diagnostics.push(`payload-operation-revision-mismatch:${operation.id}`);
    }
    if (!bundle.canvasGraph?.objects[operation.objectId]) {
      diagnostics.push(`missing-operation-object:${operation.objectId}`);
    }
  }
  try {
    if (patches.length > 0) {
      applyEditPatchesToBundle(ProjectBundleSchema.parse(bundle), patches);
    }
  } catch (error) {
    diagnostics.push(`unsafe-patch:${error instanceof Error ? error.message : "unknown"}`);
  }
  try {
    if (operations.length > 0) {
      applyCanvasOperationsToBundle(ProjectBundleSchema.parse(bundle), operations);
    }
  } catch (error) {
    diagnostics.push(`unsafe-operation:${error instanceof Error ? error.message : "unknown"}`);
  }
  return diagnostics;
}

function parseRoundtripManifest(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      throw new Error("manifest is not an object");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Code roundtrip manifest is invalid JSON: ${error instanceof Error ? error.message : "unknown"}`);
  }
}

function assertManifestValue(
  manifest: Record<string, unknown>,
  key: string,
  expected: string,
  packageId: string
): void {
  if (manifest[key] !== expected) {
    throw new Error(`Code roundtrip manifest ${key} mismatch: ${packageId}`);
  }
}

function getStringArray(
  manifest: Record<string, unknown>,
  key: string,
  packageId: string
): string[] {
  const value = manifest[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Code roundtrip manifest ${key} must be a string array: ${packageId}`);
  }
  return value;
}

function getRecord(
  manifest: Record<string, unknown>,
  key: string,
  packageId: string
): Record<string, unknown> {
  const value = manifest[key];
  if (!isRecord(value)) {
    throw new Error(`Code roundtrip manifest ${key} must be an object: ${packageId}`);
  }
  return value;
}

function getRecordArray(
  manifest: Record<string, unknown>,
  key: string,
  packageId: string
): Array<Record<string, unknown>> {
  const value = manifest[key];
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new Error(`Code roundtrip manifest ${key} must be an object array: ${packageId}`);
  }
  return value;
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function appendCodeRoundtripImport(
  bundle: ProjectBundle,
  roundtripImport: CodeRoundtripImport
): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    codeRoundtripImports: [
      roundtripImport,
      ...bundle.codeRoundtripImports.filter((item) => item.id !== roundtripImport.id)
    ],
    updatedAt: roundtripImport.createdAt
  });
}
