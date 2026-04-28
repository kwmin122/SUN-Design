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
