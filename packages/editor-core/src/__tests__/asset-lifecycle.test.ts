import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import { createSourceRecord } from "../context-ingestion.js";
import {
  createAssetLifecycleEvent,
  createProjectAssetUrl,
  relinkAssetSource,
  replaceAssetReference
} from "../asset-lifecycle.js";
import type { AssetRef } from "../schemas.js";

const TEST_TIME = "2026-04-29T00:00:00.000Z";

function createBundle() {
  return normalizeHtml({
    id: "phase-09-assets",
    title: "Phase 09 Assets",
    html: BASIC_LANDING_FIXTURE_HTML
  });
}

describe("asset lifecycle foundation", () => {
  it("creates stable project asset URLs", () => {
    const url = createProjectAssetUrl("project", "asset_1");
    expect(url.url).toBe("kdesign://asset/project/asset_1");

    const encoded = createProjectAssetUrl("project ok", "asset:1");
    expect(encoded.url).toBe("kdesign://asset/project%20ok/asset%3A1");
  });

  it("replaces assets and records replacement history", () => {
    const normalized = createBundle();
    const original = normalized.assets[0];
    if (!original) {
      throw new Error("Expected fixture image asset.");
    }
    const nextAsset: AssetRef = {
      id: "asset_next",
      kind: "image",
      status: "cached",
      localPath: "assets/replacement-product-shot.png"
    };
    const bundle = {
      ...normalized,
      assets: [original],
      sourceRecords: [{
        id: "source_asset",
        kind: "image" as const,
        name: "Original image",
        hash: "hash_original",
        createdAt: TEST_TIME,
        importedAt: TEST_TIME,
        localPath: "assets/original.png",
        mimeType: "image/png",
        assetIds: [original.id],
        parseStatus: "parsed" as const,
        usageStatus: "candidate" as const,
        diagnostics: []
      }],
      parsedContextArtifacts: [{
        id: "parsed_asset",
        sourceId: "source_asset",
        kind: "figmaSummary" as const,
        title: "Asset summary",
        summary: "References original asset",
        textBlocks: [],
        tables: [],
        frameNames: ["Frame"],
        assetIds: [original.id],
        metadata: {},
        diagnostics: [],
        createdAt: TEST_TIME
      }]
    };

    const next = replaceAssetReference(bundle, {
      previousAssetId: original.id,
      nextAsset,
      reason: "updated product shot",
      createdAt: TEST_TIME
    });

    expect(next.assets.some((asset) => asset.id === nextAsset.id)).toBe(true);
    expect(next.assetLifecycle[0]?.type).toBe("replaced");
    expect(next.projectAssetUrls.map((item) => item.url)).toContain("kdesign://asset/phase-09-assets/asset_next");
    expect(Object.values(next.editGraph.nodes).some((node) => node.assetId === nextAsset.id)).toBe(true);
    expect(next.html.normalized).toContain("kdesign://asset/phase-09-assets/asset_next");
    expect(next.sourceRecords[0]?.assetIds).toEqual([nextAsset.id]);
    expect(next.parsedContextArtifacts[0]?.assetIds).toEqual([nextAsset.id]);
  });

  it("relinks an asset to a source record", () => {
    const asset: AssetRef = {
      id: "asset_product",
      kind: "image",
      status: "cached",
      localPath: "assets/product.png"
    };
    const bundle = {
      ...createBundle(),
      assets: [asset]
    };
    const source = createSourceRecord({
      projectId: bundle.id,
      kind: "image",
      name: "제품 이미지.png",
      createdAt: TEST_TIME
    });
    const next = relinkAssetSource({
      ...bundle,
      sourceRecords: [source]
    }, {
      assetId: asset.id,
      sourceId: source.id,
      reason: "official source selected",
      createdAt: TEST_TIME
    });

    expect(next.assetLifecycle[0]?.type).toBe("relinked");
    expect(next.assetLifecycle[0]?.sourceId).toBe(source.id);
  });

  it("creates lifecycle events with deterministic ids", () => {
    const event = createAssetLifecycleEvent({
      assetId: "asset_product",
      type: "verified",
      reason: "official source",
      createdAt: TEST_TIME
    });
    expect(event.id).toMatch(/^asset_event_/);
  });
});
