import { applyCanvasOperationToBundle } from "./canvas-operations.js";
import { validateAgentDirectionSafety } from "./agent-output.js";
import { ensureCanvasGraph } from "./canvas-graph.js";
import { stableHash } from "./ids.js";
import { applyEditPatchToBundle } from "./patches.js";
import {
  AgentRecipeSchema,
  ProjectBundleSchema,
  VariationDirectionSchema,
  VariationSetSchema,
  type AgentRuntime,
  type CanvasOperation,
  type EditPatch,
  type ProjectBundle,
  type VariationDirection
} from "./schemas.js";

type VariationSetInput = {
  targetObjectId: string;
  prompt: string;
  createdAt?: string;
  id?: string;
};

type DirectionInput = Omit<VariationDirection, "id" | "createdAt" | "status" | "provenance"> & {
  id?: string;
  createdAt?: string;
  status?: VariationDirection["status"];
  provenance?: string;
};

export function createVariationSet(bundle: ProjectBundle, input: VariationSetInput): ProjectBundle {
  const current = ensureCanvasGraph(bundle);
  requireCanvasObject(current, input.targetObjectId);
  const prompt = requireText(input.prompt, "Variation prompt");
  const createdAt = input.createdAt ?? new Date().toISOString();
  const set = VariationSetSchema.parse({
    id: input.id ?? `variation_set_${stableHash(`${current.id}:${input.targetObjectId}:${prompt}:${createdAt}`)}`,
    targetObjectId: input.targetObjectId,
    prompt,
    sourceRevision: current.baseRevision,
    directions: [],
    createdAt,
    updatedAt: createdAt
  });
  return ProjectBundleSchema.parse({
    ...current,
    variationSets: [set, ...current.variationSets],
    updatedAt: createdAt
  });
}

export function addVariationDirection(
  bundle: ProjectBundle,
  variationSetId: string,
  input: DirectionInput
): ProjectBundle {
  const current = ensureCanvasGraph(bundle);
  const set = requireVariationSet(current, variationSetId);
  validateDirectionScope(current, set.targetObjectId, input.operations, input.patches);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const direction = VariationDirectionSchema.parse({
    ...input,
    id: input.id ?? `variation_dir_${stableHash(`${variationSetId}:${input.name}:${createdAt}`)}`,
    status: input.status ?? "candidate",
    provenance: input.provenance ?? "localized-remix",
    createdAt
  });
  validateAgentGeneratedDirection(current, set, direction);
  return ProjectBundleSchema.parse({
    ...current,
    variationSets: current.variationSets.map((item) => item.id === variationSetId ? {
      ...item,
      directions: [...item.directions, direction],
      updatedAt: createdAt
    } : item),
    updatedAt: createdAt
  });
}

export function createSelectedRegionRemix(
  bundle: ProjectBundle,
  input: VariationSetInput
): ProjectBundle {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const withSet = createVariationSet(bundle, { ...input, createdAt });
  const set = withSet.variationSets[0]!;
  const object = requireCanvasObject(withSet, set.targetObjectId);
  const directions = [
    createDeterministicDirection(withSet, set.id, object.id, "Tighter hierarchy", "Increase visual clarity inside the selected region.", createdAt, 18),
    createDeterministicDirection(withSet, set.id, object.id, "Roomier rhythm", "Add breathing room while preserving surrounding layout.", createdAt, 28),
    createDeterministicDirection(withSet, set.id, object.id, "Presentation emphasis", "Make the selected region read stronger in presentation mode.", createdAt, 36)
  ];
  return ProjectBundleSchema.parse({
    ...withSet,
    variationSets: withSet.variationSets.map((item) => item.id === set.id ? {
      ...item,
      directions,
      updatedAt: createdAt
    } : item),
    updatedAt: createdAt
  });
}

export function promoteVariationDirection(
  bundle: ProjectBundle,
  variationSetId: string,
  directionId: string
): ProjectBundle {
  const current = ensureCanvasGraph(bundle);
  const set = requireVariationSet(current, variationSetId);
  const direction = set.directions.find((item) => item.id === directionId);
  if (!direction) {
    throw new Error(`Unknown variation direction: ${directionId}`);
  }
  validateDirectionScope(current, set.targetObjectId, direction.operations, direction.patches);
  validateAgentGeneratedDirection(current, set, direction);
  let next = current;
  for (const operation of direction.operations) {
    assertFreshRevision(current, operation.baseRevision);
    next = applyCanvasOperationToBundle(next, operation);
  }
  for (const patch of direction.patches) {
    assertFreshRevision(current, patch.baseRevision);
    next = applyEditPatchToBundle(next, patch);
  }
  return ProjectBundleSchema.parse({
    ...next,
    variationSets: next.variationSets.map((item) => item.id === variationSetId ? {
      ...item,
      promotedDirectionId: directionId,
      directions: item.directions.map((candidate) =>
        candidate.id === directionId ? { ...candidate, status: "promoted" } : candidate
      ),
      updatedAt: new Date().toISOString()
    } : item)
  });
}

