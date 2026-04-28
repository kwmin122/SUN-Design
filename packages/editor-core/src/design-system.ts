import { stableHash } from "./ids.js";
import type {
  CanvasGraph,
  CodeComponentReference,
  DesignComponentPattern,
  DesignSystem,
  DesignSystemItemStatus,
  DesignSystemVersionSnapshot,
  DesignToken,
  ProjectBundle
} from "./schemas.js";
import {
  CodeComponentReferenceSchema,
  DesignSystemSchema
} from "./schemas.js";

type CodeMappingInput = {
  cssVariable?: string;
  tailwindClass?: string;
  codeReferenceId?: string;
};

type CodeReferenceInput = Omit<CodeComponentReference, "id" | "status" | "propMappings" | "slotMappings"> & {
  id?: string;
  propMappings?: CodeComponentReference["propMappings"];
  slotMappings?: CodeComponentReference["slotMappings"];
  status?: CodeComponentReference["status"];
};

type PlaygroundState = {
  componentId: string;
  componentName: string;
  variantId: string | undefined;
  variantName: string;
  propValues: Record<string, unknown>;
  mode: string;
  snapshotHash: string;
};

export function extractDesignSystemCandidates(
  bundle: ProjectBundle,
  createdAt = new Date().toISOString()
): DesignSystem {
  const fallback = normalizeDesignSystem(bundle.designSystem ?? createBaseDesignSystem(bundle, createdAt));
  const colors = extractColors(bundle.html.normalized);
  const tokens: DesignToken[] = [];

  Object.entries({ ...fallback.colors, ...colors }).forEach(([name, value], index) => {
    tokens.push(createToken({
      systemId: fallback.id,
      name: normalizedTokenName(name.startsWith("color.") ? name : `color.${index + 1}`),
      category: "color",
      value,
      provenance: `html:color:${value}`
    }));
  });

  tokens.push(createToken({
    systemId: fallback.id,
    name: "typography.heading",
    category: "typography",
    value: fallback.typography.heading,
    provenance: "design-system:typography.heading"
  }));
  tokens.push(createToken({
    systemId: fallback.id,
    name: "typography.body",
    category: "typography",
    value: fallback.typography.body,
    provenance: "design-system:typography.body"
  }));
  tokens.push(createToken({
    systemId: fallback.id,
    name: "radius.default",
    category: "radius",
    value: fallback.radius,
    provenance: "design-system:radius"
  }));
  tokens.push(createToken({
    systemId: fallback.id,
    name: "spacing.default",
    category: "spacing",
    value: fallback.spacing,
    provenance: "design-system:spacing"
  }));

  const dedupedTokens = dedupeTokens([...fallback.tokens, ...tokens]);
  const componentPatterns = dedupePatterns([
    ...fallback.componentPatterns,
    ...patternsFromCanvasGraph(fallback.id, bundle.canvasGraph)
  ]);

  return DesignSystemSchema.parse({
    ...fallback,
    tokens: dedupedTokens,
    componentPatterns,
    publishState: fallback.publishState ?? "draft",
    updatedAt: createdAt
  });
}

export function approveDesignSystemItems(system: DesignSystem, itemIds: string[]): DesignSystem {
  return updateItemStatuses(system, itemIds, "approved");
}

export function rejectDesignSystemItems(system: DesignSystem, itemIds: string[]): DesignSystem {
  return updateItemStatuses(system, itemIds, "rejected");
}

