import { parseFragment, serialize } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import type { EditGraph, EditNode, EditNodeKind, ProjectBundle } from "./schemas.js";
import { ProjectBundleSchema } from "./schemas.js";
import { createStableNodeId, stableHash } from "./ids.js";
import { sanitizeHtml } from "./sanitize.js";

type Attribute = {
  name: string;
  value: string;
};

type AstNode = {
  nodeName: string;
  tagName?: string;
  attrs?: Attribute[];
  childNodes?: AstNode[];
  value?: string;
};

type Parse5ParentNode = DefaultTreeAdapterMap["parentNode"];

const STRUCTURAL_TAGS = new Set(["main", "section", "article", "header", "footer", "nav"]);
const TEXT_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "li", "strong", "em"]);
const IMAGE_TAGS = new Set(["img", "picture", "source"]);

export function normalizeHtml(input: {
  html: string;
  title: string;
  id: string;
  filename?: string;
}): ProjectBundle {
  const sanitized = sanitizeHtml(input.html);
  const fragment = parseFragment(sanitized.html) as AstNode;

  injectNodeIds(fragment, "root", undefined);
  const normalized = serialize(fragment as unknown as Parse5ParentNode);
  const editGraph = buildEditGraph(normalized);
  const now = new Date().toISOString();

  const bundle = {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    baseRevision: `rev_${stableHash(normalized)}`,
    createdAt: now,
    updatedAt: now,
    source: input.filename ? { kind: "imported" as const, filename: input.filename } : { kind: "fixture" as const },
    html: {
      raw: input.html,
      sanitized: sanitized.html,
      normalized
    },
    assets: sanitized.assets,
    editGraph,
    patches: [],
    sanitizerReport: sanitized.report
  };

  return ProjectBundleSchema.parse(bundle);
}

export function buildEditGraph(normalizedHtml: string): EditGraph {
  const fragment = parseFragment(normalizedHtml) as AstNode;
  const nodes: Record<string, EditNode> = {};
  const rootNodeIds: string[] = [];

  collectEditNodes(fragment, "root", undefined, nodes, rootNodeIds);

  return {
    version: 1,
    rootNodeIds,
    nodes
  };
}

export function classifyElement(
  tagName: string,
  attrs: Record<string, string>,
  textPreview: string
): EditNodeKind {
  const normalizedTag = tagName.toLowerCase();
  const className = attrs.class ?? "";

  if (STRUCTURAL_TAGS.has(normalizedTag)) {
    return "frame";
  }

  if (normalizedTag === "div") {
    return textPreview.length > 0 ? "block" : "decorative";
  }

  if (TEXT_TAGS.has(normalizedTag) && textPreview.length > 0) {
    return "text";
  }

  if (IMAGE_TAGS.has(normalizedTag)) {
    return "image";
  }

  if (
    normalizedTag === "button" ||
    (normalizedTag === "a" && (textPreview.length > 0 || /\b(cta|button)\b/i.test(className)))
  ) {
    return "button";
  }

  if (["input", "textarea", "select"].includes(normalizedTag)) {
    return "control";
  }

  return textPreview.length === 0 ? "decorative" : "unknown";
}

function injectNodeIds(parent: AstNode, path: string, parentId: string | undefined): void {
  const children = parent.childNodes;
  if (!children) {
    return;
  }

  const tagCounts = new Map<string, number>();

  for (const child of children) {
    const tagName = child.tagName?.toLowerCase();
    if (!tagName) {
      continue;
    }

    const siblingIndex = tagCounts.get(tagName) ?? 0;
    tagCounts.set(tagName, siblingIndex + 1);
    const childPath = path === "root" ? `${tagName}[${siblingIndex}]` : `${path}/${tagName}[${siblingIndex}]`;
    const attrs = attrsToRecord(child.attrs ?? []);
    const textPreview = getTextPreview(child);
    const kind = classifyElement(tagName, attrs, textPreview);
    const candidate = !["decorative", "unknown"].includes(kind);

    let nodeId = attrs["data-cdx-id"];
    if (candidate) {
      if (!nodeId?.startsWith("cdx_")) {
        nodeId = createStableNodeId({
          domPath: childPath,
          tagName,
          textPreview,
          siblingIndex
        });
        setAttr(child, "data-cdx-id", nodeId);
      }
      setAttr(child, "data-cdx-role", kind);
    }

    injectNodeIds(child, childPath, candidate ? nodeId : parentId);
  }
}

