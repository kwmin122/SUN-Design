import { describe, expect, it } from "vitest";

import {
  createLocalComponentDefinition,
  createLocalComponentInstance,
  summarizeComponentInstance,
  updateComponentOverride
} from "../canvas-components.js";
import { ensureCanvasGraph } from "../canvas-graph.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";

function createGraph() {
  const bundle = ensureCanvasGraph(normalizeHtml({
    id: "components-fixture",
    title: "Components Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  }));
  return bundle.canvasGraph!;
}

describe("canvas component helpers", () => {
  it("creates a local component with slots props and variants", () => {
    const graph = createGraph();
    const sourceObjectId = graph.objects["obj_artboard_components-fixture"]!.childIds[0]!;

    const component = createLocalComponentDefinition({
      graph,
      sourceObjectId,
      name: "Hero Card",
      createdAt: "2026-04-28T00:00:00.000Z"
    });

    expect(component.name).toBe("Hero Card");
    expect(component.sourceObjectId).toBe(sourceObjectId);
    expect(component.props.map((prop) => prop.name)).toEqual(["label", "tone"]);
    expect(component.variants.map((variant) => variant.name)).toEqual(["Default", "Emphasis"]);
  });

  it("creates instances, merges overrides, and summarizes state", () => {
    const graph = createGraph();
    const sourceObjectId = graph.objects["obj_artboard_components-fixture"]!.childIds[0]!;
    const component = createLocalComponentDefinition({
      graph,
      sourceObjectId,
      name: "Hero Card",
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
    graph.instances[instance.id] = updateComponentOverride(instance, "label", "가입 CTA");

    const summary = summarizeComponentInstance(graph, instance.id);
    expect(summary.componentName).toBe("Hero Card");
    expect(summary.variantName).toBe("Emphasis");
    expect(summary.overrideCount).toBe(1);
  });

  it("rejects invalid component references and empty override keys", () => {
    const graph = createGraph();
    const sourceObjectId = graph.objects["obj_artboard_components-fixture"]!.childIds[0]!;
    const component = createLocalComponentDefinition({
      graph,
      sourceObjectId,
      name: "Hero Card",
      createdAt: "2026-04-28T00:00:00.000Z"
    });
    graph.components[component.id] = component;

    expect(() => createLocalComponentDefinition({
      graph,
      sourceObjectId: "missing-object",
      name: "Broken",
      createdAt: "2026-04-28T00:00:00.000Z"
    })).toThrow("Unknown component source object");

    expect(() => createLocalComponentInstance({
      graph,
      componentId: component.id,
      targetObjectId: sourceObjectId,
      variantId: "missing-variant",
      createdAt: "2026-04-28T00:00:01.000Z"
    })).toThrow("Unknown component variant");

    const instance = createLocalComponentInstance({
      graph,
      componentId: component.id,
      targetObjectId: sourceObjectId,
      createdAt: "2026-04-28T00:00:01.000Z"
    });
    expect(() => updateComponentOverride(instance, "", "bad")).toThrow("must not be empty");
  });
});
