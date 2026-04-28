import { ensureCanvasGraph } from "./canvas-graph.js";
import { stableHash } from "./ids.js";
import {
  AgentContextObjectSummarySchema,
  AgentContextPackageSchema,
  AgentOutputDiagnosticSchema,
  AgentOutputEnvelopeSchema,
  AgentRunSchema,
  ProjectBundleSchema,
  VariationDirectionSchema,
  VariationSetSchema,
  type AgentContextObjectSummary,
  type AgentContextPackage,
  type AgentOutputDiagnostic,
  type AgentOutputEnvelope,
  type AgentRuntime,
  type CanvasOperation,
  type CanvasObject,
  type EditPatch,
  type ProjectBundle,
  type VariationDirection,
  type VariationSet
} from "./schemas.js";

const DEFAULT_INSTRUCTIONS_PATH = "docs/prompts/context-driven-design-agent-prompt.md";
const AGENT_GUARDRAILS = [
  "Use stored ProjectBundle ids only.",
  "Do not read or save live iframe DOM.",
  "Return typed CanvasOperation[] and EditPatch[] only.",
  "Preserve surrounding layout outside targetObjectId."
];

const ALLOWED_AGENT_CANVAS_OPS = new Set<CanvasOperation["op"]>(["setLayoutConstraints"]);
const ALLOWED_AGENT_PATCH_OPS = new Set<EditPatch["op"]>(["setText", "setStyle"]);

type CreateAgentContextPackageInput = {
  targetObjectId: string;
  prompt: string;
  runtime?: AgentRuntime;
  instructionsPath?: string;
  createdAt?: string;
};

type IngestAgentOutputInput = {
  contextPackageId: string;
  runtime: AgentRuntime;
  output: unknown;
  createdAt?: string;
};

type AgentValidationScope = {
  targetObjectId: string;
  targetNodeId?: string;
  sourceRevision: string;
};

export function parseAgentOutputJson(json: string): unknown {
  return JSON.parse(json);
}

export function createAgentContextPackage(
  bundle: ProjectBundle,
  input: CreateAgentContextPackageInput
): ProjectBundle {
  const current = ensureCanvasGraph(bundle);
  const graph = current.canvasGraph!;
  const object = graph.objects[input.targetObjectId];
  if (!object) {
    throw new Error(`Unknown agent context target object: ${input.targetObjectId}`);
  }

  const prompt = requireText(input.prompt, "Agent context prompt");
  const createdAt = input.createdAt ?? new Date().toISOString();
  const ancestors: AgentContextObjectSummary[] = [];
  let parentId = object.parentId;
  while (parentId) {
    const parent = graph.objects[parentId];
    if (!parent) {
      break;
    }
    ancestors.push(summarizeCanvasObject(parent));
    parentId = parent.parentId;
  }

  const siblings = object.parentId
    ? (graph.objects[object.parentId]?.childIds ?? [])
      .filter((childId) => childId !== object.id)
      .map((childId) => graph.objects[childId])
      .filter((sibling): sibling is NonNullable<typeof sibling> => Boolean(sibling))
      .map((sibling) => summarizeCanvasObject(sibling))
    : [];

  const contextPackage = AgentContextPackageSchema.parse({
    id: `agent_context_${stableHash(`${current.id}:${object.id}:${prompt}:${createdAt}`)}`,
    ...(input.runtime ? { runtime: input.runtime } : {}),
    targetObjectId: object.id,
    sourceRevision: current.baseRevision,
    prompt,
    instructionsPath: input.instructionsPath ?? DEFAULT_INSTRUCTIONS_PATH,
    selectedObject: summarizeCanvasObject(object),
    ancestors,
    siblings,
    tokenSummary: summarizeDesignTokens(current),
    guardrails: AGENT_GUARDRAILS,
    createdAt
  });

  return ProjectBundleSchema.parse({
    ...current,
    agentContextPackages: [contextPackage, ...current.agentContextPackages],
    updatedAt: createdAt
  });
}

