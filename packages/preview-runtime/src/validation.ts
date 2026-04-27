import type { BridgeValidationFailure, PreviewMessage } from "@kdesign/editor-core";
import { PreviewMessageSchema } from "@kdesign/editor-core";

export type PreviewMessageValidationResult =
  | { ok: true; message: PreviewMessage }
  | { ok: false; failure: BridgeValidationFailure };

const KNOWN_MESSAGE_TYPES = new Set(["preview.ready", "preview.runtime-error", "preview.console"]);

export function validatePreviewMessage(
  event: MessageEvent,
  expected: { source: Window | null; nonce: string }
): PreviewMessageValidationResult {
  if (event.source !== expected.source) {
    return fail("invalid_source", "Preview message came from an unexpected source.");
  }

  if (!isRecord(event.data)) {
    return fail("schema_invalid", "Preview message payload must be an object.");
  }

  const type = typeof event.data.type === "string" ? event.data.type : undefined;
  if (!type || !KNOWN_MESSAGE_TYPES.has(type)) {
    return fail("unknown_type", "Preview message type is not registered.", type);
  }

  if (!("nonce" in event.data)) {
    return fail("missing_nonce", "Preview message is missing a nonce.", type);
  }

  if (event.data.nonce !== expected.nonce) {
    return fail("invalid_nonce", "Preview message nonce does not match the active frame.", type);
  }

  const parsed = PreviewMessageSchema.safeParse(event.data);
  if (!parsed.success) {
    return fail("schema_invalid", "Preview message failed schema validation.", type);
  }

  return {
    ok: true,
    message: parsed.data
  };
}

function fail(
  code: BridgeValidationFailure["code"],
  message: string,
  type?: string
): PreviewMessageValidationResult {
  const failure: BridgeValidationFailure = {
    code,
    message
  };
  if (type) {
    failure.type = type;
  }
  return { ok: false, failure };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
