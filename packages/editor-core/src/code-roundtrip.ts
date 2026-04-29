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
  return CodeRoundtripPackageSchema.parse({
    id: `roundtrip_pkg_${stableHash(`${bundle.id}:${input.runtime}:${bundle.baseRevision}:${artifactIds.join(",")}:${createdAt}`)}`,
    runtime: input.runtime,
    sourceRevision: bundle.baseRevision,
    artifactIds,
    instructionPath,
    manifestJson: input.manifestJson ?? JSON.stringify({
      projectId: bundle.id,
      sourceRevision: bundle.baseRevision,
      runtime: input.runtime,
      artifactIds,
      sourceOfTruth: "ProjectBundle"
    }, null, 2),
    createdAt
  });
}

export function appendCodeRoundtripPackage(
  bundle: ProjectBundle,
  roundtripPackage: CodeRoundtripPackage
): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    codeRoundtripPackages: [
      roundtripPackage,
      ...bundle.codeRoundtripPackages.filter((item) => item.id !== roundtripPackage.id)
    ],
    updatedAt: roundtripPackage.createdAt
  });
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