export function ingestAgentOutput(bundle: ProjectBundle, input: IngestAgentOutputInput): ProjectBundle {
  const current = ensureCanvasGraph(bundle);
  const contextPackage = current.agentContextPackages.find((item) => item.id === input.contextPackageId);
  if (!contextPackage) {
    throw new Error(`Unknown agent context package: ${input.contextPackageId}`);
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  const parsed = AgentOutputEnvelopeSchema.safeParse(input.output);
  if (!parsed.success) {
    return persistRejectedAgentRun(current, contextPackage, input.runtime, diagnosticsForSchemaFailure(input.output, createdAt), createdAt);
  }

  const output = parsed.data;
  if (input.runtime !== output.runtime) {
    return persistRejectedAgentRun(current, contextPackage, input.runtime, [
      createDiagnostic("runtime-mismatch", `Agent output runtime ${output.runtime} does not match selected runtime ${input.runtime}.`, createdAt, output.id)
    ], createdAt);
  }

  const diagnostics = validateAgentOutputScope(current, contextPackage, output);
  if (diagnostics.length > 0) {
    return persistRejectedAgentRun(current, contextPackage, input.runtime, diagnostics, createdAt);
  }

  const variationSet = findReusableVariationSet(current, contextPackage)
    ?? createAgentVariationSet(current, contextPackage, createdAt);
  const directions = output.directions.map((direction) => VariationDirectionSchema.parse({
    id: `variation_dir_${stableHash(`${variationSet.id}:${direction.id}:${direction.name}:${createdAt}`)}`,
    name: direction.name,
    description: direction.description,
    targetObjectId: direction.targetObjectId,
    operations: direction.operations,
    patches: direction.patches,
    status: "validated",
    provenance: `agent-output:${output.runtime}`,
    createdAt: direction.createdAt
  }));

  return ProjectBundleSchema.parse({
    ...current,
    variationSets: upsertVariationSet(current.variationSets, {
      ...variationSet,
      directions: [...variationSet.directions, ...directions],
      updatedAt: createdAt
    }),
    agentOutputs: [output, ...current.agentOutputs],
    agentRuns: [
      createAgentRun({
        runtime: input.runtime,
        status: "validated",
        contextPackage,
        outputId: output.id,
        createdAt,
        diagnostics: []
      }),
      ...current.agentRuns
    ],
    updatedAt: createdAt
  });
}

export function validateAgentOutputScope(
  bundle: ProjectBundle,
  contextPackage: AgentContextPackage,
  output: AgentOutputEnvelope
): AgentOutputDiagnostic[] {
  const diagnostics: AgentOutputDiagnostic[] = [];
  const target = bundle.canvasGraph?.objects[contextPackage.targetObjectId];
  if (!target) {
    diagnostics.push(createDiagnostic("missing-reference", `Missing target object: ${contextPackage.targetObjectId}`, output.createdAt, contextPackage.targetObjectId));
    return diagnostics;
  }
  if (contextPackage.selectedObject.id !== contextPackage.targetObjectId) {
    diagnostics.push(createDiagnostic("missing-reference", "Context package selected object does not match targetObjectId.", output.createdAt, contextPackage.selectedObject.id));
  }
  if (output.contextPackageId !== contextPackage.id) {
    diagnostics.push(createDiagnostic("missing-reference", `Output references a different context package: ${output.contextPackageId}`, output.createdAt, output.contextPackageId));
  }
  if (output.targetObjectId !== contextPackage.targetObjectId) {
    diagnostics.push(createDiagnostic("out-of-scope-target", `Output target must stay on selected object: ${contextPackage.targetObjectId}`, output.createdAt, output.targetObjectId));
  }
  if (output.sourceRevision !== contextPackage.sourceRevision) {
    diagnostics.push(createDiagnostic("stale-revision", `Output revision ${output.sourceRevision} does not match context revision ${contextPackage.sourceRevision}.`, output.createdAt, output.id));
  }
  if (output.directions.length < 2) {
    diagnostics.push(createDiagnostic("insufficient-directions", "Agent output must include at least two generated directions.", output.createdAt, output.id));
  }

  for (const direction of output.directions) {
    if (direction.targetObjectId !== contextPackage.targetObjectId) {
      diagnostics.push(createDiagnostic("out-of-scope-target", `Direction target must stay on selected object: ${contextPackage.targetObjectId}`, output.createdAt, direction.targetObjectId));
    }
    diagnostics.push(...validateAgentDirectionSafety({
      targetObjectId: contextPackage.targetObjectId,
      ...(target.nodeId ? { targetNodeId: target.nodeId } : {}),
      sourceRevision: contextPackage.sourceRevision,
      operations: direction.operations,
      patches: direction.patches,
      createdAt: output.createdAt
    }));
  }

  return diagnostics;
}

export function validateAgentDirectionSafety(input: AgentValidationScope & {
  operations: CanvasOperation[];
  patches: EditPatch[];
  createdAt: string;
}): AgentOutputDiagnostic[] {
  const diagnostics: AgentOutputDiagnostic[] = [];
  for (const operation of input.operations) {
    validateAgentOperation(input, operation, input.createdAt, diagnostics);
  }
  for (const patch of input.patches) {
    validateAgentPatch(input, patch, input.createdAt, diagnostics);
  }
  return diagnostics;
}

function validateAgentOperation(
  scope: AgentValidationScope,
  operation: CanvasOperation,
  createdAt: string,
  diagnostics: AgentOutputDiagnostic[]
): void {
  if (!ALLOWED_AGENT_CANVAS_OPS.has(operation.op)) {
    diagnostics.push(createDiagnostic("unsupported-operation", `Unsupported agent canvas operation: ${operation.op}`, createdAt, operation.id));
  }
  if (operation.objectId !== scope.targetObjectId) {
    diagnostics.push(createDiagnostic("out-of-scope-target", `Agent operation must target ${scope.targetObjectId}.`, createdAt, operation.objectId));
  }
  if (operation.baseRevision !== scope.sourceRevision) {
    diagnostics.push(createDiagnostic("stale-revision", `Agent operation has stale revision: ${operation.baseRevision}`, createdAt, operation.id));
  }
}

function validateAgentPatch(
  scope: AgentValidationScope,
  patch: EditPatch,
  createdAt: string,
  diagnostics: AgentOutputDiagnostic[]
): void {
  if (!ALLOWED_AGENT_PATCH_OPS.has(patch.op)) {
    diagnostics.push(createDiagnostic("unsupported-operation", `Unsupported agent patch operation: ${patch.op}`, createdAt, patch.id));
  }
  if (!scope.targetNodeId) {
    diagnostics.push(createDiagnostic("missing-reference", "Selected canvas object has no editable node for patch output.", createdAt, patch.id));
  } else if (patch.nodeId !== scope.targetNodeId) {
    diagnostics.push(createDiagnostic("out-of-scope-target", `Agent patch must target selected node ${scope.targetNodeId}.`, createdAt, patch.nodeId));
  }
  if (patch.baseRevision !== scope.sourceRevision) {
    diagnostics.push(createDiagnostic("stale-revision", `Agent patch has stale revision: ${patch.baseRevision}`, createdAt, patch.id));
  }
  if (hasUnsafePatchValue(patch.value)) {
    diagnostics.push(createDiagnostic("unsafe-patch", "Agent patch contains raw HTML, scriptable attributes, or unsafe style/url syntax.", createdAt, patch.id));
  }
}

function persistRejectedAgentRun(
  bundle: ProjectBundle,
  contextPackage: AgentContextPackage,
  runtime: AgentRuntime,
  diagnostics: AgentOutputDiagnostic[],
  createdAt: string
): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    agentRuns: [
      createAgentRun({
        runtime,
        status: "rejected",
        contextPackage,
        createdAt,
        diagnostics
      }),
      ...bundle.agentRuns
    ],
    updatedAt: createdAt
  });
}

