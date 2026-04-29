import { ensureCanvasGraph } from "./canvas-graph.js";
import { stableHash } from "./ids.js";
import {
  DevCodeSnippetSchema,
  DevModeInspectReportSchema,
  ProjectBundleSchema,
  ReadyForDevMarkerSchema,
  VersionDiffRecordSchema,
  type AssetDownloadRecord,
  type CanvasObject,
  type DevCodeSnippet,
  type DevCodeSnippetKind,
  type DevModeInspectReport,
  type EditNode,
  type ProjectBundle,
  type ReadyForDevMarker,
  type VersionDiffRecord
} from "./schemas.js";

type RenderedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function createDevModeInspectReport(
  bundle: ProjectBundle,
  input: { objectId: string; renderedRect?: RenderedRect; createdAt?: string }
): DevModeInspectReport {
  const current = ensureCanvasGraph(bundle);
  const object = getObject(current, input.objectId);
  const node = object.nodeId ? current.editGraph.nodes[object.nodeId] : undefined;
  const createdAt = input.createdAt ?? new Date().toISOString();
  const bounds = input.renderedRect ?? fallbackBounds(object);
  const layout = stringifyLayout(object.constraints?.layout ?? {});
  const tokenReferences = (current.designSystem?.tokens ?? []).map((token) => ({
    tokenId: token.id,
    name: token.name,
    category: token.category,
    value: token.value,
    ...(token.codeMapping?.cssVariable ? { cssVariable: token.codeMapping.cssVariable } : {}),
    ...(token.codeMapping?.tailwindClass ? { tailwindClass: token.codeMapping.tailwindClass } : {}),
    ...(token.codeMapping?.codeReferenceId ? { codeReferenceId: token.codeMapping.codeReferenceId } : {})
  }));

  return DevModeInspectReportSchema.parse({
    id: `dev_report_${stableHash(`${current.id}:${object.id}:${current.baseRevision}:${createdAt}`)}`,
    objectId: object.id,
    ...(object.nodeId ? { nodeId: object.nodeId } : {}),
    sourceRevision: current.baseRevision,
    measurement: {
      objectId: object.id,
      ...(object.nodeId ? { nodeId: object.nodeId } : {}),
      bounds,
      spacing: {
        ...(object.constraints?.layout?.padding ? { padding: object.constraints.layout.padding } : {}),
        ...(object.constraints?.layout?.gap ? { gap: object.constraints.layout.gap } : {})
      },
      layout,
      capturedAt: createdAt
    },
    cssProperties: cssPropertiesForObject(object),
    tokenReferences,
    accessibilityNotes: input.renderedRect ? [] : [{
      id: `dev_note_${stableHash(`${object.id}:missing_rendered_rect:${createdAt}`)}`,
      severity: "info",
      code: "missing_rendered_rect",
      message: "Rendered layout bounds were unavailable; deterministic canvas constraints were used.",
      objectId: object.id,
      ...(object.nodeId ? { nodeId: object.nodeId } : {})
    }],
    componentMetadata: componentMetadata(current, object),
    prototypeMetadata: prototypeMetadata(current, object),
    assetIds: assetIdsForObject(current, object, node),
    createdAt
  });
}

export function createDevCodeSnippet(
  bundle: ProjectBundle,
  input: { objectId: string; kind: DevCodeSnippetKind; createdAt?: string }
): DevCodeSnippet {
  const report = createDevModeInspectReport(bundle, input);
  const current = ensureCanvasGraph(bundle);
  const object = getObject(current, input.objectId);
  const createdAt = input.createdAt ?? new Date().toISOString();
  return DevCodeSnippetSchema.parse({
    id: `dev_snippet_${stableHash(`${current.id}:${object.id}:${input.kind}:${current.baseRevision}:${createdAt}`)}`,
    objectId: object.id,
    ...(object.nodeId ? { nodeId: object.nodeId } : {}),
    kind: input.kind,
    label: labelForSnippet(input.kind),
    language: languageForSnippet(input.kind),
    code: codeForSnippet(report, object, input.kind),
    sourceRevision: current.baseRevision,
    createdAt
  });
}

