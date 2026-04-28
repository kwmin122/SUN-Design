import { parseFragment, serialize } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { stableHash } from "./ids.js";
import { buildEditGraph } from "./normalize.js";
import {
  EditPatchSchema,
  ProjectBundleSchema,
  type EditPatch,
  type ProjectBundle
} from "./schemas.js";

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

const ALLOWED_ATTRS = new Set(["alt", "aria-label", "href", "src", "title"]);
const ALLOWED_STYLE_PROPS = new Set([
  "align-items",
  "--cdx-breakpoint",
  "background",
  "background-color",
  "border-radius",
  "color",
  "container-type",
  "display",
  "font-size",
  "font-weight",
  "gap",
  "grid-template-columns",
  "height",
  "justify-content",
  "line-height",
  "opacity",
  "order",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "transform",
  "visibility",
  "width"
]);

export function applyEditPatchToBundle(bundle: ProjectBundle, patchInput: EditPatch): ProjectBundle {
  const patch = EditPatchSchema.parse(patchInput);
  if (!bundle.editGraph.nodes[patch.nodeId]) {
    throw new Error(`Unknown edit node: ${patch.nodeId}`);
  }

  const fragment = parseFragment(bundle.html.normalized) as AstNode;
  const node = findNodeByCdxId(fragment, patch.nodeId);
  if (!node) {
    throw new Error(`Unable to find node in normalized HTML: ${patch.nodeId}`);
  }

  applyPatchToNode(node, patch);
  const normalized = serialize(fragment as unknown as Parse5ParentNode);
  const nextBundle = {
    ...bundle,
    baseRevision: `rev_${stableHash(normalized)}`,
    updatedAt: patch.createdAt,
    html: {
      ...bundle.html,
      normalized
    },
    editGraph: buildEditGraph(normalized),
    patches: [...bundle.patches, patch]
  };

  return ProjectBundleSchema.parse(nextBundle);
}

export function applyEditPatchesToBundle(bundle: ProjectBundle, patches: EditPatch[]): ProjectBundle {
  return patches.reduce((current, patch) => applyEditPatchToBundle(current, patch), bundle);
}

export function findNodeIdsByClass(bundle: ProjectBundle, className: string): string[] {
  const fragment = parseFragment(bundle.html.normalized) as AstNode;
  const nodeIds: string[] = [];
  collectNodeIdsByClass(fragment, className, nodeIds);
  return nodeIds;
}

function applyPatchToNode(node: AstNode, patch: EditPatch): void {
  switch (patch.op) {
    case "setText":
      setTextContent(node, asString(patch.value));
      break;
    case "setStyle":
      setStyles(node, asStringRecord(patch.value));
      break;
    case "replaceAsset":
      setSafeAttr(node, "src", asString(patch.value));
      break;
    case "setAttr": {
      const attrPatch = asAttrPatch(patch.value);
      setSafeAttr(node, attrPatch.name, attrPatch.value);
      break;
    }
    case "move": {
      const value = asMoveValue(patch.value);
      setStyles(node, { transform: `translate(${value.x}px, ${value.y}px)` });
      break;
    }
    case "resize": {
      const value = asResizeValue(patch.value);
      const styles: Record<string, string> = {};
      if (value.width !== undefined) {
        styles.width = `${value.width}px`;
      }
      if (value.height !== undefined) {
        styles.height = `${value.height}px`;
      }
      setStyles(node, styles);
      break;
    }
    case "align":
      setStyles(node, { "text-align": asAlignment(patch.value) });
      break;
    case "reorder":
      setStyles(node, { order: String(asOrder(patch.value)) });
      break;
    case "setVisibility":
      setStyles(node, { visibility: asBoolean(patch.value) ? "visible" : "hidden" });
      break;
  }
}

function findNodeByCdxId(parent: AstNode, nodeId: string): AstNode | undefined {
  if (attrsToRecord(parent.attrs ?? [])["data-cdx-id"] === nodeId) {
    return parent;
  }

  for (const child of parent.childNodes ?? []) {
    const result = findNodeByCdxId(child, nodeId);
    if (result) {
      return result;
    }
  }

  return undefined;
}

