import type {
  CanvasGraph,
  CanvasObject,
  CanvasObjectKind,
  EditNode,
  EditNodeKind,
  ProjectBundle
} from "./schemas.js";
import { ProjectBundleSchema } from "./schemas.js";

const ROOT_PAGE_PREFIX = "obj_page_";
const ROOT_ARTBOARD_PREFIX = "obj_artboard_";

export function deriveCanvasGraph(bundle: ProjectBundle, updatedAt = bundle.updatedAt): CanvasGraph {
  const pageId = `${ROOT_PAGE_PREFIX}${bundle.id}`;
  const artboardId = `${ROOT_ARTBOARD_PREFIX}${bundle.id}`;
  const objects: Record<string, CanvasObject> = {
    [pageId]: {
      id: pageId,
      kind: "page",
      name: bundle.title,
      childIds: [artboardId],
      locked: false,
      hidden: false
    },
    [artboardId]: {
      id: artboardId,
      kind: "artboard",
      name: "Main Artboard",
      parentId: pageId,
      childIds: [],
      locked: false,
      hidden: false
    }
  };

  for (const node of Object.values(bundle.editGraph.nodes)) {
    objects[objectIdForNode(node.id)] = createObjectFromNode(node);
  }

  for (const node of Object.values(bundle.editGraph.nodes)) {
    const objectId = objectIdForNode(node.id);
    const parentId = node.parentId && objects[objectIdForNode(node.parentId)]
      ? objectIdForNode(node.parentId)
      : artboardId;
    const object = objects[objectId];
    const parent = objects[parentId];
    if (!object || !parent) {
      continue;
    }
    objects[objectId] = {
      ...object,
      parentId
    };
    objects[parentId] = {
      ...parent,
      childIds: [...parent.childIds, objectId]
    };
  }

  return {
    version: 1,
    rootObjectIds: [pageId],
    objects,
    components: {},
    instances: {},
    guides: [],
    updatedAt
  };
}

export function ensureCanvasGraph(bundle: ProjectBundle): ProjectBundle {
  if (bundle.canvasGraph) {
    assertCanvasGraphIntegrity(bundle.canvasGraph, new Set(Object.keys(bundle.editGraph.nodes)));
    return bundle;
  }

  return ProjectBundleSchema.parse({
    ...bundle,
    canvasGraph: deriveCanvasGraph(bundle)
  });
}

export function listCanvasObjects(graph: CanvasGraph): CanvasObject[] {
  const result: CanvasObject[] = [];
  const visit = (objectId: string) => {
    const object = graph.objects[objectId];
    if (!object) {
      return;
    }
    result.push(object);
    for (const childId of object.childIds) {
      visit(childId);
    }
  };

  for (const rootId of graph.rootObjectIds) {
    visit(rootId);
  }
  return result;
}

export function findCanvasObjectByNodeId(graph: CanvasGraph, nodeId: string): CanvasObject | undefined {
  return Object.values(graph.objects).find((object) => object.nodeId === nodeId);
}

export function getCanvasObject(graph: CanvasGraph, objectId: string): CanvasObject | undefined {
  return graph.objects[objectId];
}

