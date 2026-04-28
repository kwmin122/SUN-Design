import { stableHash } from "./ids.js";
import type {
  CanvasComponentDefinition,
  CanvasComponentInstance,
  CanvasComponentProp,
  CanvasComponentVariant,
  CanvasGraph,
  CanvasObject
} from "./schemas.js";

type ComponentPropInput = Omit<CanvasComponentProp, "id"> & { id?: string };
type ComponentVariantInput = Omit<CanvasComponentVariant, "id"> & { id?: string };

export function createLocalComponentDefinition(input: {
  graph: CanvasGraph;
  sourceObjectId: string;
  name: string;
  props?: ComponentPropInput[];
  variants?: ComponentVariantInput[];
  createdAt: string;
}): CanvasComponentDefinition {
  const source = input.graph.objects[input.sourceObjectId];
  if (!source) {
    throw new Error(`Unknown component source object: ${input.sourceObjectId}`);
  }
  const id = `component_${stableHash(`${input.sourceObjectId}:${input.name}:${input.createdAt}`)}`;
  const props = input.props?.length
    ? input.props.map((prop, index) => normalizeComponentProp(id, prop, index))
    : inferPropsFromObject(id, source);
  const variants = normalizeComponentVariants(id, input.variants ?? []);
  return {
    id,
    name: input.name,
    sourceObjectId: input.sourceObjectId,
    slotObjectIds: [...source.childIds],
    props,
    variants,
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
    variantName: variant?.name ?? "Base",
    state: instance.state,
    overrideCount: Object.keys(instance.overrides).length
  };
}

function inferPropsFromObject(componentId: string, source: CanvasObject): CanvasComponentProp[] {
  const props: CanvasComponentProp[] = [
    {
      id: `${componentId}_prop_name`,
      name: "name",
      kind: "text",
      defaultValue: source.name
    },
    {
      id: `${componentId}_prop_visible`,
      name: "visible",
      kind: "boolean",
      defaultValue: !source.hidden
    }
  ];

  source.childIds.forEach((childId, index) => {
    props.push({
      id: `${componentId}_prop_slot_${index + 1}`,
      name: `slot${index + 1}`,
      kind: "slot",
      defaultValue: childId
    });
  });

  if (source.constraints?.width !== undefined) {
    props.push({
      id: `${componentId}_prop_width`,
      name: "width",
      kind: "number",
      defaultValue: source.constraints.width
    });
  }

  return props;
}

function normalizeComponentProp(
  componentId: string,
  prop: ComponentPropInput,
  index: number
): CanvasComponentProp {
  if (!prop.name.trim()) {
    throw new Error("Component prop name must not be empty.");
  }
  return {
    id: prop.id ?? `${componentId}_prop_${stableHash(`${prop.name}:${index}`)}`,
    name: prop.name.trim(),
    kind: prop.kind,
    ...(prop.defaultValue !== undefined ? { defaultValue: prop.defaultValue } : {})
  };
}

function normalizeComponentVariants(
  componentId: string,
  variants: ComponentVariantInput[]
): CanvasComponentVariant[] {
  const normalized: CanvasComponentVariant[] = [
    { id: `${componentId}_variant_base`, name: "Base", props: {} }
  ];
  const seen = new Set(["Base"]);

  variants.forEach((variant, index) => {
    const name = variant.name.trim();
    if (!name || seen.has(name)) {
      return;
    }
    seen.add(name);
    normalized.push({
      id: variant.id ?? `${componentId}_variant_${stableHash(`${name}:${index}`)}`,
      name,
      props: { ...variant.props }
    });
  });

  return normalized;
}