function collectEditNodes(
  parent: AstNode,
  path: string,
  parentId: string | undefined,
  nodes: Record<string, EditNode>,
  rootNodeIds: string[]
): void {
  const children = parent.childNodes;
  if (!children) {
    return;
  }

  const tagCounts = new Map<string, number>();

  for (const child of children) {
    const tagName = child.tagName?.toLowerCase();
    if (!tagName) {
      continue;
    }

    const siblingIndex = tagCounts.get(tagName) ?? 0;
    tagCounts.set(tagName, siblingIndex + 1);
    const childPath = path === "root" ? `${tagName}[${siblingIndex}]` : `${path}/${tagName}[${siblingIndex}]`;
    const attrs = attrsToRecord(child.attrs ?? []);
    const nodeId = attrs["data-cdx-id"];
    const role = attrs["data-cdx-role"] as EditNodeKind | undefined;

    if (nodeId && role) {
      const textPreview = getTextPreview(child);
      const node = makeEditNode({
        id: nodeId,
        kind: role,
        tagName,
        attrs,
        domPath: childPath,
        parentId,
        textPreview,
        siblingIndex
      });
      nodes[nodeId] = node;
      if (!parentId) {
        rootNodeIds.push(nodeId);
      }
      collectEditNodes(child, childPath, nodeId, nodes, rootNodeIds);
    } else {
      collectEditNodes(child, childPath, parentId, nodes, rootNodeIds);
    }
  }
}

function makeEditNode(input: {
  id: string;
  kind: EditNodeKind;
  tagName: string;
  attrs: Record<string, string>;
  domPath: string;
  parentId: string | undefined;
  textPreview: string;
  siblingIndex: number;
}): EditNode {
  const node: EditNode = {
    id: input.id,
    kind: input.kind,
    tagName: input.tagName,
    domPath: input.domPath,
    fingerprint: stableHash(
      `${input.tagName}|${input.kind}|${input.textPreview}|${input.attrs.class ?? ""}|${input.attrs.style ?? ""}|${input.siblingIndex}`
    ),
    editableProps: editablePropsForKind(input.kind)
  };

  if (input.parentId) {
    node.parentId = input.parentId;
  }
  if (input.textPreview) {
    node.textPreview = input.textPreview;
  }
  if (input.kind === "image" && input.attrs.src) {
    node.assetId = assetIdFromImageSource(input.attrs.src);
  }

  return node;
}

function assetIdFromImageSource(src: string): string {
  const projectAssetUrl = src.match(/^kdesign:\/\/asset\/[^/]+\/([^/?#]+)$/);
  if (projectAssetUrl?.[1]) {
    return decodeURIComponent(projectAssetUrl[1]);
  }
  return `asset_${stableHash(src)}`;
}

function editablePropsForKind(kind: EditNodeKind): string[] {
  switch (kind) {
    case "text":
      return ["textContent", "color", "fontSize", "fontWeight", "textAlign"];
    case "image":
      return ["src", "alt"];
    case "button":
      return ["textContent", "href", "backgroundColor", "color", "borderRadius"];
    case "frame":
    case "block":
      return ["backgroundColor", "padding", "gap", "borderRadius"];
    default:
      return [];
  }
}

function attrsToRecord(attrs: Attribute[]): Record<string, string> {
  return Object.fromEntries(attrs.map((attr) => [attr.name, attr.value]));
}

function setAttr(node: AstNode, name: string, value: string): void {
  const attrs = node.attrs ?? [];
  const existing = attrs.find((attr) => attr.name === name);
  if (existing) {
    existing.value = value;
  } else {
    attrs.push({ name, value });
  }
  node.attrs = attrs;
}

function getTextPreview(node: AstNode): string {
  return getTextContent(node).replace(/\s+/g, " ").trim().slice(0, 80);
}

function getTextContent(node: AstNode): string {
  if (node.nodeName === "#text") {
    return node.value ?? "";
  }

  return (node.childNodes ?? []).map((child) => getTextContent(child)).join(" ");
}