export function assertCanvasGraphIntegrity(graph: CanvasGraph, knownNodeIds?: Set<string>): void {
  const referencedChildren = new Map<string, string>();
  const reachableObjectIds = new Set<string>();
  const rootIds = new Set<string>();
  for (const rootId of graph.rootObjectIds) {
    if (rootIds.has(rootId)) {
      throw new Error(`Canvas graph root is duplicated: ${rootId}`);
    }
    rootIds.add(rootId);
    const root = graph.objects[rootId];
    if (!root) {
      throw new Error(`Canvas graph root is missing: ${rootId}`);
    }
    if (root.parentId) {
      throw new Error(`Canvas graph root must not have a parent: ${rootId}`);
    }
    visitForCycles(graph, rootId, new Set(), reachableObjectIds);
  }

  for (const [objectId, object] of Object.entries(graph.objects)) {
    if (object.id !== objectId) {
      throw new Error(`Canvas object key/id mismatch: ${objectId}`);
    }
    if (!reachableObjectIds.has(object.id)) {
      throw new Error(`Canvas object is unreachable: ${object.id}`);
    }
    if (object.nodeId && knownNodeIds && !knownNodeIds.has(object.nodeId)) {
      throw new Error(`Canvas object references missing edit node: ${object.id}`);
    }
    if (object.parentId && !graph.objects[object.parentId]) {
      throw new Error(`Canvas object parent is missing: ${object.id}`);
    }
    for (const childId of object.childIds) {
      const child = graph.objects[childId];
      if (!child) {
        throw new Error(`Canvas object child is missing: ${childId}`);
      }
      if (child.parentId !== object.id) {
        throw new Error(`Canvas object parent mismatch: ${childId}`);
      }
      const existingParentId = referencedChildren.get(childId);
      if (existingParentId) {
        throw new Error(`Canvas object has multiple parents: ${childId}`);
      }
      referencedChildren.set(childId, object.id);
    }
  }

  for (const component of Object.values(graph.components)) {
    if (graph.components[component.id] !== component) {
      throw new Error(`Component key/id mismatch: ${component.id}`);
    }
    if (!graph.objects[component.sourceObjectId]) {
      throw new Error(`Component references missing source object: ${component.id}`);
    }
    for (const slotObjectId of component.slotObjectIds) {
      if (!graph.objects[slotObjectId]) {
        throw new Error(`Component references missing slot object: ${component.id}`);
      }
    }
    const propNames = new Set<string>();
    for (const prop of component.props) {
      const propName = prop.name.trim();
      if (!propName) {
        throw new Error(`Component prop name must not be empty: ${component.id}`);
      }
      if (propNames.has(propName)) {
        throw new Error(`Component prop name is duplicated: ${propName}`);
      }
      propNames.add(propName);
    }
    const variantIds = new Set<string>();
    for (const variant of component.variants) {
      if (variantIds.has(variant.id)) {
        throw new Error(`Component variant id is duplicated: ${variant.id}`);
      }
      variantIds.add(variant.id);
      for (const key of Object.keys(variant.props)) {
        if (!propNames.has(key)) {
          throw new Error(`Component variant references unknown prop: ${key}`);
        }
      }
    }
  }

  const instanceObjectIds = new Map<string, string>();
  for (const [instanceId, instance] of Object.entries(graph.instances)) {
    if (instance.id !== instanceId) {
      throw new Error(`Component instance key/id mismatch: ${instanceId}`);
    }
    const component = graph.components[instance.componentId];
    if (!component) {
      throw new Error(`Component instance references missing component: ${instance.id}`);
    }
    if (instance.variantId && !component.variants.some((variant) => variant.id === instance.variantId)) {
      throw new Error(`Component instance references unknown variant: ${instance.variantId}`);
    }
    const propNames = new Set(component.props.map((prop) => prop.name));
    for (const key of Object.keys(instance.overrides)) {
      if (!key.trim()) {
        throw new Error(`Component override key must not be empty: ${instance.id}`);
      }
      if (!propNames.has(key)) {
        throw new Error(`Component override references unknown prop: ${key}`);
      }
    }
    const object = graph.objects[instance.objectId];
    if (!object) {
      throw new Error(`Component instance references missing object: ${instance.id}`);
    }
    const existingInstanceId = instanceObjectIds.get(instance.objectId);
    if (existingInstanceId && existingInstanceId !== instance.id) {
      throw new Error(`Canvas object has multiple component instances: ${instance.objectId}`);
    }
    instanceObjectIds.set(instance.objectId, instance.id);
    if (object.componentInstanceId !== instance.id) {
      throw new Error(`Component instance object ownership mismatch: ${instance.id}`);
    }
    if (object.kind !== "componentInstance") {
      throw new Error(`Component instance object kind mismatch: ${object.id}`);
    }
  }

  for (const object of Object.values(graph.objects)) {
    if (!object.componentInstanceId) {
      continue;
    }
    const instance = graph.instances[object.componentInstanceId];
    if (!instance) {
      throw new Error(`Canvas object references missing component instance: ${object.id}`);
    }
    if (instance.objectId !== object.id) {
      throw new Error(`Canvas object component instance mismatch: ${object.id}`);
    }
  }
}

function createObjectFromNode(node: EditNode): CanvasObject {
  return {
    id: objectIdForNode(node.id),
    kind: canvasKindForEditKind(node.kind),
    name: nameForNode(node),
    nodeId: node.id,
    childIds: [],
    locked: false,
    hidden: false
  };
}

function objectIdForNode(nodeId: string): string {
  return `obj_${nodeId}`;
}

function canvasKindForEditKind(kind: EditNodeKind): CanvasObjectKind {
  switch (kind) {
    case "frame":
      return "frame";
    case "block":
      return "section";
    case "text":
      return "text";
    case "image":
      return "image";
    case "button":
      return "button";
    case "decorative":
      return "vectorLike";
    default:
      return "unknown";
  }
}

function nameForNode(node: EditNode): string {
  if (node.textPreview) {
    return node.textPreview;
  }
  return `${canvasKindForEditKind(node.kind)} ${node.tagName}`;
}

function visitForCycles(
  graph: CanvasGraph,
  objectId: string,
  path: Set<string>,
  reachableObjectIds: Set<string>
): void {
  if (path.has(objectId)) {
    throw new Error(`Canvas graph contains a cycle at: ${objectId}`);
  }
  const object = graph.objects[objectId];
  if (!object) {
    throw new Error(`Canvas graph object is missing: ${objectId}`);
  }
  reachableObjectIds.add(objectId);
  const nextPath = new Set(path);
  nextPath.add(objectId);
  for (const childId of object.childIds) {
    visitForCycles(graph, childId, nextPath, reachableObjectIds);
  }
}
