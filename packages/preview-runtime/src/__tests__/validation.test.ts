import { describe, expect, it } from "vitest";

import { validatePreviewMessage } from "../validation.js";

const source = {} as Window;
const otherSource = {} as Window;

function messageEvent(data: unknown, eventSource: Window | null = source): MessageEvent {
  return {
    data,
    source: eventSource
  } as MessageEvent;
}

describe("validatePreviewMessage", () => {
  it("accepts a valid ready message with the expected source and nonce", () => {
    const result = validatePreviewMessage(
      messageEvent({
        type: "preview.ready",
        nonce: "nonce-1",
        documentId: "phase-01-fixture",
        nodeCount: 5
      }),
      { source, nonce: "nonce-1" }
    );

    expect(result.ok).toBe(true);
  });

  it("rejects a wrong source", () => {
    const result = validatePreviewMessage(
      messageEvent(
        {
          type: "preview.ready",
          nonce: "nonce-1",
          documentId: "phase-01-fixture",
          nodeCount: 5
        },
        otherSource
      ),
      { source, nonce: "nonce-1" }
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.failure.code).toBe("invalid_source");
  });

  it("rejects a missing nonce", () => {
    const result = validatePreviewMessage(
      messageEvent({
        type: "preview.ready",
        documentId: "phase-01-fixture",
        nodeCount: 5
      }),
      { source, nonce: "nonce-1" }
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.failure.code).toBe("missing_nonce");
  });

  it("rejects a wrong nonce", () => {
    const result = validatePreviewMessage(
      messageEvent({
        type: "preview.ready",
        nonce: "wrong",
        documentId: "phase-01-fixture",
        nodeCount: 5
      }),
      { source, nonce: "nonce-1" }
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.failure.code).toBe("invalid_nonce");
  });

  it("rejects an unknown type", () => {
    const result = validatePreviewMessage(
      messageEvent({
        type: "preview.unknown",
        nonce: "nonce-1"
      }),
      { source, nonce: "nonce-1" }
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.failure.code).toBe("unknown_type");
  });

  it("rejects schema-invalid console payloads", () => {
    const result = validatePreviewMessage(
      messageEvent({
        type: "preview.console",
        nonce: "nonce-1",
        level: "error",
        args: "not-array"
      }),
      { source, nonce: "nonce-1" }
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.failure.code).toBe("schema_invalid");
  });

  it("accepts validated node registry and selection messages", () => {
    const node = {
      nodeId: "cdx_123",
      kind: "text",
      tagName: "h1",
      textPreview: "AI 디자인",
      x: 10,
      y: 20,
      width: 300,
      height: 80
    };

    const nodes = validatePreviewMessage(
      messageEvent({
        type: "preview.nodes",
        nonce: "nonce-1",
        documentId: "phase-01-fixture",
        nodes: [node]
      }),
      { source, nonce: "nonce-1" }
    );
    const selected = validatePreviewMessage(
      messageEvent({
        type: "preview.select",
        nonce: "nonce-1",
        node
      }),
      { source, nonce: "nonce-1" }
    );

    expect(nodes.ok).toBe(true);
    expect(selected.ok).toBe(true);
  });

  it("rejects schema-invalid selection geometry", () => {
    const result = validatePreviewMessage(
      messageEvent({
        type: "preview.select",
        nonce: "nonce-1",
        node: {
          nodeId: "cdx_123",
          kind: "text",
          tagName: "h1",
          x: 10,
          y: 20,
          width: -1,
          height: 80
        }
      }),
      { source, nonce: "nonce-1" }
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.failure.code).toBe("schema_invalid");
  });
});
