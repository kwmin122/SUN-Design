import type {
  AgentContextPackage,
  AgentOutputEnvelope,
  AgentRecipe,
  AgentRun,
  CanvasOperation,
  PresentationState,
  ProjectBundle,
  PrototypeCondition,
  PrototypeInteraction,
  SlideBlock,
  SlideFeedback,
  VariationDirection,
  VariationSet
} from "./schemas.js";
import { validateAgentDirectionSafety, validateAgentOutputScope } from "./agent-output.js";

const COMPONENT_STATES = new Set(["default", "hover", "pressed", "disabled"]);

export function assertProjectBundleIntegrity(bundle: ProjectBundle): void {
  assertPrototypeIntegrity(bundle);
  assertPresentationIntegrity(bundle);
  assertSlideDeckIntegrity(bundle);
  assertVariationIntegrity(bundle);
  assertAgentRecipeIntegrity(bundle);
  assertAgentContextPackageIntegrity(bundle);
  assertAgentOutputIntegrity(bundle);
  assertAgentRunIntegrity(bundle);
}

function assertPrototypeIntegrity(bundle: ProjectBundle): void {
  const graph = bundle.prototypeGraph;
  if (!graph) {
    return;
  }

  const variableIds = new Set(graph.variables.map((variable) => variable.id));
  const componentIds = new Set(Object.keys(bundle.canvasGraph?.components ?? {}));

  for (const variable of graph.variables) {
    if (variable.sharedComponentId && !componentIds.has(variable.sharedComponentId)) {
      throw new Error(`Prototype variable references missing shared component: ${variable.sharedComponentId}`);
    }
  }

  for (const interaction of graph.interactions) {
    assertPrototypeInteractionIntegrity(bundle, interaction);
  }

  for (const rule of graph.stateRules) {
    const component = bundle.canvasGraph?.components[rule.componentId];
    if (!component) {
      throw new Error(`Prototype state rule references missing component: ${rule.componentId}`);
    }
    if (rule.variantId && !component.variants.some((variant) => variant.id === rule.variantId)) {
      throw new Error(`Prototype state rule references missing component variant: ${rule.variantId}`);
    }
    for (const variableId of Object.keys(rule.variableBindings)) {
      assertKnownVariable(variableIds, variableId, "Prototype state rule");
    }
    assertKnownConditions(variableIds, rule.conditions, "Prototype state rule");
  }
}

export function assertPrototypeInteractionIntegrity(
  bundle: ProjectBundle,
  interaction: PrototypeInteraction
): void {
  const variableIds = new Set(bundle.prototypeGraph?.variables.map((variable) => variable.id) ?? []);
  assertCanvasObject(bundle, interaction.sourceObjectId, "Prototype interaction source");
  if (interaction.targetObjectId) {
    assertCanvasObject(bundle, interaction.targetObjectId, "Prototype interaction target");
  }
  if (interaction.trigger === "keyboard" && !isSafeKey(interaction.key)) {
    throw new Error("Prototype keyboard interaction requires a safe key.");
  }
  if (interaction.trigger === "timed" && (!interaction.delayMs || interaction.delayMs <= 0)) {
    throw new Error("Prototype timed interaction requires delayMs > 0.");
  }
  if ((interaction.action === "setVariable" || interaction.action === "toggleVariable") && !interaction.variableId) {
    throw new Error("Prototype variable action requires variableId.");
  }
  if (interaction.variableId) {
    assertKnownVariable(variableIds, interaction.variableId, "Prototype interaction");
  }
  if (interaction.action === "setComponentState" && !COMPONENT_STATES.has(String(interaction.value ?? "default"))) {
    throw new Error(`Prototype interaction has invalid component state: ${String(interaction.value)}`);
  }
  assertKnownConditions(variableIds, interaction.conditions, "Prototype interaction");
}

function assertPresentationIntegrity(bundle: ProjectBundle): void {
  if (!bundle.presentationState) {
    return;
  }
  assertPresentationStateIntegrity(bundle, bundle.presentationState);
}

