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
