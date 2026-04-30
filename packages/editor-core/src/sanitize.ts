import { parseFragment, serialize } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import postcss from "postcss";

import type { AssetRef, SanitizerChange, SanitizerReport } from "./schemas.js";
import { stableHash } from "./ids.js";

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

const REMOVED_TAGS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "select",
  "base",
  "meta"
]);

const URL_ATTRS = new Set(["href", "src", "poster", "xlink:href"]);

export function isDangerousUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("data:text/html") ||
    normalized.startsWith("vbscript:") ||
    normalized.startsWith("//")
  ) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol === "file:") {
    return true;
  }
  if (["http:", "https:"].includes(parsed.protocol)) {
    return isPrivateOrLocalHostname(parsed.hostname);
  }
  return false;
}

export function sanitizeInlineStyle(
  style: string,
  path: string,
  changes: SanitizerChange[]
): string {
  try {
    const root = postcss.parse(`a{${style}}`);
    const safeDeclarations: string[] = [];

    root.walkDecls((declaration) => {
      const value = declaration.value.toLowerCase();
      if (
        value.includes("url(") ||
        value.includes("expression(") ||
        value.includes("@import") ||
        value.includes("javascript:")
      ) {
        changes.push({
          kind: "rewritten-style",
          path,
          target: declaration.prop,
          reason: "blocked dangerous CSS value"
        });
        return;
      }

      safeDeclarations.push(`${declaration.prop}: ${declaration.value}`);
    });

    return safeDeclarations.join("; ");
  } catch {
    changes.push({
      kind: "rewritten-style",
      path,
      target: "style",
      reason: "invalid inline CSS"
    });
    return "";
  }
}

export function sanitizeHtml(input: string): {
  html: string;
  report: SanitizerReport;
  assets: AssetRef[];
} {
  const fragment = parseFragment(input) as AstNode;
  const changes: SanitizerChange[] = [];
  const assetsById = new Map<string, AssetRef>();

  sanitizeChildren(fragment, "root", changes, assetsById);

  const report: SanitizerReport = {
    removedElementCount: changes.filter((change) => change.kind === "removed-element").length,
    removedAttributeCount: changes.filter((change) => change.kind === "removed-attribute").length,
    blockedUrlCount: changes.filter((change) => change.kind === "blocked-url").length,
    changes
  };

  return {
    html: serialize(fragment as unknown as Parse5ParentNode),
    report,
    assets: Array.from(assetsById.values())
  };
}

function sanitizeChildren(
  parent: AstNode,
  path: string,
  changes: SanitizerChange[],
  assetsById: Map<string, AssetRef>
): void {
  const children = parent.childNodes;
  if (!children) {
    return;
  }

  const keptChildren: AstNode[] = [];
  const tagCounts = new Map<string, number>();

  for (const child of children) {
    const tagName = child.tagName?.toLowerCase();
    const nodeName = tagName ?? child.nodeName;
    const siblingIndex = tagCounts.get(nodeName) ?? 0;
    tagCounts.set(nodeName, siblingIndex + 1);
    const childPath = tagName ? `${path}/${tagName}[${siblingIndex}]` : `${path}/${nodeName}[${siblingIndex}]`;

    if (tagName === "link") {
      collectBlockedStylesheet(child, childPath, changes, assetsById);
      changes.push({
        kind: "removed-element",
        path: childPath,
        target: "link",
        reason: "external link elements are not allowed in static preview"
      });
      continue;
    }

    if (tagName && REMOVED_TAGS.has(tagName)) {
      changes.push({
        kind: "removed-element",
        path: childPath,
        target: tagName,
        reason: "static-first sanitizer policy"
      });
      continue;
    }

    if (tagName) {
      sanitizeAttributes(child, childPath, changes, assetsById);
    }

    sanitizeChildren(child, childPath, changes, assetsById);
    keptChildren.push(child);
  }

  parent.childNodes = keptChildren;
}