export function assertPresentationStateIntegrity(bundle: ProjectBundle, state: PresentationState): void {
  const variableIds = new Set(bundle.prototypeGraph?.variables.map((variable) => variable.id) ?? []);
  const interactionIds = new Set(bundle.prototypeGraph?.interactions.map((interaction) => interaction.id) ?? []);

  if (state.activeObjectId) {
    assertCanvasObject(bundle, state.activeObjectId, "Presentation active object");
  }
  if (state.activeSlideId) {
    assertSlideExists(bundle, state.activeSlideId, "Presentation active slide");
  }
  if (state.activeInteractionId && !interactionIds.has(state.activeInteractionId)) {
    throw new Error(`Presentation state references missing interaction: ${state.activeInteractionId}`);
  }
  for (const variableId of Object.keys(state.variableValues)) {
    assertKnownVariable(variableIds, variableId, "Presentation state");
  }
  for (const objectId of Object.keys(state.componentStates)) {
    assertCanvasObject(bundle, objectId, "Presentation component state");
  }
  for (const interactionId of state.history) {
    if (!interactionIds.has(interactionId)) {
      throw new Error(`Presentation history references missing interaction: ${interactionId}`);
    }
  }
}

function assertSlideDeckIntegrity(bundle: ProjectBundle): void {
  const interactionIds = new Set(bundle.prototypeGraph?.interactions.map((interaction) => interaction.id) ?? []);

  for (const deck of bundle.slideDecks) {
    const slideIds = new Set(deck.slides.map((slide) => slide.id));
    if (deck.activeSlideId && !slideIds.has(deck.activeSlideId)) {
      throw new Error(`Slide deck references missing active slide: ${deck.activeSlideId}`);
    }

    for (const slide of deck.slides) {
      const blockIds = new Set(slide.blocks.map((block) => block.id));
      const pollIds = new Set(slide.feedback.filter((item) => item.kind === "poll").map((item) => item.id));
      for (const block of slide.blocks) {
        assertSlideBlockIntegrity(bundle, interactionIds, block);
      }
      for (const feedback of slide.feedback) {
        assertSlideFeedbackIntegrity(blockIds, pollIds, feedback);
      }
    }
  }
}

function assertSlideBlockIntegrity(
  bundle: ProjectBundle,
  interactionIds: Set<string>,
  block: SlideBlock
): void {
  if (block.kind === "canvasObject") {
    if (!block.objectId) {
      throw new Error(`Slide block requires canvas object id: ${block.id}`);
    }
    assertCanvasObject(bundle, block.objectId, "Slide block");
  }
  if (block.kind === "prototypeBlock") {
    if (!block.interactionId || !interactionIds.has(block.interactionId)) {
      throw new Error(`Slide block references missing prototype interaction: ${block.interactionId ?? ""}`);
    }
  }
}

function assertSlideFeedbackIntegrity(
  blockIds: Set<string>,
  pollIds: Set<string>,
  feedback: SlideFeedback
): void {
  if (feedback.kind === "poll" && (feedback.choices.length < 2 || feedback.choices.length > 6)) {
    throw new Error(`Slide poll feedback requires 2-6 choices: ${feedback.id}`);
  }
  if (feedback.kind === "alignment" && (!Number.isInteger(feedback.value) || feedback.value! < 1 || feedback.value! > 5)) {
    throw new Error(`Slide alignment feedback requires value 1-5: ${feedback.id}`);
  }
  if (feedback.kind === "vote") {
    if (!feedback.targetId || (!blockIds.has(feedback.targetId) && !pollIds.has(feedback.targetId))) {
      throw new Error(`Slide vote feedback references missing target: ${feedback.targetId ?? ""}`);
    }
  }
}

function assertVariationIntegrity(bundle: ProjectBundle): void {
  for (const set of bundle.variationSets) {
    assertCanvasObject(bundle, set.targetObjectId, "Variation set");
    if (set.promotedDirectionId && !set.directions.some((direction) => direction.id === set.promotedDirectionId)) {
      throw new Error(`Variation set references missing promoted direction: ${set.promotedDirectionId}`);
    }
    for (const direction of set.directions) {
      assertVariationDirectionIntegrity(bundle, set, direction);
    }
  }
}

function assertVariationDirectionIntegrity(
  bundle: ProjectBundle,
  set: VariationSet,
  direction: VariationDirection
): void {
  if (direction.targetObjectId !== set.targetObjectId) {
    throw new Error(`Variation direction target does not match selected object: ${direction.id}`);
  }
  const target = assertCanvasObject(bundle, direction.targetObjectId, "Variation direction");
  for (const operation of direction.operations) {
    assertVariationOperationIntegrity(bundle, set, direction, operation);
  }
  for (const patch of direction.patches) {
    if (!target.nodeId || patch.nodeId !== target.nodeId) {
      throw new Error(`Variation patch must stay scoped to the selected node: ${patch.id}`);
    }
    if (!bundle.editGraph.nodes[patch.nodeId]) {
      throw new Error(`Variation patch references missing edit node: ${patch.nodeId}`);
    }
    if (patch.baseRevision !== set.sourceRevision) {
      throw new Error(`Variation patch revision does not match source revision: ${patch.id}`);
    }
  }
  if (isAgentOutputProvenance(direction.provenance)) {
    const diagnostics = validateAgentDirectionSafety({
      targetObjectId: set.targetObjectId,
      ...(target.nodeId ? { targetNodeId: target.nodeId } : {}),
      sourceRevision: set.sourceRevision,
      operations: direction.operations,
      patches: direction.patches,
      createdAt: direction.createdAt
    });
    if (diagnostics.length > 0) {
      throw new Error(`Agent variation direction failed persisted validation: ${formatDiagnosticCodes(diagnostics)}`);
    }
  }
}

