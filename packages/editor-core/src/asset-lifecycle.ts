import { stableHash } from "./ids.js";
import { applyEditPatchesToBundle } from "./patches.js";
import {
  AssetLifecycleEventSchema,
  ProjectAssetUrlSchema,
  ProjectBundleSchema,
  type AssetLifecycleEvent,
  type AssetLifecycleEventType,
  type AssetRef,
  type EditPatch,
  type ProjectAssetUrl,
  type ProjectBundle
} from "./schemas.js";

export function createProjectAssetUrl(projectId: string, assetId: string): ProjectAssetUrl {
  return ProjectAssetUrlSchema.parse({
    assetId,
    url: `kdesign://asset/${encodeURIComponent(projectId)}/${encodeURIComponent(assetId)}`
  });
}

export function createAssetLifecycleEvent(input: {
  assetId: string;
  type: AssetLifecycleEventType;
  sourceId?: string;
  previousAssetId?: string;
  nextAssetId?: string;
  reason?: string;
  createdAt?: string;
}): AssetLifecycleEvent {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return AssetLifecycleEventSchema.parse({
    id: `asset_event_${stableHash(`${input.assetId}:${input.type}:${input.reason ?? ""}:${createdAt}`)}`,
    assetId: input.assetId,
    type: input.type,
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    ...(input.previousAssetId ? { previousAssetId: input.previousAssetId } : {}),
    ...(input.nextAssetId ? { nextAssetId: input.nextAssetId } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    createdAt
  });
}

export function replaceAssetReference(
  bundle: ProjectBundle,
  input: {
    previousAssetId: string;
    nextAsset: AssetRef;
    reason: string;
    createdAt?: string;
  }
): ProjectBundle {
  if (!bundle.assets.some((asset) => asset.id === input.previousAssetId)) {
    throw new Error(`Asset replacement references missing previous asset: ${input.previousAssetId}`);
  }
  const event = createAssetLifecycleEvent({
    assetId: input.previousAssetId,
    type: "replaced",
    previousAssetId: input.previousAssetId,
    nextAssetId: input.nextAsset.id,
    reason: input.reason,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
  const assets = bundle.assets.some((asset) => asset.id === input.nextAsset.id)
    ? bundle.assets
    : [...bundle.assets, input.nextAsset];
  const urls = upsertAssetUrls(bundle.projectAssetUrls, [
    createProjectAssetUrl(bundle.id, input.previousAssetId),
    createProjectAssetUrl(bundle.id, input.nextAsset.id)
  ]);
  const materialized = ProjectBundleSchema.parse({
    ...bundle,
    assets,
    assetLifecycle: [...bundle.assetLifecycle, event],
    projectAssetUrls: urls
  });
  const nodeIds = Object.values(materialized.editGraph.nodes)
    .filter((node) => node.assetId === input.previousAssetId)
    .map((node) => node.id);
  if (nodeIds.length === 0) {
    return replaceStoredAssetReferences(materialized, input.previousAssetId, input.nextAsset.id);
  }

  const createdAt = input.createdAt ?? event.createdAt;
  const nextUrl = createProjectAssetUrl(materialized.id, input.nextAsset.id).url;
  const patches: EditPatch[] = nodeIds.map((nodeId) => ({
    id: `patch_${stableHash(`${materialized.baseRevision}:${nodeId}:replace:${input.previousAssetId}:${input.nextAsset.id}`)}`,
    nodeId,
    op: "replaceAsset",
    value: nextUrl,
    source: "system",
    baseRevision: materialized.baseRevision,
    createdAt
  }));

  return replaceStoredAssetReferences(applyEditPatchesToBundle(materialized, patches), input.previousAssetId, input.nextAsset.id);
}

export function relinkAssetSource(
  bundle: ProjectBundle,
  input: {
    assetId: string;
    sourceId: string;
    reason: string;
    createdAt?: string;
  }
): ProjectBundle {
  if (!bundle.assets.some((asset) => asset.id === input.assetId)) {
    throw new Error(`Asset relink references missing asset: ${input.assetId}`);
  }
  if (!bundle.sourceRecords.some((source) => source.id === input.sourceId)) {
    throw new Error(`Asset relink references missing source: ${input.sourceId}`);
  }
  const event = createAssetLifecycleEvent({
    assetId: input.assetId,
    type: "relinked",
    sourceId: input.sourceId,
    reason: input.reason,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });

  return ProjectBundleSchema.parse({
    ...bundle,
    assetLifecycle: [...bundle.assetLifecycle, event],
    projectAssetUrls: upsertAssetUrls(bundle.projectAssetUrls, [createProjectAssetUrl(bundle.id, input.assetId)])
  });
}

function upsertAssetUrls(existing: ProjectAssetUrl[], next: ProjectAssetUrl[]): ProjectAssetUrl[] {
  const byAssetId = new Map(existing.map((item) => [item.assetId, item]));
  for (const item of next) {
    byAssetId.set(item.assetId, item);
  }
  return Array.from(byAssetId.values());
}

function replaceStoredAssetReferences(bundle: ProjectBundle, previousAssetId: string, nextAssetId: string): ProjectBundle {
  const replaceIds = (assetIds: string[]) => Array.from(new Set(
    assetIds.map((assetId) => assetId === previousAssetId ? nextAssetId : assetId)
  ));
  return ProjectBundleSchema.parse({
    ...bundle,
    sourceRecords: bundle.sourceRecords.map((source) => ({
      ...source,
      assetIds: replaceIds(source.assetIds)
    })),
    parsedContextArtifacts: bundle.parsedContextArtifacts.map((artifact) => ({
      ...artifact,
      assetIds: replaceIds(artifact.assetIds)
    })),
    webSnapshots: bundle.webSnapshots.map((snapshot) => (
      snapshot.screenshotAssetId === previousAssetId
        ? { ...snapshot, screenshotAssetId: nextAssetId }
        : snapshot
    ))
  });
}
