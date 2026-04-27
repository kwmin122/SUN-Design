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
});
