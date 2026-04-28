import { describe, expect, it } from "vitest";

import { ProjectBundleSchema } from "../schemas.js";
import { PreviewMessageSchema } from "../preview-schemas.js";

describe("schema contracts", () => {
  it("accepts a minimal ProjectBundle with an empty patch log", () => {
    const result = ProjectBundleSchema.safeParse({
      schemaVersion: 1,
      id: "phase-01-fixture",
      title: "Phase 01 Fixture",
      baseRevision: "rev_test",
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z",
      source: { kind: "fixture" },
      html: {
        raw: "<main></main>",
        sanitized: "<main></main>",
        normalized: '<main data-cdx-id="cdx_test" data-cdx-role="frame"></main>'
      },
      assets: [],
      editGraph: {
        version: 1,
        rootNodeIds: ["cdx_test"],
        nodes: {
          cdx_test: {
            id: "cdx_test",
            kind: "frame",
            tagName: "main",
            domPath: "main[0]",
            fingerprint: "frame-main",
            editableProps: ["backgroundColor", "padding", "gap", "borderRadius"]
          }
        }
      },
      patches: [],
      sanitizerReport: {
        removedElementCount: 0,
        removedAttributeCount: 0,
        blockedUrlCount: 0,
        changes: []
      }
    });

    expect(result.success).toBe(true);
  });

  it("accepts a ProjectBundle with canvas graph and canvas operations", () => {
    const result = ProjectBundleSchema.safeParse({
      schemaVersion: 1,
      id: "phase-06-fixture",
      title: "Phase 06 Fixture",
      baseRevision: "rev_test",
      createdAt: "2026-04-28T00:00:00.000Z",
      updatedAt: "2026-04-28T00:00:00.000Z",
      source: { kind: "fixture" },
      html: {
        raw: "<main></main>",
        sanitized: "<main></main>",
        normalized: '<main data-cdx-id="cdx_test" data-cdx-role="frame"></main>'
      },
      assets: [],
      editGraph: {
        version: 1,
        rootNodeIds: ["cdx_test"],
        nodes: {
          cdx_test: {
            id: "cdx_test",
            kind: "frame",
            tagName: "main",
            domPath: "main[0]",
            fingerprint: "frame-main",
            editableProps: ["backgroundColor", "padding", "gap", "borderRadius"]
          }
        }
      },
      patches: [],
      sanitizerReport: {
        removedElementCount: 0,
        removedAttributeCount: 0,
        blockedUrlCount: 0,
        changes: []
      },
      canvasGraph: {
        version: 1,
        rootObjectIds: ["obj_page"],
        objects: {
          obj_page: {
            id: "obj_page",
            kind: "page",
            name: "Page",
            childIds: ["obj_frame"],
            locked: false,
            hidden: false
          },
          obj_frame: {
            id: "obj_frame",
            kind: "frame",
            name: "Frame",
            nodeId: "cdx_test",
            parentId: "obj_page",
            childIds: [],
            locked: false,
            hidden: false
          }
        },
        components: {},
        instances: {},
        guides: [],
        updatedAt: "2026-04-28T00:00:00.000Z"
      },
      canvasOperations: [{
        id: "canvas_op_1",
        op: "setObjectName",
        objectId: "obj_frame",
        value: { name: "Renamed" },
        source: "canvas",
        baseRevision: "rev_test",
        createdAt: "2026-04-28T00:00:00.000Z"
      }]
    });

    expect(result.success).toBe(true);
  });

  it("accepts a preview.ready message with a nonce", () => {
    const result = PreviewMessageSchema.safeParse({
      type: "preview.ready",
      nonce: "nonce-1",
      documentId: "phase-01-fixture",
      nodeCount: 1
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown preview message type", () => {
    const result = PreviewMessageSchema.safeParse({
      type: "preview.unknown",
      nonce: "nonce-1"
    });

    expect(result.success).toBe(false);
  });
});