export function markReadyForDev(
  bundle: ProjectBundle,
  input: {
    objectId: string;
    status?: "ready" | "blocked";
    label: string;
    reviewer?: string;
    notes?: string;
    createdAt?: string;
  }
): ProjectBundle {
  const current = ensureCanvasGraph(bundle);
  const object = getObject(current, input.objectId);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const marker = ReadyForDevMarkerSchema.parse({
    id: `ready_${stableHash(`${current.id}:${object.id}:${current.baseRevision}`)}`,
    objectId: object.id,
    ...(object.nodeId ? { nodeId: object.nodeId } : {}),
    status: input.status ?? "ready",
    label: requireText(input.label, "Ready-for-dev label"),
    ...(input.reviewer ? { reviewer: input.reviewer } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    sourceRevision: current.baseRevision,
    createdAt,
    updatedAt: createdAt
  });

  return ProjectBundleSchema.parse({
    ...current,
    readyForDevMarkers: [
      marker,
      ...current.readyForDevMarkers.filter((item) => item.objectId !== object.id)
    ],
    updatedAt: createdAt
  });
}

export function markReadyForDevChanged(
  bundle: ProjectBundle,
  objectId: string,
  createdAt = new Date().toISOString()
): ProjectBundle {
  const current = ensureCanvasGraph(bundle);
  getObject(current, objectId);
  return ProjectBundleSchema.parse({
    ...current,
    readyForDevMarkers: current.readyForDevMarkers.map((marker) => (
      marker.objectId === objectId && marker.sourceRevision !== current.baseRevision
        ? { ...marker, status: "changed" as const, updatedAt: createdAt }
        : marker
    )),
    updatedAt: createdAt
  });
}

export function createVersionDiffRecord(
  bundle: ProjectBundle,
  input: { fromRevision: string; toRevision?: string; objectIds?: string[]; createdAt?: string }
): VersionDiffRecord {
  const current = ensureCanvasGraph(bundle);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const objectIds = input.objectIds?.length ? input.objectIds : current.canvasGraph!.rootObjectIds;
  const fromVersion = current.versions.find((version) => version.id === input.fromRevision);
  const changes: VersionDiffRecord["changes"] = [];
  for (const objectId of objectIds) {
    const object = getObject(current, objectId);
    if (!fromVersion) {
      changes.push({
        id: `diff_change_${stableHash(`${object.id}:${input.fromRevision}:missing-version-source`)}`,
        objectId: object.id,
        ...(object.nodeId ? { nodeId: object.nodeId } : {}),
        kind: "unknown" as const,
        before: "missing-version-source",
        after: current.baseRevision,
        severity: "info" as const
      });
      continue;
    }
    changes.push({
      id: `diff_change_${stableHash(`${object.id}:${input.fromRevision}:${current.baseRevision}:${object.name}`)}`,
      objectId: object.id,
      ...(object.nodeId ? { nodeId: object.nodeId } : {}),
      kind: "layout" as const,
      before: fromVersion.id,
      after: JSON.stringify({ name: object.name, constraints: object.constraints ?? {} }),
      severity: "info" as const
    });
  }

  return VersionDiffRecordSchema.parse({
    id: `version_diff_${stableHash(`${current.id}:${input.fromRevision}:${input.toRevision ?? current.baseRevision}:${createdAt}`)}`,
    fromRevision: input.fromRevision,
    toRevision: input.toRevision ?? current.baseRevision,
    objectIds,
    changes,
    createdAt
  });
}

export function createAssetDownloadRecord(
  bundle: ProjectBundle,
  input: { assetId: string; createdAt?: string }
): AssetDownloadRecord {
  const current = ensureCanvasGraph(bundle);
  const asset = current.assets.find((item) => item.id === input.assetId);
  if (!asset) {
    throw new Error(`Unknown Dev Mode asset: ${input.assetId}`);
  }
  const projectUrl = current.projectAssetUrls.find((item) => item.assetId === asset.id);
  if (!projectUrl) {
    throw new Error(`Asset download requires stable project URL: ${asset.id}`);
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const filename = asset.localPath?.split("/").pop() ?? `${asset.id}.${extensionForMime(asset.mimeType)}`;
  return {
    id: `asset_download_${stableHash(`${current.id}:${asset.id}:${current.baseRevision}:${createdAt}`)}`,
    assetId: asset.id,
    filename,
    mimeType: asset.mimeType ?? "application/octet-stream",
    bytes: new TextEncoder().encode(projectUrl.url).length,
    url: projectUrl.url,
    sourceRevision: current.baseRevision,
    ...(asset.license ? { license: asset.license } : {}),
    createdAt
  };
}

export function appendDevModeReport(bundle: ProjectBundle, report: DevModeInspectReport): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    devModeReports: [report, ...bundle.devModeReports.filter((item) => item.id !== report.id)],
    updatedAt: report.createdAt
  });
}

export function appendDevCodeSnippet(bundle: ProjectBundle, snippet: DevCodeSnippet): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    devCodeSnippets: [snippet, ...bundle.devCodeSnippets.filter((item) => item.id !== snippet.id)],
    updatedAt: snippet.createdAt
  });
}

export function appendVersionDiffRecord(bundle: ProjectBundle, diff: VersionDiffRecord): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    versionDiffs: [diff, ...bundle.versionDiffs.filter((item) => item.id !== diff.id)],
    updatedAt: diff.createdAt
  });
}

