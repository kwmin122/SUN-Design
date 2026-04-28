import { ensureCanvasGraph } from "./canvas-graph.js";
import { stableHash } from "./ids.js";
import {
  assertPresentationStateIntegrity,
  assertPrototypeInteractionIntegrity
} from "./integrity.js";
import {
  ComponentStateRuleSchema,
  PresentationStateSchema,
  ProjectBundleSchema,
  PrototypeGraphSchema,
  PrototypeInteractionSchema,
  PrototypeVariableSchema,
  type ComponentStateRule,
  type PresentationState,
  type ProjectBundle,
  type PrototypeInteraction,
  type PrototypeVariable
} from "./schemas.js";

type PrototypeVariableInput = Omit<PrototypeVariable, "id" | "modeValues"> & {
  id?: string;
  modeValues?: string[];
};
type PrototypeInteractionInput = Omit<PrototypeInteraction, "id" | "createdAt" | "provenance" | "conditions"> & {
  id?: string;
  provenance?: string;
  createdAt?: string;
  conditions?: PrototypeInteraction["conditions"];
};
type ComponentStateRuleInput = Omit<ComponentStateRule, "id" | "variableBindings" | "conditions"> & {
  id?: string;
  variableBindings?: ComponentStateRule["variableBindings"];
  conditions?: ComponentStateRule["conditions"];
};
type ComponentState = PresentationState["componentStates"][string];

export function ensurePrototypeGraph(
  bundle: ProjectBundle,
  createdAt = new Date().toISOString()
): ProjectBundle {
  const ensured = ensureCanvasGraph(bundle);
  if (ensured.prototypeGraph) {
    return ensured;
  }
  return ProjectBundleSchema.parse({
    ...ensured,
    prototypeGraph: PrototypeGraphSchema.parse({
      version: 1,
      interactions: [],
      variables: [],
      stateRules: [],
      updatedAt: createdAt
    }),
    updatedAt: createdAt
  });
}

export function addPrototypeVariable(
  bundle: ProjectBundle,
  input: PrototypeVariableInput
): ProjectBundle {
  const current = ensurePrototypeGraph(bundle);
  const graph = current.prototypeGraph!;
  const name = input.name.trim();
  if (!name) {
    throw new Error("Prototype variable name must not be empty.");
  }
  if (graph.variables.some((variable) => normalizedName(variable.name) === normalizedName(name))) {
    throw new Error(`Duplicate prototype variable: ${name}`);
  }
  if (input.sharedComponentId && !current.canvasGraph?.components[input.sharedComponentId]) {
    throw new Error(`Unknown shared component: ${input.sharedComponentId}`);
  }
  const variable = PrototypeVariableSchema.parse({
    ...input,
    id: input.id ?? `proto_var_${stableHash(`${current.id}:${name}`)}`,
    name
  });
  const updatedAt = new Date().toISOString();
  return ProjectBundleSchema.parse({
    ...current,
    prototypeGraph: {
      ...graph,
      variables: [...graph.variables, variable],
      updatedAt
    },
    updatedAt
  });
}

export function addPrototypeInteraction(
  bundle: ProjectBundle,
  input: PrototypeInteractionInput
): ProjectBundle {
  const current = ensurePrototypeGraph(bundle);
  const graph = current.prototypeGraph!;
  const createdAt = input.createdAt ?? new Date().toISOString();
  validateInteraction(current, input);
  const interaction = PrototypeInteractionSchema.parse({
    ...input,
    id: input.id ?? `proto_ix_${stableHash(`${current.id}:${input.sourceObjectId}:${input.trigger}:${input.action}:${createdAt}`)}`,
    provenance: input.provenance ?? "prototype-panel",
    createdAt
  });
  return ProjectBundleSchema.parse({
    ...current,
    prototypeGraph: {
      ...graph,
      interactions: [...graph.interactions, interaction],
      updatedAt: createdAt
    },
    updatedAt: createdAt
  });
}

export function addComponentStateRule(
  bundle: ProjectBundle,
  input: ComponentStateRuleInput
): ProjectBundle {
  const current = ensurePrototypeGraph(bundle);
  const graph = current.prototypeGraph!;
  const component = current.canvasGraph?.components[input.componentId];
  if (!component) {
    throw new Error(`Unknown component: ${input.componentId}`);
  }
  if (input.variantId && !component.variants.some((variant) => variant.id === input.variantId)) {
    throw new Error(`Unknown component variant: ${input.variantId}`);
  }
  validateConditions(graph.variables, input.conditions);
  for (const variableId of Object.keys(input.variableBindings ?? {})) {
    if (!graph.variables.some((variable) => variable.id === variableId)) {
      throw new Error(`Unknown prototype variable: ${variableId}`);
    }
  }
  const updatedAt = new Date().toISOString();
  const rule = ComponentStateRuleSchema.parse({
    ...input,
    id: input.id ?? `state_rule_${stableHash(`${component.id}:${input.variantId ?? "base"}:${input.state}`)}`
  });
  return ProjectBundleSchema.parse({
    ...current,
    prototypeGraph: {
      ...graph,
      stateRules: [...graph.stateRules, rule],
      updatedAt
    },
    updatedAt
  });
}