function collectNodeIdsByClass(parent: AstNode, className: string, nodeIds: string[]): void {
  const attrs = attrsToRecord(parent.attrs ?? []);
  const classNames = attrs.class?.split(/\s+/) ?? [];
  if (classNames.includes(className) && attrs["data-cdx-id"]) {
    nodeIds.push(attrs["data-cdx-id"]);
  }

  for (const child of parent.childNodes ?? []) {
    collectNodeIdsByClass(child, className, nodeIds);
  }
}

function setTextContent(node: AstNode, value: string): void {
  node.childNodes = [{ nodeName: "#text", value }];
}

function setSafeAttr(node: AstNode, name: string, value: string): void {
  if (!ALLOWED_ATTRS.has(name)) {
    throw new Error(`Unsafe attribute patch: ${name}`);
  }

  if ((name === "href" || name === "src") && !isSafeUrl(value)) {
    throw new Error(`Unsafe URL patch for ${name}`);
  }

  setAttr(node, name, value);
}

function setStyles(node: AstNode, styles: Record<string, string>): void {
  const existing = parseStyle(attrsToRecord(node.attrs ?? []).style ?? "");
  for (const [rawName, rawValue] of Object.entries(styles)) {
    const name = normalizeStyleName(rawName);
    const value = rawValue.trim();
    if (!ALLOWED_STYLE_PROPS.has(name)) {
      throw new Error(`Unsafe style patch: ${rawName}`);
    }
    if (!isSafeStyleValue(value)) {
      throw new Error(`Unsafe style value for ${rawName}`);
    }
    existing.set(name, value);
  }

  setAttr(node, "style", serializeStyle(existing));
}

function parseStyle(style: string): Map<string, string> {
  const parsed = new Map<string, string>();
  for (const declaration of style.split(";")) {
    const [rawName, ...rawValue] = declaration.split(":");
    if (!rawName || rawValue.length === 0) {
      continue;
    }
    const name = normalizeStyleName(rawName);
    const value = rawValue.join(":").trim();
    if (name && value) {
      parsed.set(name, value);
    }
  }
  return parsed;
}

function serializeStyle(styles: Map<string, string>): string {
  return Array.from(styles.entries())
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");
}

function normalizeStyleName(value: string): string {
  return value
    .trim()
    .replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
    .toLowerCase();
}

function isSafeStyleValue(value: string): boolean {
  return !/[<>;]/.test(value) && !/javascript:|expression\(|url\(/i.test(value);
}

function isSafeUrl(value: string): boolean {
  return /^(https?:|data:image\/|blob:|\/|#)/i.test(value) && !/javascript:/i.test(value);
}

function asString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Patch value must be a string.");
  }
  return value;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Style patch value must be an object.");
  }

  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string") {
      throw new Error(`Style patch value for ${key} must be a string.`);
    }
    result[key] = item;
  }
  return result;
}

function asAttrPatch(value: unknown): { name: string; value: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Attribute patch value must be an object.");
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== "string" || typeof candidate.value !== "string") {
    throw new Error("Attribute patch requires string name and value.");
  }
  return { name: candidate.name, value: candidate.value };
}

function asMoveValue(value: unknown): { x: number; y: number } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Move patch value must be an object.");
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.x !== "number" || typeof candidate.y !== "number") {
    throw new Error("Move patch requires numeric x and y.");
  }
  return { x: candidate.x, y: candidate.y };
}

function asResizeValue(value: unknown): { width?: number; height?: number } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Resize patch value must be an object.");
  }
  const candidate = value as Record<string, unknown>;
  const result: { width?: number; height?: number } = {};
  if (candidate.width !== undefined) {
    if (typeof candidate.width !== "number" || candidate.width < 1) {
      throw new Error("Resize width must be a positive number.");
    }
    result.width = candidate.width;
  }
  if (candidate.height !== undefined) {
    if (typeof candidate.height !== "number" || candidate.height < 1) {
      throw new Error("Resize height must be a positive number.");
    }
    result.height = candidate.height;
  }
  return result;
}

function asAlignment(value: unknown): "left" | "center" | "right" {
  if (value !== "left" && value !== "center" && value !== "right") {
    throw new Error("Alignment patch must be left, center, or right.");
  }
  return value;
}

function asOrder(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const order = (value as Record<string, unknown>).order;
    if (typeof order === "number") {
      return order;
    }
  }
  throw new Error("Reorder patch requires a numeric order.");
}

function asBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new Error("Visibility patch must be boolean.");
  }
  return value;
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
