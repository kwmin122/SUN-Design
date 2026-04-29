import { describe, expect, it } from "vitest";

import { ensureCanvasGraph } from "../canvas-graph.js";
import { createLocalComponentDefinition, createLocalComponentInstance } from "../canvas-components.js";
import { extractDesignSystemCandidates, mapTokenToCode } from "../design-system.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import {
  appendAssetDownloadRecord,
  appendDevCodeSnippet,
  appendDevModeReport,
  appendVersionDiffRecord,
  createAssetDownloadRecord,
  createDevCodeSnippet,
  createDevModeInspectReport,
  createVersionDiffRecord,
  markReadyForDev,
  markReadyForDevChanged
} from "../dev-mode.js";
import { normalizeHtml } from "../normalize.js";
import { parseProjectBundleJson, serializeProjectBundle } from "../persistence.js";
import { ProjectBundleSchema, type ProjectBundle } from "../schemas.js";

const NOW = "2026-04-29T00:00:00.000Z";

function createBundle(): ProjectBundle {
  const base = ensureCanvasGraph(normalizeHtml({
    id: "phase-10-dev-fixture",
    title: "Phase 10 Dev Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  }));
  const firstObject = firstNodeObject(base);
  const designSystem = mapTokenToCode(
    extractDesignSystemCandidates(base, NOW),
    extractDesignSystemCandidates(base, NOW).tokens[0]!.id,
    { cssVariable: "--color-primary", tailwindClass: "text-primary" }
  );
  const component = createLocalComponentDefinition({
    graph: base.canvasGraph!,
    sourceObjectId: firstObject.id,
    name: "Hero Component",
    createdAt: NOW
  });
  const instance = createLocalComponentInstance({
    graph: { ...base.canvasGraph!, components: { [component.id]: component } },
    componentId: component.id,
    targetObjectId: firstObject.id,
    createdAt: NOW
  });
  return ProjectBundleSchema.parse({
    ...base,
    designSystem,
    canvasGraph: {
      ...base.canvasGraph!,
      components: { [component.id]: component },
      instances: { [instance.id]: instance },
      objects: {
        ...base.canvasGraph!.objects,
        [firstObject.id]: {
          ...firstObject,
          kind: "componentInstance",
          componentInstanceId: instance.id,
          constraints: {
            x: 10,
            y: 20,
            width: 320,
            height: 180,
            layout: { display: "flex", gap: "16px", padding: "24px" }
          }
        }
      }
    },
    prototypeGraph: {
      version: 1,
      variables: [],
      stateRules: [],
      interactions: [{
        id: "interaction_hero",
        sourceObjectId: firstObject.id,
        targetObjectId: base.canvasGraph!.rootObjectIds[0],
        trigger: "click",
        action: "navigateTo",
        provenance: "phase-10-test",
        createdAt: NOW
      }],
      updatedAt: NOW
    },
    assets: [{
      id: "asset_hero",
      kind: "image",
      status: "verified",
      mimeType: "image/png",
      localPath: "assets/hero.png",
      license: "test-fixture"
    }],
    projectAssetUrls: [{
      assetId: "asset_hero",
      url: "kdesign://asset/phase-10-dev-fixture/asset_hero"
    }],
    updatedAt: NOW
  });
}

describe("Dev Mode helpers", () => {
  it("creates inspect reports from stored canvas, tokens, component, prototype, and layout data", () => {
    const bundle = createBundle();
    const object = firstNodeObject(bundle);
    const report = createDevModeInspectReport(bundle, { objectId: object.id, createdAt: NOW });

    expect(report.objectId).toBe(object.id);
    expect(report.measurement.bounds.width).toBe(320);
    expect(report.measurement.spacing.padding).toBe("24px");
    expect(report.cssProperties.padding).toBe("24px");
    expect(report.tokenReferences.some((token) => token.tailwindClass === "text-primary")).toBe(true);
    expect(report.accessibilityNotes.some((note) => note.code === "missing_rendered_rect")).toBe(true);
    expect(report.componentMetadata.componentName).toBe("Hero Component");
    expect(report.prototypeMetadata.interactionIds).toContain("interaction_hero");
  });

  it("creates copyable code snippets for css, tailwind, react props, and token references", () => {
    const bundle = createBundle();
    const object = firstNodeObject(bundle);
    const kinds = ["css", "tailwind", "reactProps", "tokenReference"] as const;

    const snippets = kinds.map((kind) => createDevCodeSnippet(bundle, {
      objectId: object.id,
      kind,
      createdAt: `${NOW}:${kind}`
    }));

    expect(snippets.find((snippet) => snippet.kind === "css")?.code).toContain("padding: 24px;");
    expect(snippets.find((snippet) => snippet.kind === "tailwind")?.code).toContain("text-primary");
    expect(snippets.find((snippet) => snippet.kind === "reactProps")?.code).toContain(object.id);
    expect(snippets.find((snippet) => snippet.kind === "tokenReference")?.code).toContain("--color-primary");
  });

  it("persists ready markers, changed markers, reports, snippets, diffs, and asset downloads", () => {
    let bundle = createBundle();
    const object = firstNodeObject(bundle);
    const report = createDevModeInspectReport(bundle, { objectId: object.id, createdAt: NOW });
    const snippet = createDevCodeSnippet(bundle, { objectId: object.id, kind: "css", createdAt: NOW });
    bundle = ProjectBundleSchema.parse({
      ...bundle,
      versions: [{
        id: "previous_revision",
        label: "Previous",
        html: bundle.html.normalized,
        patchCount: 0,
        createdAt: NOW
      }]
    });
    const diff = createVersionDiffRecord(bundle, { fromRevision: "previous_revision", objectIds: [object.id], createdAt: NOW });
    const download = createAssetDownloadRecord(bundle, { assetId: "asset_hero", createdAt: NOW });

    bundle = appendDevModeReport(bundle, report);
    bundle = appendDevCodeSnippet(bundle, snippet);
    bundle = markReadyForDev(bundle, { objectId: object.id, label: "Ready for handoff", createdAt: NOW });
    bundle = ProjectBundleSchema.parse({
      ...bundle,
      versions: [
        ...bundle.versions,
        {
          id: bundle.baseRevision,
          label: "Ready revision",
          html: bundle.html.normalized,
          patchCount: bundle.patches.length,
          createdAt: NOW
        }
      ],
      baseRevision: "phase-10-next-revision"
    });
    bundle = markReadyForDevChanged(bundle, object.id, NOW);
    bundle = appendVersionDiffRecord(bundle, diff);
    bundle = appendAssetDownloadRecord(bundle, download);

    const parsed = parseProjectBundleJson(serializeProjectBundle(bundle));
    expect(parsed.devModeReports).toHaveLength(1);
    expect(parsed.devCodeSnippets).toHaveLength(1);
    expect(parsed.readyForDevMarkers[0]?.status).toBe("changed");
    expect(parsed.versionDiffs[0]?.fromRevision).toBe("previous_revision");
    expect(parsed.assetDownloads[0]?.url).toBe("kdesign://asset/phase-10-dev-fixture/asset_hero");
  });

  it("rejects unknown objects and assets without stable project URLs", () => {
    const bundle = createBundle();
    expect(() => createDevModeInspectReport(bundle, { objectId: "missing_object", createdAt: NOW }))
      .toThrow("Unknown Dev Mode object");
    const withoutUrl = ProjectBundleSchema.parse({ ...bundle, projectAssetUrls: [] });
    expect(() => createAssetDownloadRecord(withoutUrl, { assetId: "asset_hero", createdAt: NOW }))
      .toThrow("Asset download requires stable project URL");
  });
});

function firstNodeObject(bundle: ProjectBundle) {
  const object = Object.values(bundle.canvasGraph!.objects).find((item) => item.nodeId);
  if (!object) {
    throw new Error("Fixture needs a canvas object with an edit node.");
  }
  return object;
}