function assertVariationOperationIntegrity(
  bundle: ProjectBundle,
  set: VariationSet,
  direction: VariationDirection,
  operation: CanvasOperation
): void {
  assertCanvasObject(bundle, operation.objectId, "Variation operation");
  if (operation.objectId !== direction.targetObjectId) {
    throw new Error(`Variation operation must stay scoped to the selected object: ${operation.id}`);
  }
  if (operation.baseRevision !== set.sourceRevision) {
    throw new Error(`Variation operation revision does not match source revision: ${operation.id}`);
  }
}

function assertAgentRecipeIntegrity(bundle: ProjectBundle): void {
  const operationIds = new Set([
    ...bundle.canvasOperations.map((operation) => operation.id),
    ...bundle.patches.map((patch) => patch.id),
    ...bundle.variationSets.flatMap((set) => set.directions.flatMap((direction) => [
      ...direction.operations.map((operation) => operation.id),
      ...direction.patches.map((patch) => patch.id)
    ]))
  ]);

  for (const recipe of bundle.agentRecipes) {
    assertAgentRecipeRefs(bundle, recipe, operationIds);
  }
}

function assertAgentRecipeRefs(
  bundle: ProjectBundle,
  recipe: AgentRecipe,
  operationIds: Set<string>
): void {
  assertCanvasObject(bundle, recipe.targetObjectId, "Agent recipe");
  const set = recipe.variationSetId
    ? bundle.variationSets.find((item) => item.id === recipe.variationSetId)
    : undefined;
  if (recipe.variationSetId && !set) {
    throw new Error(`Agent recipe references missing variation set: ${recipe.variationSetId}`);
  }
  if (recipe.directionId) {
    const directionExists = set
      ? set.directions.some((direction) => direction.id === recipe.directionId)
      : bundle.variationSets.some((item) => item.directions.some((direction) => direction.id === recipe.directionId));
    if (!directionExists) {
      throw new Error(`Agent recipe references missing variation direction: ${recipe.directionId}`);
    }
  }
  for (const operationId of recipe.operationIds) {
    if (!operationIds.has(operationId)) {
      throw new Error(`Agent recipe references missing operation id: ${operationId}`);
    }
  }
}

function assertAgentContextPackageIntegrity(bundle: ProjectBundle): void {
  for (const contextPackage of bundle.agentContextPackages) {
    assertAgentContextPackageRefs(bundle, contextPackage);
  }
}

function assertAgentContextPackageRefs(bundle: ProjectBundle, contextPackage: AgentContextPackage): void {
  assertCanvasObject(bundle, contextPackage.targetObjectId, "Agent context package");
  if (contextPackage.selectedObject.id !== contextPackage.targetObjectId) {
    throw new Error(`Agent context selected object does not match target: ${contextPackage.id}`);
  }
}

function assertAgentOutputIntegrity(bundle: ProjectBundle): void {
  const contextPackages = new Map(bundle.agentContextPackages.map((contextPackage) => [contextPackage.id, contextPackage]));
  for (const output of bundle.agentOutputs) {
    assertAgentOutputRefs(bundle, contextPackages, output);
  }
}