function diagnosticsForSchemaFailure(output: unknown, createdAt: string): AgentOutputDiagnostic[] {
  if (typeof output === "string") {
    return [createDiagnostic("parse-error", "Agent output JSON could not be parsed.", createdAt)];
  }
  if (isRecord(output) && Array.isArray(output.directions) && output.directions.length < 2) {
    return [createDiagnostic("insufficient-directions", "Agent output must include at least two generated directions.", createdAt)];
  }
  return [createDiagnostic("schema-error", "Agent output did not match the required structured schema.", createdAt)];
}

function createAgentRun(input: {
  runtime: AgentRuntime;
  status: "draft" | "validated" | "rejected" | "promoted";
  contextPackage: AgentContextPackage;
  outputId?: string;
  createdAt: string;
  diagnostics?: AgentOutputDiagnostic[];
}) {
  return AgentRunSchema.parse({
    id: `agent_run_${stableHash(`${input.contextPackage.id}:${input.runtime}:${input.status}:${input.outputId ?? "none"}:${input.createdAt}`)}`,
    runtime: input.runtime,
    status: input.status,
    contextPackageId: input.contextPackage.id,
    ...(input.outputId ? { outputId: input.outputId } : {}),
    targetObjectId: input.contextPackage.targetObjectId,
    sourceRevision: input.contextPackage.sourceRevision,
    diagnostics: input.diagnostics ?? [],
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  });
}

