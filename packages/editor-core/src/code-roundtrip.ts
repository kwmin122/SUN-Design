import { stableHash } from "./ids.js";
import {
  CodeRoundtripImportSchema,
  CodeRoundtripPackageSchema,
  ProjectBundleSchema,
  type AgentRuntime,
  type CodeRoundtripImport,
  type CodeRoundtripPackage,
  type ProjectBundle
} from "./schemas.js";

const DEFAULT_INSTRUCTION_PATH = "docs/prompts/context-driven-design-agent-prompt.md";

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
  const status: CodeRoundtripImport["status"] = diagnostics.length === 0
    ? "validated"
    : diagnostics.some((diagnostic) => diagnostic.startsWith("missing-"))
      ? "rejected"
      : "conflict";

  return CodeRoundtripImportSchema.parse({
    id: `roundtrip_import_${stableHash(`${bundle.id}:${input.packageId}:${input.runtime}:${input.sourceRevision}:${createdAt}`)}`,
    packageId: roundtripPackage.id,
    runtime: input.runtime,
    sourceRevision: input.sourceRevision,
    status,
    patchIds: input.patchIds ?? [],
    operationIds: input.operationIds ?? [],
    diagnostics,
    createdAt
  });
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