export function publishDesignSystem(
  system: DesignSystem,
  input: { label: string; sourceRevision: string; createdAt?: string }
): DesignSystem {
  assertUniqueTokenNames(system.tokens);
  const label = input.label.trim();
  if (!label) {
    throw new Error("Design-system version label must not be empty.");
  }
  const publishableTokens = system.tokens.filter((token) =>
    token.status === "approved" || token.status === "published"
  );
  if (publishableTokens.length === 0) {
    throw new Error("Design system needs at least one approved token before publish.");
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const published: DesignSystem = DesignSystemSchema.parse({
    ...system,
    tokens: system.tokens.map((token) =>
      token.status === "approved" ? { ...token, status: "published" } : token
    ),
    componentPatterns: system.componentPatterns.map((pattern) =>
      pattern.status === "approved" ? { ...pattern, status: "published" } : pattern
    ),
    publishState: "published",
    updatedAt: createdAt
  });
  const snapshot = createVersionSnapshot(published);
  const snapshotHash = stableSnapshotHash(snapshot);
  return DesignSystemSchema.parse({
    ...published,
    versions: [
      {
        id: `design_version_${stableHash(`${published.id}:${label}:${snapshotHash}:${createdAt}`)}`,
        label,
        sourceRevision: input.sourceRevision,
        tokenCount: snapshot.tokens.length,
        componentPatternCount: snapshot.componentPatterns.length,
        snapshotHash,
        snapshot,
        createdAt
      },
      ...published.versions
    ]
  });
}

export function remixDesignSystem(
  system: DesignSystem,
  input: { name?: string; tokenUpdates?: Record<string, string>; createdAt?: string }
): DesignSystem {
  const tokenUpdates = input.tokenUpdates ?? {};
  const updatedTokens = system.tokens.map((token) => {
    const nextValue = tokenUpdates[token.id] ?? tokenUpdates[token.name];
    return nextValue === undefined ? token : { ...token, value: nextValue, status: "candidate" as const };
  });
  return DesignSystemSchema.parse({
    ...system,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    tokens: updatedTokens,
    publishState: "draft",
    updatedAt: input.createdAt ?? new Date().toISOString()
  });
}

export function rollbackDesignSystem(system: DesignSystem, versionId: string): DesignSystem {
  const version = system.versions.find((item) => item.id === versionId);
  if (!version) {
    throw new Error(`Unknown design-system version: ${versionId}`);
  }
  return DesignSystemSchema.parse({
    ...system,
    colors: version.snapshot.colors,
    typography: version.snapshot.typography,
    radius: version.snapshot.radius,
    spacing: version.snapshot.spacing,
    tokens: version.snapshot.tokens,
    codeReferences: version.snapshot.codeReferences,
    componentPatterns: version.snapshot.componentPatterns,
    publishState: version.snapshot.publishState,
    updatedAt: version.createdAt
  });
}

export function snapshotDesignSystem(system: DesignSystem): string {
  return stableSnapshotHash(createVersionSnapshot(system));
}

export function mapTokenToCode(
  system: DesignSystem,
  tokenId: string,
  mapping: CodeMappingInput
): DesignSystem {
  const token = system.tokens.find((item) => item.id === tokenId);
  if (!token) {
    throw new Error(`Unknown design token: ${tokenId}`);
  }
  const cleanedMapping = definedMapping(mapping);
  validateCodeMapping(system, cleanedMapping);
  return DesignSystemSchema.parse({
    ...system,
    tokens: system.tokens.map((item) =>
      item.id === tokenId
        ? {
            ...item,
            codeMapping: {
              ...(item.codeMapping ?? {}),
              ...cleanedMapping
            }
          }
        : item
    ),
    updatedAt: new Date().toISOString()
  });
}

export function addCodeComponentReference(
  system: DesignSystem,
  input: CodeReferenceInput
): DesignSystem {
  const cleanedInput = cleanCodeReferenceInput(input);
  const id = cleanedInput.id ?? `code_ref_${stableHash(`${system.id}:${cleanedInput.name}:${cleanedInput.importPath}:${cleanedInput.exportName}`)}`;
  const reference = CodeComponentReferenceSchema.parse({
    ...cleanedInput,
    id,
    status: cleanedInput.status ?? "candidate"
  });
  if (system.codeReferences.some((item) => item.name === reference.name || item.id === reference.id)) {
    throw new Error(`Duplicate code component reference: ${reference.name}`);
  }
  validateCodeComponentReference(reference);
  return DesignSystemSchema.parse({
    ...system,
    codeReferences: [reference, ...system.codeReferences],
    updatedAt: new Date().toISOString()
  });
}

export function validateCodeComponentReference(reference: CodeComponentReference): void {
  if (reference.sourcePath && !isSafeRepoPath(reference.sourcePath)) {
    throw new Error(`Unsafe code component source path: ${reference.sourcePath}`);
  }
  for (const url of [reference.sourceUrl, reference.docsUrl, reference.storybookUrl]) {
    if (url && !url.startsWith("https://")) {
      throw new Error(`Code component reference URL must be https: ${url}`);
    }
  }
}

export function createComponentPlaygroundState(input: {
  graph: CanvasGraph;
  componentId: string;
  variantId?: string;
  propValues?: Record<string, unknown>;
  mode?: string;
}): PlaygroundState {
  const component = input.graph.components[input.componentId];
  if (!component) {
    throw new Error(`Unknown component: ${input.componentId}`);
  }
  const variant = input.variantId
    ? component.variants.find((item) => item.id === input.variantId)
    : component.variants[0];
  if (input.variantId && !variant) {
    throw new Error(`Unknown component variant: ${input.variantId}`);
  }
  const propNames = new Set(component.props.map((prop) => prop.name));
  const propValues = input.propValues ?? {};
  for (const key of Object.keys(propValues)) {
    if (!propNames.has(key)) {
      throw new Error(`Unknown component playground prop: ${key}`);
    }
  }
  const mode = input.mode?.trim() || "default";
  const state = {
    componentId: component.id,
    componentName: component.name,
    variantId: variant?.id,
    variantName: variant?.name ?? "Base",
    propValues,
    mode,
    snapshotHash: stableHash(stableSerialize({
      componentId: component.id,
      variantId: variant?.id,
      propValues,
      mode
    }))
  };
  return state;
}

function createBaseDesignSystem(bundle: ProjectBundle, createdAt: string): DesignSystem {
  const colors = extractColors(bundle.html.normalized);
  return DesignSystemSchema.parse({
    id: `design_system_${stableHash(`${bundle.id}:${bundle.baseRevision}`)}`,
    name: `${bundle.title} System`,
    colors: Object.keys(colors).length > 0 ? colors : { color1: "#171717", color2: "#ffffff" },
    typography: {
      heading: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif",
      body: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif"
    },
    radius: "14px",
    spacing: "8px",
    source: "learned",
    createdAt
  });
}

function normalizeDesignSystem(system: DesignSystem): DesignSystem {
  return DesignSystemSchema.parse(system);
}

function extractColors(normalizedHtml: string): Record<string, string> {
  const matches = Array.from(normalizedHtml.matchAll(/#[0-9a-f]{3,8}/gi)).map((match) => match[0].toLowerCase());
  const unique = Array.from(new Set(matches)).slice(0, 8);
  const colors: Record<string, string> = {};
  unique.forEach((color, index) => {
    colors[`color${index + 1}`] = color;
  });
  return colors;
}

function createToken(input: {
  systemId: string;
  name: string;
  category: DesignToken["category"];
  value: string;
  provenance: string;
  status?: DesignSystemItemStatus;
}): DesignToken {
  return {
    id: `token_${stableHash(`${input.systemId}:${input.name}:${input.value}`)}`,
    name: input.name,
    category: input.category,
    value: input.value,
    modes: [],
    provenance: input.provenance,
    status: input.status ?? "candidate"
  };
}

function normalizedTokenName(name: string): string {
  return name.trim().replace(/\s+/g, ".").replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
}

function dedupeTokens(tokens: DesignToken[]): DesignToken[] {
  const byName = new Map<string, DesignToken>();
  for (const token of tokens) {
    const name = normalizedTokenName(token.name);
    if (!name) {
      throw new Error("Design token name must not be empty.");
    }
    if (!byName.has(name)) {
      byName.set(name, { ...token, name });
    }
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function assertUniqueTokenNames(tokens: DesignToken[]): void {
  const seen = new Set<string>();
  for (const token of tokens) {
    const name = normalizedTokenName(token.name);
    if (seen.has(name)) {
      throw new Error(`Duplicate design token name: ${name}`);
    }
    seen.add(name);
  }
}

function patternsFromCanvasGraph(systemId: string, graph: CanvasGraph | undefined): DesignComponentPattern[] {
  if (!graph) {
    return [];
  }
  return Object.values(graph.components).map((component) => ({
    id: `component_pattern_${stableHash(`${systemId}:${component.id}`)}`,
    name: component.name,
    sourceObjectId: component.sourceObjectId,
    componentId: component.id,
    variantIds: component.variants.map((variant) => variant.id),
    propNames: component.props.map((prop) => prop.name),
    tokenIds: [],
    provenance: `canvas-component:${component.id}`,
    status: "candidate" as const
  }));
}

function dedupePatterns(patterns: DesignComponentPattern[]): DesignComponentPattern[] {
  const byId = new Map<string, DesignComponentPattern>();
  for (const pattern of patterns) {
    if (!byId.has(pattern.id)) {
      byId.set(pattern.id, pattern);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function updateItemStatuses(
  system: DesignSystem,
  itemIds: string[],
  status: DesignSystemItemStatus
): DesignSystem {
  const idSet = new Set(itemIds);
  return DesignSystemSchema.parse({
    ...system,
    tokens: system.tokens.map((token) => idSet.has(token.id) ? { ...token, status } : token),
    componentPatterns: system.componentPatterns.map((pattern) =>
      idSet.has(pattern.id) ? { ...pattern, status } : pattern
    ),
    publishState: status === "approved" ? "reviewed" : system.publishState,
    updatedAt: new Date().toISOString()
  });
}

function createVersionSnapshot(system: DesignSystem): DesignSystemVersionSnapshot {
  return {
    colors: system.colors,
    typography: system.typography,
    radius: system.radius,
    spacing: system.spacing,
    tokens: system.tokens,
    codeReferences: system.codeReferences,
    componentPatterns: system.componentPatterns,
    publishState: system.publishState
  };
}

function stableSnapshotHash(snapshot: DesignSystemVersionSnapshot): string {
  return stableHash(stableSerialize(snapshot));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function validateCodeMapping(system: DesignSystem, mapping: CodeMappingInput): void {
  if (mapping.cssVariable && !/^--[a-z0-9][a-z0-9-]*$/.test(mapping.cssVariable)) {
    throw new Error(`Invalid CSS variable mapping: ${mapping.cssVariable}`);
  }
  if (mapping.tailwindClass && !isSafeTailwindClass(mapping.tailwindClass)) {
    throw new Error(`Unsafe Tailwind class mapping: ${mapping.tailwindClass}`);
  }
  if (mapping.codeReferenceId && !system.codeReferences.some((reference) => reference.id === mapping.codeReferenceId)) {
    throw new Error(`Unknown code component reference: ${mapping.codeReferenceId}`);
  }
}

function definedMapping(mapping: CodeMappingInput): CodeMappingInput {
  return Object.fromEntries(Object.entries(mapping).flatMap(([key, value]) => {
    if (value === undefined) {
      return [];
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? [[key, trimmed]] : [];
    }
    return [[key, value]];
  })) as CodeMappingInput;
}

function cleanCodeReferenceInput(input: CodeReferenceInput): CodeReferenceInput {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        cleaned[key] = trimmed;
      }
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned as CodeReferenceInput;
}

function isSafeTailwindClass(value: string): boolean {
  return value.trim().length > 0 && !/[<>"';]/.test(value) && !/javascript:|url\(/i.test(value);
}

function isSafeRepoPath(value: string): boolean {
  return !value.startsWith("/") && !value.includes("..") && !value.includes("://");
}