function createAgentVariationSet(
  bundle: ProjectBundle,
  contextPackage: AgentContextPackage,
  createdAt: string
): VariationSet {
  return VariationSetSchema.parse({
    id: `variation_set_${stableHash(`${bundle.id}:${contextPackage.id}:${contextPackage.prompt}:${createdAt}`)}`,
    targetObjectId: contextPackage.targetObjectId,
    prompt: contextPackage.prompt,
    sourceRevision: contextPackage.sourceRevision,
    directions: [],
    createdAt,
    updatedAt: createdAt
  });
}

function findReusableVariationSet(bundle: ProjectBundle, contextPackage: AgentContextPackage): VariationSet | undefined {
  return bundle.variationSets.find((set) =>
    set.targetObjectId === contextPackage.targetObjectId &&
    set.sourceRevision === contextPackage.sourceRevision &&
    set.prompt === contextPackage.prompt
  );
}

function upsertVariationSet(sets: VariationSet[], nextSet: VariationSet): VariationSet[] {
  return sets.some((set) => set.id === nextSet.id)
    ? sets.map((set) => set.id === nextSet.id ? nextSet : set)
    : [nextSet, ...sets];
}

function summarizeCanvasObject(object: CanvasObject): AgentContextObjectSummary {
  return AgentContextObjectSummarySchema.parse({
    id: object.id,
    kind: object.kind,
    name: object.name,
    ...(object.nodeId ? { nodeId: object.nodeId } : {}),
    ...(object.parentId ? { parentId: object.parentId } : {}),
    childIds: object.childIds
  });
}

function summarizeDesignTokens(bundle: ProjectBundle): string[] {
  const tokens = bundle.designSystem?.tokens.slice(0, 12).map((token) => `${token.name}:${token.value}`) ?? [];
  const base = [
    `sourceRevision:${bundle.baseRevision}`,
    `patches:${bundle.patches.length}`,
    `canvasOperations:${bundle.canvasOperations.length}`
  ];
  return [...base, ...tokens];
}

function createDiagnostic(
  code: AgentOutputDiagnostic["code"],
  message: string,
  createdAt: string,
  targetId?: string,
  severity: AgentOutputDiagnostic["severity"] = "error"
): AgentOutputDiagnostic {
  return AgentOutputDiagnosticSchema.parse({
    id: `agent_diag_${stableHash(`${code}:${message}:${targetId ?? "none"}:${createdAt}`)}`,
    severity,
    code,
    message,
    ...(targetId ? { targetId } : {}),
    createdAt
  });
}

function hasUnsafePatchValue(value: unknown): boolean {
  if (typeof value === "string") {
    return /<\s*\/?[a-z][\s\S]*>|on[a-z]+\s*=|javascript:|expression\(|url\(/i.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafePatchValue(item));
  }
  if (isRecord(value)) {
    return Object.entries(value).some(([key, item]) =>
      /^on[a-z]+$/i.test(key) || hasUnsafePatchValue(item)
    );
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must not be empty.`);
  }
  return trimmed;
}
