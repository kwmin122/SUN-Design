import { describe, expect, it } from "vitest";

import { createLocalComponentDefinition, createLocalComponentInstance } from "../canvas-components.js";
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

  it("rejects corrupted persisted canvas graphs on load", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const raw = JSON.parse(serializeProjectBundle(bundle));
    const artboardId = "obj_artboard_canvas-fixture";
    const firstChildId = raw.canvasGraph.objects[artboardId].childIds[0];
    raw.canvasGraph.objects[artboardId].childIds.push(firstChildId);

    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("multiple parents");

    raw.canvasGraph.objects[artboardId].childIds.pop();
    raw.canvasGraph.objects[firstChildId].nodeId = "missing-node";

    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("missing edit node");
  });

  it("rejects persisted component prop and variant invariant violations on load", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const graph = bundle.canvasGraph!;
    const sourceObjectId = graph.objects["obj_artboard_canvas-fixture"]!.childIds[0]!;
    const component = createLocalComponentDefinition({
      graph,
      sourceObjectId,
      name: "Article module",
      props: [{ name: "headline", kind: "text", defaultValue: "뉴스" }],
      variants: [{ name: "Desktop", props: { headline: "데스크톱 뉴스" } }],
      createdAt: "2026-04-28T00:00:00.000Z"
    });
    graph.components[component.id] = component;
    const instance = createLocalComponentInstance({
      graph,
      componentId: component.id,
      targetObjectId: sourceObjectId,
      variantId: component.variants[1]!.id,
      createdAt: "2026-04-28T00:00:01.000Z"
    });
    graph.instances[instance.id] = {
      ...instance,
      overrides: { headline: "인스턴스 뉴스" }
    };
    graph.objects[sourceObjectId] = {
      ...graph.objects[sourceObjectId]!,
      kind: "componentInstance",
      componentInstanceId: instance.id
    };

    const variantCorruption = JSON.parse(serializeProjectBundle(bundle));
    variantCorruption.canvasGraph.components[component.id].variants[1].props.missing = "bad";
    expect(() => parseProjectBundleJson(JSON.stringify(variantCorruption))).toThrow("unknown prop");

    const instanceVariantCorruption = JSON.parse(serializeProjectBundle(bundle));
    instanceVariantCorruption.canvasGraph.instances[instance.id].variantId = "missing-variant";
    expect(() => parseProjectBundleJson(JSON.stringify(instanceVariantCorruption))).toThrow("unknown variant");

    const instanceOverrideCorruption = JSON.parse(serializeProjectBundle(bundle));
    instanceOverrideCorruption.canvasGraph.instances[instance.id].overrides.missing = "bad";
    expect(() => parseProjectBundleJson(JSON.stringify(instanceOverrideCorruption))).toThrow("unknown prop");
  });
});