export function appendAssetDownloadRecord(bundle: ProjectBundle, record: AssetDownloadRecord): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    assetDownloads: [record, ...bundle.assetDownloads.filter((item) => item.id !== record.id)],
    updatedAt: record.createdAt
  });
}

function getObject(bundle: ProjectBundle, objectId: string): CanvasObject {
  const object = bundle.canvasGraph?.objects[objectId];
  if (!object) {
    throw new Error(`Unknown Dev Mode object: ${objectId}`);
  }
  return object;
}

function fallbackBounds(object: CanvasObject): RenderedRect {
  return {
    x: object.constraints?.x ?? 0,
    y: object.constraints?.y ?? 0,
    width: object.constraints?.width ?? object.constraints?.minWidth ?? 0,
    height: object.constraints?.height ?? object.constraints?.minHeight ?? 0
  };
}

function stringifyLayout(layout: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(layout)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
}

function cssPropertiesForObject(object: CanvasObject): Record<string, string> {
  const layout = object.constraints?.layout;
  return Object.fromEntries(
    Object.entries({
      display: layout?.display,
      "flex-direction": layout?.flexDirection,
      gap: layout?.gap,
      padding: layout?.padding,
      "align-items": layout?.alignItems,
      "justify-content": layout?.justifyContent,
      "grid-template-columns": layout?.gridTemplateColumns,
      width: object.constraints?.width ? `${object.constraints.width}px` : undefined,
      height: object.constraints?.height ? `${object.constraints.height}px` : undefined,
      visibility: object.hidden ? "hidden" : "visible"
    }).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)
  );
}

function componentMetadata(bundle: ProjectBundle, object: CanvasObject): Record<string, string> {
  if (!object.componentInstanceId || !bundle.canvasGraph) {
    return {};
  }
  const instance = bundle.canvasGraph.instances[object.componentInstanceId];
  const component = instance ? bundle.canvasGraph.components[instance.componentId] : undefined;
  if (!instance || !component) {
    return {};
  }
  const variant = instance.variantId
    ? component.variants.find((item) => item.id === instance.variantId)
    : component.variants[0];
  return {
    componentId: component.id,
    componentName: component.name,
    variantId: variant?.id ?? "",
    state: instance.state,
    overrideCount: String(Object.keys(instance.overrides).length)
  };
}

function prototypeMetadata(bundle: ProjectBundle, object: CanvasObject): Record<string, string> {
  const interactions = bundle.prototypeGraph?.interactions.filter((interaction) =>
    interaction.sourceObjectId === object.id || interaction.targetObjectId === object.id
  ) ?? [];
  return interactions.length > 0
    ? { interactionIds: interactions.map((interaction) => interaction.id).join(",") }
    : {};
}

function assetIdsForObject(bundle: ProjectBundle, object: CanvasObject, node: EditNode | undefined): string[] {
  const ids = new Set<string>();
  if (node?.assetId) {
    ids.add(node.assetId);
  }
  for (const childId of object.childIds) {
    const child = bundle.canvasGraph?.objects[childId];
    const childNode = child?.nodeId ? bundle.editGraph.nodes[child.nodeId] : undefined;
    if (childNode?.assetId) {
      ids.add(childNode.assetId);
    }
  }
  return [...ids];
}

function labelForSnippet(kind: DevCodeSnippetKind): string {
  return {
    css: "CSS declarations",
    tailwind: "Tailwind classes",
    reactProps: "React props",
    tokenReference: "Design token references"
  }[kind];
}

function languageForSnippet(kind: DevCodeSnippetKind): string {
  return kind === "reactProps" ? "json" : kind === "tailwind" ? "text" : "css";
}

function codeForSnippet(report: DevModeInspectReport, object: CanvasObject, kind: DevCodeSnippetKind): string {
  if (kind === "css") {
    return Object.entries(report.cssProperties)
      .map(([property, value]) => `${property}: ${value};`)
      .join("\n");
  }
  if (kind === "tailwind") {
    const tokenClasses = report.tokenReferences
      .map((token) => token.tailwindClass)
      .filter((value): value is string => Boolean(value));
    return [...new Set(tokenClasses)].join(" ") || "block";
  }
  if (kind === "tokenReference") {
    return report.tokenReferences
      .map((token) => `${token.name}: ${token.cssVariable ?? token.tailwindClass ?? token.value}`)
      .join("\n");
  }
  return JSON.stringify({
    objectId: object.id,
    componentInstanceId: object.componentInstanceId,
    nodeId: object.nodeId,
    assetIds: report.assetIds
  }, null, 2);
}

function extensionForMime(mimeType: string | undefined): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "text/css") return "css";
  return "bin";
}

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must not be empty.`);
  }
  return trimmed;
}
