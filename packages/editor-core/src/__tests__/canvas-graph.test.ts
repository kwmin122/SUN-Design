import { describe, expect, it } from "vitest";

import { deriveCanvasGraph, ensureCanvasGraph, findCanvasObjectByNodeId, listCanvasObjects } from "../canvas-graph.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import { parseProjectBundleJson, serializeProjectBundle } from "../persistence.js";

function createBundle() {
  return normalizeHtml({
    id: "canvas-fixture",
    title: "Canvas Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  });
}

describe("canvas graph derivation", () => {
  it("derives a deterministic page and artboard graph", () => {
    const bundle = createBundle();
    const graph = deriveCanvasGraph(bundle);

    expect(graph.rootObjectIds).toEqual(["obj_page_canvas-fixture"]);
    expect(graph.objects["obj_page_canvas-fixture"]?.childIds).toEqual(["obj_artboard_canvas-fixture"]);
    expect(graph.objects["obj_artboard_canvas-fixture"]?.kind).toBe("artboard");
    expect(listCanvasObjects(graph).length).toBeGreaterThan(Object.keys(bundle.editGraph.nodes).length);
  });

  it("references existing edit node ids from canvas objects", () => {
    const bundle = createBundle();
    const graph = deriveCanvasGraph(bundle);
    const headline = Object.values(bundle.editGraph.nodes).find((node) =>
      node.kind === "text" && node.textPreview?.includes("AI 디자인")
    );
    expect(headline).toBeDefined();

    const object = findCanvasObjectByNodeId(graph, headline!.id);
    expect(object?.id).toBe(`obj_${headline!.id}`);
    expect(object?.nodeId).toBe(headline!.id);
    expect(object?.kind).toBe("text");
  });

  it("loads v1 JSON without canvasGraph through a deterministic graph", () => {
    const bundle = createBundle();
    const raw = JSON.parse(serializeProjectBundle(bundle)) as Record<string, unknown>;
    delete raw.canvasGraph;
    delete raw.canvasOperations;

    const parsed = parseProjectBundleJson(JSON.stringify(raw));

    expect(parsed.canvasGraph?.rootObjectIds).toEqual(["obj_page_canvas-fixture"]);
    expect(parsed.canvasOperations).toEqual([]);
  });

  it("returns existing canvas graph unchanged when present", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const ensured = ensureCanvasGraph(bundle);

    expect(ensured.canvasGraph).toBe(bundle.canvasGraph);
  });
});
