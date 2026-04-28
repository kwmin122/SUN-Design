import { stableHash } from "./ids.js";
import type {
  CanvasComponentDefinition,
  CanvasComponentInstance,
  CanvasComponentVariant,
  CanvasGraph
} from "./schemas.js";

export function createLocalComponentDefinition(input: {
  graph: CanvasGraph;
  sourceObjectId: string;
  name: string;
  createdAt: string;
}): CanvasComponentDefinition {
  const source = input.graph.objects[input.sourceObjectId];
  if (!source) {
    throw new Error(`Unknown component source object: ${input.sourceObjectId}`);
  }
  const id = `component_${stableHash(`${input.sourceObjectId}:${input.name}:${input.createdAt}`)}`;
  return {
    id,
    name: input.name,
    sourceObjectId: input.sourceObjectId,
    slotObjectIds: [...source.childIds],
    props: [
      { id: `${id}_prop_label`, name: "label", kind: "text", defaultValue: source.name },
      { id: `${id}_prop_tone`, name: "tone", kind: "color", defaultValue: "#171717" }
    ],
    variants: [
      { id: `${id}_variant_default`, name: "Default", props: {} },
      { id: `${id}_variant_emphasis`, name: "Emphasis", props: { tone: "#2f9f8f" } }
    ],
    createdAt: input.createdAt
  };
}

export function createLocalComponentInstance(input: {
  graph: CanvasGraph;
  componentId: string;
  targetObjectId: string;
  variantId?: string;
  createdAt: string;
}): CanvasComponentInstance {
  const component = input.graph.components[input.componentId];
  if (!component) {
    throw new Error(`Unknown component: ${input.componentId}`);
  }
  if (!input.graph.objects[input.targetObjectId]) {
    throw new Error(`Unknown component target object: ${input.targetObjectId}`);
  }
  const variant = resolveComponentVariant(component, input.variantId);
  if (input.variantId && !variant) {
    throw new Error(`Unknown component variant: ${input.variantId}`);
  }
  const instance: CanvasComponentInstance = {
    id: `instance_${stableHash(`${input.componentId}:${input.targetObjectId}:${input.createdAt}`)}`,
    componentId: input.componentId,
    objectId: input.targetObjectId,
    state: "default",
    overrides: {},
    detached: false
  };
  const variantId = variant?.id ?? component.variants[0]?.id;
  if (variantId) {
    instance.variantId = variantId;
  }
  return instance;
}

export function updateComponentOverride(
  instance: CanvasComponentInstance,
  key: string,
  value: unknown
): CanvasComponentInstance {
  if (!key.trim()) {
    throw new Error("Component override key must not be empty.");
  }
  return {
    ...instance,
    overrides: {
      ...instance.overrides,
      [key]: value
    }
  };
}

export function resolveComponentVariant(
  component: CanvasComponentDefinition,
  variantId: string | undefined
): CanvasComponentVariant | undefined {
  if (!variantId) {
    return component.variants[0];
  }
  return component.variants.find((variant) => variant.id === variantId);
}

export function summarizeComponentInstance(
  graph: CanvasGraph,
  instanceId: string
): { componentName: string; objectName: string; variantName: string; state: string; overrideCount: number } {
  const instance = graph.instances[instanceId];
  if (!instance) {
    throw new Error(`Unknown component instance: ${instanceId}`);
  }
  const component = graph.components[instance.componentId];
  if (!component) {
    throw new Error(`Unknown component: ${instance.componentId}`);
  }
  const object = graph.objects[instance.objectId];
  if (!object) {
    throw new Error(`Unknown component object: ${instance.objectId}`);
  }
  const variant = resolveComponentVariant(component, instance.variantId);
  return {
    componentName: component.name,
    objectName: object.name,
    variantName: variant?.name ?? "Default",
    state: instance.state,
    overrideCount: Object.keys(instance.overrides).length
  };
}