export function createPresentationState(
  bundle: ProjectBundle,
  input: Partial<PresentationState> = {}
): PresentationState {
  const current = ensurePrototypeGraph(bundle);
  const state = PresentationStateSchema.parse({
    mode: "present",
    activeObjectId: input.activeObjectId ?? current.canvasGraph?.rootObjectIds[0],
    activeSlideId: input.activeSlideId,
    activeInteractionId: input.activeInteractionId,
    variableValues: input.variableValues ?? Object.fromEntries(
      current.prototypeGraph!.variables.map((variable) => [variable.id, variable.defaultValue])
    ),
    componentStates: input.componentStates ?? {},
    history: input.history ?? [],
    startedAt: input.startedAt ?? new Date().toISOString()
  });
  assertPresentationStateIntegrity(current, state);
  return state;
}

export function playPrototypeInteraction(
  bundle: ProjectBundle,
  state: PresentationState,
  interactionId: string
): PresentationState {
  const current = ensurePrototypeGraph(bundle);
  const interaction = current.prototypeGraph!.interactions.find((item) => item.id === interactionId);
  if (!interaction) {
    throw new Error(`Unknown prototype interaction: ${interactionId}`);
  }
  assertPresentationStateIntegrity(current, state);
  assertPrototypeInteractionIntegrity(current, interaction);
  if (!conditionsPass(current.prototypeGraph!.variables, state.variableValues, interaction.conditions)) {
    return state;
  }
  const variableValues = { ...state.variableValues };
  const componentStates = { ...state.componentStates };
  let activeObjectId = state.activeObjectId;

  if (interaction.action === "navigateTo" || interaction.action === "openOverlay") {
    activeObjectId = interaction.targetObjectId ?? activeObjectId;
  }
  if (interaction.action === "closeOverlay") {
    activeObjectId = interaction.sourceObjectId;
  }
  if (interaction.action === "setVariable" && interaction.variableId) {
    variableValues[interaction.variableId] = interaction.value;
  }
  if (interaction.action === "toggleVariable" && interaction.variableId) {
    variableValues[interaction.variableId] = !Boolean(variableValues[interaction.variableId]);
  }
  if (interaction.action === "setComponentState" && interaction.targetObjectId) {
    componentStates[interaction.targetObjectId] = asComponentState(interaction.value ?? "default");
  }

  const nextState = PresentationStateSchema.parse({
    ...state,
    mode: "present",
    activeObjectId,
    activeInteractionId: interaction.id,
    variableValues,
    componentStates,
    history: [...state.history, interaction.id]
  });
  assertPresentationStateIntegrity(current, nextState);
  return nextState;
}

function validateInteraction(bundle: ProjectBundle, input: PrototypeInteractionInput): void {
  const objects = bundle.canvasGraph?.objects ?? {};
  if (!objects[input.sourceObjectId]) {
    throw new Error(`Unknown prototype source object: ${input.sourceObjectId}`);
  }
  if (input.targetObjectId && !objects[input.targetObjectId]) {
    throw new Error(`Unknown prototype target object: ${input.targetObjectId}`);
  }
  if (input.trigger === "keyboard" && !isSafeKey(input.key)) {
    throw new Error("Keyboard prototype interactions require a safe key.");
  }
  if (input.trigger === "timed" && (!input.delayMs || input.delayMs <= 0)) {
    throw new Error("Timed prototype interactions require delayMs > 0.");
  }
  const variables = bundle.prototypeGraph?.variables ?? [];
  if ((input.action === "setVariable" || input.action === "toggleVariable") && !input.variableId) {
    throw new Error("Variable prototype actions require variableId.");
  }
  if (input.variableId && !variables.some((variable) => variable.id === input.variableId)) {
    throw new Error(`Unknown prototype variable: ${input.variableId}`);
  }
  validateConditions(variables, input.conditions);
}

function validateConditions(variables: PrototypeVariable[], conditions: Array<{ variableId: string }> | undefined): void {
  for (const condition of conditions ?? []) {
    if (!variables.some((variable) => variable.id === condition.variableId)) {
      throw new Error(`Unknown prototype condition variable: ${condition.variableId}`);
    }
  }
}

function conditionsPass(
  variables: PrototypeVariable[],
  values: Record<string, unknown>,
  conditions: PrototypeInteraction["conditions"]
): boolean {
  validateConditions(variables, conditions);
  return conditions.every((condition) => {
    const actual = values[condition.variableId];
    switch (condition.operator) {
      case "equals":
        return actual === condition.value;
      case "notEquals":
        return actual !== condition.value;
      case "isTruthy":
        return Boolean(actual);
      case "isFalsy":
        return !actual;
    }
  });
}

function isSafeKey(key: string | undefined): boolean {
  return Boolean(key?.trim()) && !/[<>"';]/.test(key!) && !/javascript:/i.test(key!);
}

function asComponentState(value: unknown): ComponentState {
  if (value === "default" || value === "hover" || value === "pressed" || value === "disabled") {
    return value;
  }
  throw new Error(`Invalid component state: ${String(value)}`);
}

function normalizedName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}
