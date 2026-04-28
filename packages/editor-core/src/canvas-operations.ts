import {
  createLocalComponentDefinition,
  createLocalComponentInstance,
  resolveComponentVariant
} from "./canvas-components.js";
import { assertCanvasGraphIntegrity, ensureCanvasGraph } from "./canvas-graph.js";
import { applyEditPatchToBundle } from "./patches.js";
import {
  CanvasConstraintsSchema,
  CanvasOperationSchema,
  ProjectBundleSchema,
  type CanvasComponentProp,
  type CanvasComponentVariant,
  type CanvasConstraints,
  type CanvasGraph,
  type CanvasComponentInstance,
  type CanvasObject,
  type CanvasOperation,
  type ProjectBundle
} from "./schemas.js";

type MutableGraph = CanvasGraph;

export function applyCanvasOperationToBundle(
  bundle: ProjectBundle,
  operationInput: CanvasOperation
): ProjectBundle {
  const operation = CanvasOperationSchema.parse(operationInput);
  const ensured = ensureCanvasGraph(bundle);
  const graph = cloneGraph(ensured.canvasGraph);
  const object = graph.objects[operation.objectId];
  if (!object) {
    throw new Error(`Unknown canvas object: ${operation.objectId}`);
  }
  if (object.locked && operation.op !== "setObjectLock") {
    throw new Error(`Canvas object is locked: ${operation.objectId}`);
  }

  let nextBundle: ProjectBundle | undefined;
  switch (operation.op) {
    case "setObjectName": {
      const value = asNameValue(operation.value);
      graph.objects[operation.objectId] = { ...object, name: value.name };
      break;
    }
    case "setObjectVisibility": {
      const value = asVisibilityValue(operation.value);
      graph.objects[operation.objectId] = { ...object, hidden: value.hidden };
      nextBundle = persistGraph(ensured, graph, operation);
      if (object.nodeId) {
        return applyEditPatchToBundle(nextBundle, {
          id: `${operation.id}_visibility`,
          nodeId: object.nodeId,
          op: "setVisibility",
          value: !value.hidden,
          source: operation.source,
          baseRevision: nextBundle.baseRevision,
          createdAt: operation.createdAt
        });
      }
      return nextBundle;
    }
    case "setObjectLock": {
      const value = asLockValue(operation.value);
      graph.objects[operation.objectId] = { ...object, locked: value.locked };
      break;
    }
    case "reorderObject": {
      const value = asReorderValue(operation.value);
      reorderObject(graph, operation.objectId, value.parentId, value.index);
      break;
    }
    case "groupObjects": {
      const value = asGroupValue(operation.value);
      groupObjects(graph, operation, value.name, value.childObjectIds);
      break;
    }
    case "ungroupObjects":
      ungroupObject(graph, operation.objectId);
      break;
    case "setLayoutConstraints": {
      const value = asLayoutValue(operation.value);
      const constraints = mergeConstraints(object.constraints, value.constraints);
      validateLayoutConstraints(constraints);
      graph.objects[operation.objectId] = { ...object, constraints };
      nextBundle = persistGraph(ensured, graph, operation);
      if (object.nodeId) {
        const style = layoutConstraintsToStyle(constraints);
        if (Object.keys(style).length > 0) {
          return applyEditPatchToBundle(nextBundle, {
            id: `${operation.id}_layout`,
            nodeId: object.nodeId,
            op: "setStyle",
            value: style,
            source: operation.source,
            baseRevision: nextBundle.baseRevision,
            createdAt: operation.createdAt
          });
        }
      }
      return nextBundle;
    }
    case "createComponent": {
      const value = asCreateComponentValue(operation.value);
      const component = createLocalComponentDefinition({
        graph,
        sourceObjectId: value.sourceObjectId ?? operation.objectId,
        name: value.name,
        ...(value.props ? { props: value.props } : {}),
        ...(value.variants ? { variants: value.variants } : {}),
        createdAt: operation.createdAt
      });
      graph.components[component.id] = component;
      break;
    }
    case "createComponentInstance": {
      const value = asCreateInstanceValue(operation.value);
      const targetObjectId = value.targetObjectId ?? operation.objectId;
      const targetObject = requireObject(graph, targetObjectId);
      requireUnlockedObject(targetObject);
      if (targetObject.componentInstanceId) {
        throw new Error(`Canvas object already has a component instance: ${targetObjectId}`);
      }
      const instance = createLocalComponentInstance({
        graph,
        componentId: value.componentId,
        targetObjectId,
        ...(value.variantId ? { variantId: value.variantId } : {}),
        createdAt: operation.createdAt
      });
      graph.instances[instance.id] = instance;
      graph.objects[targetObjectId] = {
        ...targetObject,
        kind: "componentInstance",
        componentInstanceId: instance.id
      };
      break;
    }
    case "updateComponentOverride": {
      const value = asUpdateInstanceValue(operation.value);
      const instance = requireOwnedInstance(graph, operation.objectId, value.instanceId);
      const component = graph.components[instance.componentId];
      if (!component) {
        throw new Error(`Unknown component: ${instance.componentId}`);
      }
      if (value.variantId && !resolveComponentVariant(component, value.variantId)) {
        throw new Error(`Unknown component variant: ${value.variantId}`);
      }
      validateOverrideKeys(component.props, value.overrides);
      graph.instances[value.instanceId] = {
        ...instance,
        ...(value.variantId ? { variantId: value.variantId } : {}),
        ...(value.state ? { state: value.state } : {}),
        overrides: {
          ...instance.overrides,
          ...value.overrides
        }
      };
      break;
    }
    case "detachComponentInstance": {
      const value = asDetachInstanceValue(operation.value);
      const instance = requireOwnedInstance(graph, operation.objectId, value.instanceId);
      graph.instances[value.instanceId] = { ...instance, detached: true };
      break;
    }
  }

  return persistGraph(ensured, graph, operation);
}

