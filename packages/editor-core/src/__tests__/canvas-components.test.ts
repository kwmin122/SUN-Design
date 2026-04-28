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
      name: "Product summary",
      props: [
        { name: "headline", kind: "text", defaultValue: "제품 요약" },
        { name: "media", kind: "slot", defaultValue: sourceObjectId },
        { name: "columns", kind: "number", defaultValue: 1 }
      ],
      variants: [
        { name: "Desktop", props: { columns: 3 } },
        { name: "Mobile", props: { columns: 1 } }
      ],
      createdAt: "2026-04-28T00:00:00.000Z"
    });

    expect(component.name).toBe("Product summary");
    expect(component.sourceObjectId).toBe(sourceObjectId);
    expect(component.props.map((prop) => prop.name)).toEqual(["headline", "media", "columns"]);
    expect(component.variants.map((variant) => variant.name)).toEqual(["Base", "Desktop", "Mobile"]);
    expect(component.props.map((prop) => prop.name)).not.toContain("tone");
  });

  it("creates instances, merges overrides, and summarizes state", () => {
    const graph = createGraph();
    const sourceObjectId = graph.objects["obj_artboard_components-fixture"]!.childIds[0]!;
    const component = createLocalComponentDefinition({
      graph,
      sourceObjectId,
      name: "Reusable Module",
      props: [{ name: "label", kind: "text", defaultValue: "가입 CTA" }],
      variants: [{ name: "Emphasis", props: { label: "가입 CTA" } }],
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
    graph.instances[instance.id] = updateComponentOverride(component, instance, "label", "가입 CTA");

    const summary = summarizeComponentInstance(graph, instance.id);
    expect(summary.componentName).toBe("Reusable Module");
    expect(summary.variantName).toBe("Emphasis");
    expect(summary.overrideCount).toBe(1);
  });

  it("rejects invalid component references and empty override keys", () => {
    const graph = createGraph();
    const sourceObjectId = graph.objects["obj_artboard_components-fixture"]!.childIds[0]!;
    const component = createLocalComponentDefinition({
      graph,
      sourceObjectId,
      name: "Reusable Module",
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
    expect(() => updateComponentOverride(component, instance, "", "bad")).toThrow("must not be empty");
    expect(() => updateComponentOverride(component, instance, "missing", "bad")).toThrow("unknown prop");
    expect(() => updateComponentOverride({ ...component, id: "other-component" }, instance, "name", "bad"))
      .toThrow("does not belong");
    expect(() => createLocalComponentDefinition({
      graph,
      sourceObjectId,
      name: "Broken Variant",
      props: [{ name: "headline", kind: "text" }],
      variants: [{ name: "Desktop", props: { missing: "bad" } }],
      createdAt: "2026-04-28T00:00:00.000Z"
    })).toThrow("unknown prop");
  });
});