function assertAgentOutputRefs(
  bundle: ProjectBundle,
  contextPackages: Map<string, AgentContextPackage>,
  output: AgentOutputEnvelope
): void {
  const contextPackage = contextPackages.get(output.contextPackageId);
  if (!contextPackage) {
    throw new Error(`Agent output references missing context package: ${output.contextPackageId}`);
  }
  if (output.targetObjectId !== contextPackage.targetObjectId) {
    throw new Error(`Agent output target does not match context package: ${output.id}`);
  }
  if (output.sourceRevision !== contextPackage.sourceRevision) {
    throw new Error(`Agent output revision does not match context package: ${output.id}`);
  }
  const target = assertCanvasObject(bundle, output.targetObjectId, "Agent output");
  for (const direction of output.directions) {
    if (direction.targetObjectId !== output.targetObjectId) {
      throw new Error(`Agent output direction target does not match output target: ${direction.id}`);
    }
    for (const operation of direction.operations) {
      assertCanvasObject(bundle, operation.objectId, "Agent output operation");
      if (operation.objectId !== output.targetObjectId) {
        throw new Error(`Agent output operation must stay scoped to selected object: ${operation.id}`);
      }
      if (operation.baseRevision !== output.sourceRevision) {
        throw new Error(`Agent output operation revision does not match source revision: ${operation.id}`);
      }
    }
    for (const patch of direction.patches) {
      if (!target.nodeId || patch.nodeId !== target.nodeId) {
        throw new Error(`Agent output patch must stay scoped to selected node: ${patch.id}`);
      }
      if (!bundle.editGraph.nodes[patch.nodeId]) {
        throw new Error(`Agent output patch references missing edit node: ${patch.nodeId}`);
      }
      if (patch.baseRevision !== output.sourceRevision) {
        throw new Error(`Agent output patch revision does not match source revision: ${patch.id}`);
      }
    }
  }
  const diagnostics = validateAgentOutputScope(bundle, contextPackage, output);
  if (diagnostics.length > 0) {
    throw new Error(`Agent output failed persisted validation: ${formatDiagnosticCodes(diagnostics)}`);
  }
}

function assertAgentRunIntegrity(bundle: ProjectBundle): void {
  const contextPackages = new Map(bundle.agentContextPackages.map((contextPackage) => [contextPackage.id, contextPackage]));
  const outputs = new Map(bundle.agentOutputs.map((output) => [output.id, output]));
  for (const run of bundle.agentRuns) {
    assertAgentRunRefs(bundle, contextPackages, outputs, run);
  }
}

function assertAgentRunRefs(
  bundle: ProjectBundle,
  contextPackages: Map<string, AgentContextPackage>,
  outputs: Map<string, AgentOutputEnvelope>,
  run: AgentRun
): void {
  assertCanvasObject(bundle, run.targetObjectId, "Agent run");
  const contextPackage = contextPackages.get(run.contextPackageId);
  if (!contextPackage) {
    throw new Error(`Agent run references missing context package: ${run.contextPackageId}`);
  }
  if (run.targetObjectId !== contextPackage.targetObjectId) {
    throw new Error(`Agent run target does not match context package: ${run.id}`);
  }
  if (run.sourceRevision !== contextPackage.sourceRevision) {
    throw new Error(`Agent run revision does not match context package: ${run.id}`);
  }
  if (run.outputId) {
    const output = outputs.get(run.outputId);
    if (!output) {
      throw new Error(`Agent run references missing output id: ${run.outputId}`);
    }
    if (run.runtime !== output.runtime) {
      throw new Error(`Agent run runtime does not match output runtime: ${run.id}`);
    }
    if (run.contextPackageId !== output.contextPackageId) {
      throw new Error(`Agent run context does not match output context: ${run.id}`);
    }
    if (run.targetObjectId !== output.targetObjectId) {
      throw new Error(`Agent run target does not match output target: ${run.id}`);
    }
    if (run.sourceRevision !== output.sourceRevision) {
      throw new Error(`Agent run revision does not match output revision: ${run.id}`);
    }
  }
}

function isAgentOutputProvenance(provenance: string): boolean {
  return provenance.startsWith("agent-output:");
}

function formatDiagnosticCodes(diagnostics: { code: string }[]): string {
  return diagnostics.map((diagnostic) => diagnostic.code).join(", ");
}

function assertCanvasObject(bundle: ProjectBundle, objectId: string, label: string) {
  const object = bundle.canvasGraph?.objects[objectId];
  if (!object) {
    throw new Error(`${label} references missing canvas object: ${objectId}`);
  }
  return object;
}

function assertSlideExists(bundle: ProjectBundle, slideId: string, label: string): void {
  if (!bundle.slideDecks.some((deck) => deck.slides.some((slide) => slide.id === slideId))) {
    throw new Error(`${label} references missing slide: ${slideId}`);
  }
}

function assertKnownVariable(variableIds: Set<string>, variableId: string, label: string): void {
  if (!variableIds.has(variableId)) {
    throw new Error(`${label} references missing prototype variable: ${variableId}`);
  }
}

function assertKnownConditions(
  variableIds: Set<string>,
  conditions: PrototypeCondition[],
  label: string
): void {
  for (const condition of conditions) {
    assertKnownVariable(variableIds, condition.variableId, label);
  }
}

function isSafeKey(key: string | undefined): boolean {
  return Boolean(key?.trim()) && !/[<>"';]/.test(key!) && !/javascript:/i.test(key!);
}