export function applyCanvasOperationsToBundle(
  bundle: ProjectBundle,
  operations: CanvasOperation[]
): ProjectBundle {
  return operations.reduce((current, operation) => applyCanvasOperationToBundle(current, operation), bundle);
}

export function isLayoutValueSafe(value: string): boolean {
  return !/[<>;]/.test(value) && !/javascript:|expression\(|url\(/i.test(value);
}

export function layoutConstraintsToStyle(constraints: CanvasConstraints): Record<string, string> {
  const style: Record<string, string> = {};
  if (constraints.width !== undefined) {
    style.width = `${constraints.width}px`;
  }
  if (constraints.height !== undefined) {
    style.height = `${constraints.height}px`;
  }
  if (constraints.layout?.display) {
    style.display = constraints.layout.display;
  }
  if (constraints.layout?.gap) {
    style.gap = constraints.layout.gap;
  }
  if (constraints.layout?.padding) {
    style.padding = constraints.layout.padding;
  }
  if (constraints.layout?.alignItems) {
    style["align-items"] = constraints.layout.alignItems;
  }
  if (constraints.layout?.justifyContent) {
    style["justify-content"] = constraints.layout.justifyContent;
  }
  if (constraints.layout?.gridTemplateColumns) {
    style["grid-template-columns"] = constraints.layout.gridTemplateColumns;
  }
  if (constraints.layout?.breakpoint) {
    style["container-type"] = "inline-size";
    style["--cdx-breakpoint"] = constraints.layout.breakpoint;
  }
  return style;
}

function persistGraph(bundle: ProjectBundle, graph: MutableGraph, operation: CanvasOperation): ProjectBundle {
  const nextGraph = {
    ...graph,
    updatedAt: operation.createdAt
  };
  assertCanvasGraphIntegrity(nextGraph, new Set(Object.keys(bundle.editGraph.nodes)));
  return ProjectBundleSchema.parse({
    ...bundle,
    canvasGraph: nextGraph,
    canvasOperations: [...bundle.canvasOperations, operation],
    updatedAt: operation.createdAt
  });
}

function mergeConstraints(
  previous: CanvasConstraints | undefined,
  next: CanvasConstraints
): CanvasConstraints {
  return CanvasConstraintsSchema.parse({
    ...(previous ?? {}),
    ...next,
    pinned: {
      ...(previous?.pinned ?? {}),
      ...(next.pinned ?? {})
    },
    layout: {
      ...(previous?.layout ?? {}),
      ...(next.layout ?? {})
    }
  });
}

function validateLayoutConstraints(constraints: CanvasConstraints): void {
  for (const value of Object.values(layoutConstraintsToStyle(constraints))) {
    if (!isLayoutValueSafe(value)) {
      throw new Error(`unsafe layout value: ${value}`);
    }
  }
}

function reorderObject(graph: MutableGraph, objectId: string, parentId: string, index: number): void {
  const object = requireObject(graph, objectId);
  if (!object.parentId) {
    throw new Error("Cannot reorder root canvas object.");
  }
  if (objectId === parentId || isDescendant(graph, parentId, objectId)) {
    throw new Error("Cannot move a canvas object into itself or a descendant.");
  }
  if (!graph.objects[parentId]) {
    throw new Error(`Unknown canvas parent: ${parentId}`);
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("Invalid canvas reorder index.");
  }
  const currentParentId = object.parentId;
  const currentParent = requireObject(graph, currentParentId);
  const parent = requireObject(graph, parentId);
  requireUnlockedObject(currentParent);
  requireUnlockedObject(parent);
  if (index > parent.childIds.length) {
    throw new Error("Invalid canvas reorder index.");
  }
  removeFromParent(graph, objectId);
  const updatedParent = requireObject(graph, parentId);
  const nextChildIds = [...parent.childIds];
  if (parentId === currentParentId) {
    nextChildIds.splice(parent.childIds.indexOf(objectId), 1);
  } else {
    nextChildIds.splice(0, nextChildIds.length, ...updatedParent.childIds);
  }
  if (index > nextChildIds.length) {
    throw new Error("Invalid canvas reorder index.");
  }
  nextChildIds.splice(index, 0, objectId);
  graph.objects[parentId] = { ...updatedParent, childIds: nextChildIds };
  graph.objects[objectId] = { ...requireObject(graph, objectId), parentId };
}

function groupObjects(
  graph: MutableGraph,
  operation: CanvasOperation,
  name: string,
  childObjectIds: string[]
): void {
  if (childObjectIds.length === 0) {
    throw new Error("Group operation requires at least one child.");
  }
  if (new Set(childObjectIds).size !== childObjectIds.length) {
    throw new Error("Group child ids must be unique.");
  }
  if (!childObjectIds.includes(operation.objectId)) {
    throw new Error("Group operation object must be one of the selected children.");
  }
  const children = childObjectIds.map((id) => {
    const child = graph.objects[id];
    if (!child) {
      throw new Error(`Unknown group child object: ${id}`);
    }
    return child;
  });
  const parentId = children[0]?.parentId;
  if (!parentId || !graph.objects[parentId]) {
    throw new Error("Group children must have a known parent.");
  }
  if (children.some((child) => child.parentId !== parentId)) {
    throw new Error("Group children must share the same parent.");
  }
  const parent = graph.objects[parentId];
  requireUnlockedObject(parent);
  children.forEach(requireUnlockedObject);
  const childIndexes = childObjectIds.map((id) => parent.childIds.indexOf(id));
  if (childIndexes.some((index) => index < 0)) {
    throw new Error("Group children must be direct children of the same parent.");
  }
  const insertionIndex = Math.min(...childIndexes);
  const groupId = `obj_group_${operation.id}`;
  if (graph.objects[groupId]) {
    throw new Error(`Canvas group already exists: ${groupId}`);
  }
  const remainingChildren = parent.childIds.filter((id) => !childObjectIds.includes(id));
  remainingChildren.splice(insertionIndex, 0, groupId);
  graph.objects[parentId] = { ...parent, childIds: remainingChildren };
  graph.objects[groupId] = {
    id: groupId,
    kind: "frame",
    name,
    parentId,
    childIds: childObjectIds,
    locked: false,
    hidden: false
  };
  for (const child of children) {
    graph.objects[child.id] = { ...child, parentId: groupId };
  }
}

function ungroupObject(graph: MutableGraph, groupId: string): void {
  const group = graph.objects[groupId];
  if (!group) {
    throw new Error(`Unknown canvas group: ${groupId}`);
  }
  if (!group.id.startsWith("obj_group_") || group.nodeId) {
    throw new Error("Only synthetic canvas groups can be ungrouped.");
  }
  if (group.childIds.length === 0) {
    removeFromParent(graph, groupId);
    delete graph.objects[groupId];
    return;
  }
  const parentId = group.parentId;
  if (!parentId || !graph.objects[parentId]) {
    throw new Error("Group must have a known parent.");
  }
  const parent = graph.objects[parentId];
  requireUnlockedObject(parent);
  group.childIds.map((childId) => requireObject(graph, childId)).forEach(requireUnlockedObject);
  const groupIndex = parent.childIds.indexOf(groupId);
  const nextChildIds = parent.childIds.filter((id) => id !== groupId);
  nextChildIds.splice(Math.max(groupIndex, 0), 0, ...group.childIds);
  graph.objects[parentId] = { ...parent, childIds: nextChildIds };
  for (const childId of group.childIds) {
    const child = graph.objects[childId];
    if (child) {
      graph.objects[childId] = { ...child, parentId };
    }
  }
  delete graph.objects[groupId];
}

function removeFromParent(graph: MutableGraph, objectId: string): void {
  const currentParentId = graph.objects[objectId]?.parentId;
  if (!currentParentId) {
    return;
  }
  const currentParent = graph.objects[currentParentId];
  if (!currentParent) {
    return;
  }
  graph.objects[currentParentId] = {
    ...currentParent,
    childIds: currentParent.childIds.filter((id) => id !== objectId)
  };
}

function isDescendant(graph: CanvasGraph, possibleDescendantId: string, ancestorId: string): boolean {
  const ancestor = graph.objects[ancestorId];
  if (!ancestor) {
    return false;
  }
  for (const childId of ancestor.childIds) {
    if (childId === possibleDescendantId || isDescendant(graph, possibleDescendantId, childId)) {
      return true;
    }
  }
  return false;
}

function requireObject(graph: MutableGraph, objectId: string): CanvasObject {
  const object = graph.objects[objectId];
  if (!object) {
    throw new Error(`Unknown canvas object: ${objectId}`);
  }
  return object;
}

function requireUnlockedObject(object: CanvasObject): void {
  if (object.locked) {
    throw new Error(`Canvas object is locked: ${object.id}`);
  }
}

function requireOwnedInstance(
  graph: MutableGraph,
  objectId: string,
  instanceId: string
): CanvasComponentInstance {
  const instance = graph.instances[instanceId];
  if (!instance) {
    throw new Error(`Unknown component instance: ${instanceId}`);
  }
  const object = requireObject(graph, objectId);
  if (instance.objectId !== objectId || object.componentInstanceId !== instanceId) {
    throw new Error(`Canvas object ${objectId} does not own component instance: ${instanceId}`);
  }
  return instance;
}

function validateOverrideKeys(props: CanvasComponentProp[], overrides: Record<string, unknown>): void {
  const propNames = new Set(props.map((prop) => prop.name));
  for (const key of Object.keys(overrides)) {
    if (!propNames.has(key)) {
      throw new Error(`Component override references unknown prop: ${key}`);
    }
  }
}

function cloneGraph(graph: CanvasGraph | undefined): MutableGraph {
  if (!graph) {
    throw new Error("Canvas graph is required.");
  }
  return JSON.parse(JSON.stringify(graph)) as MutableGraph;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function asNameValue(value: unknown): { name: string } {
  const candidate = asObject(value, "Object name value");
  if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
    throw new Error("Object name must be a non-empty string.");
  }
  return { name: candidate.name };
}

function asVisibilityValue(value: unknown): { hidden: boolean } {
  const candidate = asObject(value, "Visibility value");
  if (typeof candidate.hidden !== "boolean") {
    throw new Error("Visibility value requires a hidden boolean.");
  }
  return { hidden: candidate.hidden };
}

function asLockValue(value: unknown): { locked: boolean } {
  const candidate = asObject(value, "Lock value");
  if (typeof candidate.locked !== "boolean") {
    throw new Error("Lock value requires a locked boolean.");
  }
  return { locked: candidate.locked };
}

function asReorderValue(value: unknown): { parentId: string; index: number } {
  const candidate = asObject(value, "Reorder value");
  if (typeof candidate.parentId !== "string" || typeof candidate.index !== "number") {
    throw new Error("Reorder value requires parentId and index.");
  }
  return { parentId: candidate.parentId, index: candidate.index };
}

function asGroupValue(value: unknown): { name: string; childObjectIds: string[] } {
  const candidate = asObject(value, "Group value");
  if (typeof candidate.name !== "string" || !Array.isArray(candidate.childObjectIds)) {
    throw new Error("Group value requires name and childObjectIds.");
  }
  const childObjectIds = candidate.childObjectIds.filter((item): item is string => typeof item === "string");
  if (childObjectIds.length !== candidate.childObjectIds.length) {
    throw new Error("Group child ids must be strings.");
  }
  return { name: candidate.name, childObjectIds };
}

function asLayoutValue(value: unknown): { constraints: CanvasConstraints } {
  const candidate = asObject(value, "Layout value");
  return {
    constraints: CanvasConstraintsSchema.parse(candidate.constraints)
  };
}

function asCreateComponentValue(value: unknown): {
  name: string;
  sourceObjectId?: string;
  props?: Array<Omit<CanvasComponentProp, "id"> & { id?: string }>;
  variants?: Array<Omit<CanvasComponentVariant, "id"> & { id?: string }>;
} {
  const candidate = asObject(value, "Create component value");
  if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
    throw new Error("Component name must be a non-empty string.");
  }
  return {
    name: candidate.name,
    ...(typeof candidate.sourceObjectId === "string" ? { sourceObjectId: candidate.sourceObjectId } : {}),
    ...(candidate.props !== undefined ? { props: asComponentProps(candidate.props) } : {}),
    ...(candidate.variants !== undefined ? { variants: asComponentVariants(candidate.variants) } : {})
  };
}

function asCreateInstanceValue(value: unknown): { componentId: string; targetObjectId?: string; variantId?: string } {
  const candidate = asObject(value, "Create instance value");
  if (typeof candidate.componentId !== "string") {
    throw new Error("Create instance value requires componentId.");
  }
  return {
    componentId: candidate.componentId,
    ...(typeof candidate.targetObjectId === "string" ? { targetObjectId: candidate.targetObjectId } : {}),
    ...(typeof candidate.variantId === "string" ? { variantId: candidate.variantId } : {})
  };
}

function asUpdateInstanceValue(value: unknown): {
  instanceId: string;
  variantId?: string;
  state?: "default" | "hover" | "pressed" | "disabled";
  overrides: Record<string, unknown>;
} {
  const candidate = asObject(value, "Update instance value");
  if (typeof candidate.instanceId !== "string") {
    throw new Error("Update instance value requires instanceId.");
  }
  const state = candidate.state;
  if (
    state !== undefined &&
    state !== "default" &&
    state !== "hover" &&
    state !== "pressed" &&
    state !== "disabled"
  ) {
    throw new Error("Invalid component instance state.");
  }
  const overrides = candidate.overrides === undefined ? {} : asObject(candidate.overrides, "Component overrides");
  for (const key of Object.keys(overrides)) {
    if (!key.trim()) {
      throw new Error("Component override key must not be empty.");
    }
  }
  return {
    instanceId: candidate.instanceId,
    ...(typeof candidate.variantId === "string" ? { variantId: candidate.variantId } : {}),
    ...(state ? { state } : {}),
    overrides
  };
}

function asDetachInstanceValue(value: unknown): { instanceId: string } {
  const candidate = asObject(value, "Detach instance value");
  if (typeof candidate.instanceId !== "string") {
    throw new Error("Detach instance value requires instanceId.");
  }
  return { instanceId: candidate.instanceId };
}

function asComponentProps(value: unknown): Array<Omit<CanvasComponentProp, "id"> & { id?: string }> {
  if (!Array.isArray(value)) {
    throw new Error("Component props must be an array.");
  }
  return value.map((item) => {
    const candidate = asObject(item, "Component prop");
    if (typeof candidate.name !== "string" || !candidate.name.trim()) {
      throw new Error("Component prop requires a name.");
    }
    if (
      candidate.kind !== "text" &&
      candidate.kind !== "color" &&
      candidate.kind !== "number" &&
      candidate.kind !== "boolean" &&
      candidate.kind !== "slot"
    ) {
      throw new Error("Component prop has an invalid kind.");
    }
    return {
      ...(typeof candidate.id === "string" ? { id: candidate.id } : {}),
      name: candidate.name,
      kind: candidate.kind,
      ...(candidate.defaultValue !== undefined ? { defaultValue: candidate.defaultValue } : {})
    };
  });
}

function asComponentVariants(value: unknown): Array<Omit<CanvasComponentVariant, "id"> & { id?: string }> {
  if (!Array.isArray(value)) {
    throw new Error("Component variants must be an array.");
  }
  return value.map((item) => {
    const candidate = asObject(item, "Component variant");
    if (typeof candidate.name !== "string" || !candidate.name.trim()) {
      throw new Error("Component variant requires a name.");
    }
    const props = candidate.props === undefined ? {} : asObject(candidate.props, "Component variant props");
    return {
      ...(typeof candidate.id === "string" ? { id: candidate.id } : {}),
      name: candidate.name,
      props
    };
  });
}