function sanitizeAttributes(
  node: AstNode,
  path: string,
  changes: SanitizerChange[],
  assetsById: Map<string, AssetRef>
): void {
  const attrs = node.attrs ?? [];
  const safeAttrs: Attribute[] = [];

  for (const attr of attrs) {
    const attrName = attr.name.toLowerCase();

    if (attrName.startsWith("on") || attrName === "srcdoc" || (node.tagName === "a" && attrName === "target")) {
      changes.push({
        kind: "removed-attribute",
        path,
        target: attr.name,
        reason: "blocked unsafe attribute"
      });
      continue;
    }

    if (URL_ATTRS.has(attrName) && isDangerousUrl(attr.value)) {
      changes.push({
        kind: "blocked-url",
        path,
        target: attr.name,
        reason: `blocked URL: ${attr.value}`
      });
      continue;
    }

    if (attrName === "style") {
      const sanitizedStyle = sanitizeInlineStyle(attr.value, path, changes);
      if (sanitizedStyle.length === 0) {
        changes.push({
          kind: "removed-attribute",
          path,
          target: "style",
          reason: "empty sanitized style"
        });
        continue;
      }
      safeAttrs.push({ name: attr.name, value: sanitizedStyle });
      continue;
    }

    if (node.tagName === "img" && attrName === "src") {
      collectImageAsset(attr.value, assetsById);
    }

    safeAttrs.push(attr);
  }

  node.attrs = safeAttrs;
}

function collectImageAsset(sourceUrl: string, assetsById: Map<string, AssetRef>): void {
  const id = `asset_${stableHash(sourceUrl)}`;
  if (assetsById.has(id)) {
    return;
  }

  assetsById.set(id, {
    id,
    kind: "image",
    status: "unknown",
    sourceUrl
  });
}

function collectBlockedStylesheet(
  node: AstNode,
  path: string,
  changes: SanitizerChange[],
  assetsById: Map<string, AssetRef>
): void {
  const attrs = node.attrs ?? [];
  const rel = attrs.find((attr) => attr.name.toLowerCase() === "rel")?.value.toLowerCase();
  const href = attrs.find((attr) => attr.name.toLowerCase() === "href")?.value;

  if (rel === "stylesheet" && href) {
    const id = `asset_${stableHash(href)}`;
    assetsById.set(id, {
      id,
      kind: "stylesheet",
      status: "blocked",
      sourceUrl: href
    });
    changes.push({
      kind: "blocked-url",
      path,
      target: "href",
      reason: "external stylesheets are tracked as blocked assets"
    });
  }
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/g, "");
  if (["localhost", "0.0.0.0", "::", "::1"].includes(normalized) || normalized.endsWith(".localhost")) {
    return true;
  }
  const mappedIpv4 = ipv4FromMappedIpv6(normalized);
  if (mappedIpv4) {
    return isPrivateIpv4Hostname(mappedIpv4);
  }
  if (isPrivateIpv4Hostname(normalized)) {
    return true;
  }
  if (normalized.includes(":")) {
    return (
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      isIpv6LinkLocal(normalized) ||
      normalized.startsWith("ff")
    );
  }
  return false;
}

function isPrivateIpv4Hostname(hostname: string): boolean {
  const octets = parseIpv4Octets(hostname);
  if (!octets) {
    return false;
  }
  const [first, second, third] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function parseIpv4Octets(hostname: string): [number, number, number, number] | undefined {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return undefined;
  }
  const octets = hostname.split(".").map((item) => Number(item));
  if (octets.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) {
    return undefined;
  }
  return octets as [number, number, number, number];
}

function isIpv6LinkLocal(hostname: string): boolean {
  const first = hostname.split(":")[0];
  if (!first || !/^[0-9a-f]{1,4}$/.test(first)) {
    return false;
  }
  const value = Number.parseInt(first, 16);
  return value >= 0xfe80 && value <= 0xfebf;
}

function ipv4FromMappedIpv6(hostname: string): string | undefined {
  const dotted = hostname.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted?.[1]) {
    return dotted[1];
  }
  const hex = hostname.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex?.[1] || !hex[2]) {
    return undefined;
  }
  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  return [
    (high >> 8) & 255,
    high & 255,
    (low >> 8) & 255,
    low & 255
  ].join(".");
}