export function exportAgentRecipe(
  bundle: ProjectBundle,
  input: {
    runtime: AgentRuntime;
    targetObjectId: string;
    prompt: string;
    variationSetId?: string;
    directionId?: string;
    operationIds?: string[];
    instructionsPath?: string;
    createdAt?: string;
  }
): ProjectBundle {
  requireCanvasObject(bundle, input.targetObjectId);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const recipe = AgentRecipeSchema.parse({
    id: `agent_recipe_${stableHash(`${bundle.id}:${input.runtime}:${input.targetObjectId}:${createdAt}`)}`,
    runtime: input.runtime,
    targetObjectId: input.targetObjectId,
    sourceRevision: bundle.baseRevision,
    prompt: requireText(input.prompt, "Agent recipe prompt"),
    instructionsPath: input.instructionsPath ?? "docs/prompts/context-driven-design-agent-prompt.md",
    operationIds: input.operationIds ?? collectDirectionOperationIds(bundle, input.variationSetId, input.directionId),
    variationSetId: input.variationSetId,
    directionId: input.directionId,
    replaySteps: [
      "Load the ProjectBundle from stored artifact state.",
      "Find the target canvas object by targetObjectId.",
      "Apply only the typed operations listed in operationIds.",
      "Reject stale sourceRevision or live DOM-only edits."
    ],
    createdAt
  });
  return ProjectBundleSchema.parse({
    ...bundle,
    agentRecipes: [recipe, ...bundle.agentRecipes],
    updatedAt: createdAt
  });
}

function createDeterministicDirection(
  bundle: ProjectBundle,
  variationSetId: string,
  targetObjectId: string,
  name: string,
  description: string,
  createdAt: string,
  padding: number
): VariationDirection {
  const operation: CanvasOperation = {
    id: `variation_op_${stableHash(`${variationSetId}:${name}:layout`)}`,
    op: "setLayoutConstraints",
    objectId: targetObjectId,
    value: {
      constraints: {
        layout: {
          padding: `${padding}px`,
          gap: `${Math.max(8, Math.round(padding / 2))}px`
        }
      }
    },
    source: "agent",
    baseRevision: bundle.baseRevision,
    createdAt
  };
  return VariationDirectionSchema.parse({
    id: `variation_dir_${stableHash(`${variationSetId}:${name}`)}`,
    name,
    description,
    targetObjectId,
    operations: [operation],
    patches: [],
    status: "candidate",
    provenance: "deterministic-local-remix",
    createdAt
  });
}

function collectDirectionOperationIds(
  bundle: ProjectBundle,
  variationSetId: string | undefined,
  directionId: string | undefined
): string[] {
  const set = variationSetId ? bundle.variationSets.find((item) => item.id === variationSetId) : undefined;
  const direction = set && directionId ? set.directions.find((item) => item.id === directionId) : undefined;
  return direction ? [
    ...direction.operations.map((operation) => operation.id),
    ...direction.patches.map((patch) => patch.id)
  ] : [];
}

function requireVariationSet(bundle: ProjectBundle, variationSetId: string) {
  const set = bundle.variationSets.find((item) => item.id === variationSetId);
  if (!set) {
    throw new Error(`Unknown variation set: ${variationSetId}`);
  }
  return set;
}

function requireCanvasObject(bundle: ProjectBundle, objectId: string) {
  const ensured = ensureCanvasGraph(bundle);
  const object = ensured.canvasGraph!.objects[objectId];
  if (!object) {
    throw new Error(`Unknown variation target object: ${objectId}`);
  }
  return object;
}

function validateDirectionScope(
  bundle: ProjectBundle,
  targetObjectId: string,
  operations: CanvasOperation[],
  patches: EditPatch[]
): void {
  const target = requireCanvasObject(bundle, targetObjectId);
  for (const operation of operations) {
    if (operation.objectId !== targetObjectId) {
      throw new Error("Variation operations must stay scoped to the selected object.");
    }
  }
  for (const patch of patches) {
    if (!target.nodeId || patch.nodeId !== target.nodeId) {
      throw new Error("Variation patches must stay scoped to the selected node.");
    }
  }
}

function validateAgentGeneratedDirection(
  bundle: ProjectBundle,
  set: { targetObjectId: string; sourceRevision: string },
  direction: VariationDirection
): void {
  if (!isAgentOutputProvenance(direction.provenance)) {
    return;
  }
  const target = requireCanvasObject(bundle, set.targetObjectId);
  const diagnostics = validateAgentDirectionSafety({
    targetObjectId: set.targetObjectId,
    ...(target.nodeId ? { targetNodeId: target.nodeId } : {}),
    sourceRevision: set.sourceRevision,
    operations: direction.operations,
    patches: direction.patches,
    createdAt: direction.createdAt
  });
  if (diagnostics.length > 0) {
    throw new Error(`Agent variation direction failed validation: ${diagnostics.map((diagnostic) => diagnostic.code).join(", ")}`);
  }
}

function isAgentOutputProvenance(provenance: string): boolean {
  return provenance.startsWith("agent-output:");
}

function assertFreshRevision(bundle: ProjectBundle, baseRevision: string): void {
  if (baseRevision !== bundle.baseRevision) {
    throw new Error(`Stale variation operation revision: ${baseRevision}`);
  }
}

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must not be empty.`);
  }
  return trimmed;
}
