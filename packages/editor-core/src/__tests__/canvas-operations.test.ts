import { describe, expect, it } from "vitest";

import { applyCanvasOperationToBundle } from "../canvas-operations.js";
import { ensureCanvasGraph, findCanvasObjectByNodeId } from "../canvas-graph.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import type { CanvasOperation, ProjectBundle } from "../schemas.js";

function createBundle(): ProjectBundle {
  return ensureCanvasGraph(normalizeHtml({
    id: "canvas-ops-fixture",
    title: "Canvas Ops Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  }));
}

function createOperation(
  bundle: ProjectBundle,
  objectId: string,
  op: CanvasOperation["op"],
  value: unknown
): CanvasOperation {
  return {
    id: `canvas-op-${op}`,
    objectId,
    op,
    value,
    source: "canvas",
    baseRevision: bundle.baseRevision,
    createdAt: "2026-04-28T00:00:00.000Z"
  };
}

function firstTextObjectId(bundle: ProjectBundle): string {
  const node = Object.values(bundle.editGraph.nodes).find((item) => item.kind === "text");
  expect(node).toBeDefined();
  const object = findCanvasObjectByNodeId(bundle.canvasGraph!, node!.id);
  expect(object).toBeDefined();
  return object!.id;
}

describe("canvas operations", () => {
  it("renames canvas objects and appends operations", () => {
    const bundle = createBundle();
    const objectId = firstTextObjectId(bundle);

    const next = applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, objectId, "setObjectName", { name: "Hero headline" })
    );

    expect(next.canvasGraph?.objects[objectId]?.name).toBe("Hero headline");
    expect(next.canvasOperations).toHaveLength(1);
  });

  it("materializes visibility changes to normalized HTML", () => {
    const bundle = createBundle();
    const objectId = firstTextObjectId(bundle);

    const next = applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, objectId, "setObjectVisibility", { hidden: true })
    );

    expect(next.canvasGraph?.objects[objectId]?.hidden).toBe(true);
    expect(next.html.normalized).toContain("visibility: hidden");
  });

  it("materializes layout constraints to normalized HTML", () => {
    const bundle = createBundle();
    const objectId = firstTextObjectId(bundle);

    const next = applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, objectId, "setLayoutConstraints", {
        constraints: {
          width: 640,
          layout: {
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))"
          }
        }
      })
    );

    expect(next.canvasGraph?.objects[objectId]?.constraints?.width).toBe(640);
    expect(next.html.normalized).toContain("width: 640px");
    expect(next.html.normalized).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
  });

  it("groups and ungroups canvas objects", () => {
    const bundle = createBundle();
    const parent = Object.values(bundle.canvasGraph!.objects).find((object) => object.childIds.length > 1);
    expect(parent?.childIds.length).toBeGreaterThan(1);
    const childObjectIds = parent!.childIds.slice(0, 2);

    const grouped = applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, childObjectIds[0]!, "groupObjects", { name: "Hero Group", childObjectIds })
    );
    const groupId = "obj_group_canvas-op-groupObjects";
    expect(grouped.canvasGraph?.objects[groupId]?.childIds).toEqual(childObjectIds);

    const ungrouped = applyCanvasOperationToBundle(
      grouped,
      createOperation(grouped, groupId, "ungroupObjects", {})
    );
    expect(ungrouped.canvasGraph?.objects[groupId]).toBeUndefined();
  });

  it("rejects graph-corrupting reorder and cross-parent group operations", () => {
    const bundle = createBundle();
    const parent = Object.values(bundle.canvasGraph!.objects).find((object) => {
      const child = object.childIds.map((childId) => bundle.canvasGraph!.objects[childId]).find(Boolean);
      return object.parentId && child?.childIds.length;
    });
    expect(parent).toBeDefined();
    const child = bundle.canvasGraph!.objects[parent!.childIds[0]!]!;
    const grandchild = bundle.canvasGraph!.objects[child.childIds[0]!]!;

    expect(() => applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, parent!.id, "reorderObject", { parentId: grandchild.id, index: 0 })
    )).toThrow("descendant");

    const parents = Object.values(bundle.canvasGraph!.objects).filter((object) => object.childIds.length > 0);
    const firstParent = parents[0]!;
    const secondParent = parents.find((candidate) => candidate.id !== firstParent.id && candidate.childIds[0]);
    expect(secondParent).toBeDefined();

    expect(() => applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, firstParent.childIds[0]!, "groupObjects", {
        name: "Invalid Mixed Group",
        childObjectIds: [firstParent.childIds[0]!, secondParent!.childIds[0]!]
      })
    )).toThrow("same parent");
  });

  it("rejects component instance operations from non-owner objects", () => {
    const bundle = createBundle();
    const parent = Object.values(bundle.canvasGraph!.objects).find((object) => object.childIds.length > 1);
    expect(parent).toBeDefined();
    const [sourceObjectId, unrelatedObjectId] = parent!.childIds;
    expect(sourceObjectId).toBeDefined();
    expect(unrelatedObjectId).toBeDefined();

    const withComponent = applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, sourceObjectId!, "createComponent", {
        name: "Reusable block",
        sourceObjectId,
        variants: [{ name: "Dense", props: { density: "compact" } }]
      })
    );
    const componentId = Object.keys(withComponent.canvasGraph!.components)[0]!;
    const withInstance = applyCanvasOperationToBundle(
      withComponent,
      createOperation(withComponent, sourceObjectId!, "createComponentInstance", { componentId, targetObjectId: sourceObjectId })
    );
    const instanceId = Object.keys(withInstance.canvasGraph!.instances)[0]!;

    expect(() => applyCanvasOperationToBundle(
      withInstance,
      createOperation(withInstance, unrelatedObjectId!, "updateComponentOverride", {
        instanceId,
        overrides: { headline: "Wrong owner" }
      })
    )).toThrow("does not own");

    expect(() => applyCanvasOperationToBundle(
      withInstance,
      createOperation(withInstance, unrelatedObjectId!, "detachComponentInstance", { instanceId })
    )).toThrow("does not own");
  });

  it("rejects locked object mutations", () => {
    const bundle = createBundle();
    const objectId = firstTextObjectId(bundle);
    const locked = applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, objectId, "setObjectLock", { locked: true })
    );

    expect(() => applyCanvasOperationToBundle(
      locked,
      createOperation(locked, objectId, "setObjectName", { name: "Nope" })
    )).toThrow("locked");
  });

  it("rejects unknown objects and unsafe layout values", () => {
    const bundle = createBundle();
    const objectId = firstTextObjectId(bundle);

    expect(() => applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, "missing-object", "setObjectName", { name: "Nope" })
    )).toThrow("Unknown canvas object");

    expect(() => applyCanvasOperationToBundle(
      bundle,
      createOperation(bundle, objectId, "setLayoutConstraints", {
        constraints: { layout: { gap: "url(https://example.com/x)" } }
      })
    )).toThrow("unsafe layout");
  });
});
