import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { ensureCanvasGraph } from "../canvas-graph.js";
import { createDataBinding, createDataSource } from "../data-bindings.js";
import { createSyncEnvelope } from "../sync.js";
import { normalizeHtml } from "../normalize.js";
import { applyEditPatchToBundle, findNodeIdsByClass } from "../patches.js";
import type { EditPatch, ProjectBundle } from "../schemas.js";

function createBundle(): ProjectBundle {
  return normalizeHtml({
    id: "phase-02-fixture",
    title: "Phase 02 Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  });
}

function createPatch(bundle: ProjectBundle, nodeId: string, op: EditPatch["op"], value: unknown): EditPatch {
  return {
    id: `patch-${op}`,
    nodeId,
    op,
    value,
    source: "canvas",
    baseRevision: bundle.baseRevision,
    createdAt: "2026-04-27T00:00:00.000Z"
  };
}

describe("edit patch application", () => {
  it("applies text and style patches without touching raw HTML", () => {
    const bundle = createBundle();
    const headline = Object.values(bundle.editGraph.nodes).find((node) => node.textPreview?.includes("AI 디자인"));
    expect(headline).toBeDefined();

    const withText = applyEditPatchToBundle(
      bundle,
      createPatch(bundle, headline!.id, "setText", "바이브코더가 바로 고치는 디자인")
    );
    const withStyle = applyEditPatchToBundle(
      withText,
      createPatch(withText, headline!.id, "setStyle", { color: "#2f9f8f", textAlign: "center" })
    );

    expect(withStyle.html.raw).toBe(bundle.html.raw);
    expect(withStyle.html.normalized).toContain("바이브코더가 바로 고치는 디자인");
    expect(withStyle.html.normalized).toContain("color: #2f9f8f");
    expect(withStyle.patches).toHaveLength(2);
  });

  it("applies constrained move, resize, align, and visibility patches", () => {
    const bundle = createBundle();
    const featureGridId = findNodeIdsByClass(bundle, "feature-grid")[0];
    expect(featureGridId).toBeDefined();

    const moved = applyEditPatchToBundle(bundle, createPatch(bundle, featureGridId!, "move", { x: 18, y: 0 }));
    const resized = applyEditPatchToBundle(moved, createPatch(moved, featureGridId!, "resize", { width: 640 }));
    const aligned = applyEditPatchToBundle(resized, createPatch(resized, featureGridId!, "align", "center"));
    const hidden = applyEditPatchToBundle(aligned, createPatch(aligned, featureGridId!, "setVisibility", false));

    expect(hidden.html.normalized).toContain("transform: translate(18px, 0px)");
    expect(hidden.html.normalized).toContain("width: 640px");
    expect(hidden.html.normalized).toContain("text-align: center");
    expect(hidden.html.normalized).toContain("visibility: hidden");
  });

  it("rebases data bindings and sync envelopes when patches change the base revision", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const target = Object.values(bundle.canvasGraph?.objects ?? {}).find((object) => object.nodeId);
    if (!target) {
      throw new Error("Expected canvas object.");
    }
    const source = createDataSource({
      kind: "csv",
      name: "team.csv",
      sourceId: "source_csv",
      fields: ["name"],
      rows: [{ name: "민지" }],
      createdAt: "2026-04-27T00:00:00.000Z"
    });
    const binding = createDataBinding({
      dataSourceId: source.id,
      targetObjectId: target.id,
      ...(target.nodeId ? { targetNodeId: target.nodeId } : {}),
      fieldMap: { title: "name" },
      sourceRevision: bundle.baseRevision,
      createdAt: "2026-04-27T00:00:00.000Z"
    });
    const synced = {
      ...bundle,
      dataSources: [source],
      dataBindings: [binding],
      syncEnvelope: {
        ...createSyncEnvelope({ bundle, createdAt: "2026-04-27T00:00:00.000Z" }),
        status: "synced" as const
      }
    };

    const headline = Object.values(synced.editGraph.nodes).find((node) => node.textPreview?.includes("AI 디자인"));
    if (!headline) {
      throw new Error("Expected headline node.");
    }
    const patched = applyEditPatchToBundle(
      synced,
      createPatch(synced, headline.id, "setText", "리비전이 바뀐 디자인")
    );

    expect(patched.dataBindings[0]?.sourceRevision).toBe(patched.baseRevision);
    expect(patched.syncEnvelope?.localRevision).toBe(patched.baseRevision);
    expect(patched.syncEnvelope?.status).toBe("diverged");
  });

  it("rejects unknown nodes and unsafe style values", () => {
    const bundle = createBundle();
    const headline = Object.values(bundle.editGraph.nodes).find((node) => node.textPreview?.includes("AI 디자인"));
    expect(headline).toBeDefined();

    expect(() => applyEditPatchToBundle(
      bundle,
      createPatch(bundle, "missing-node", "setText", "Nope")
    )).toThrow("Unknown edit node");

    expect(() => applyEditPatchToBundle(
      bundle,
      createPatch(bundle, headline!.id, "setStyle", { backgroundImage: "url(https://example.com/x)" })
    )).toThrow("Unsafe style patch");
  });
});
