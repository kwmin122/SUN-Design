"use client";

import type { PreviewError } from "@kdesign/editor-core";
import { validatePreviewMessage } from "@kdesign/preview-runtime";

type PreviewErrorInput = {
  source: "readiness" | "sanitizer" | "bridge" | "runtime" | "console";
  code: string;
  message: string;
  severity?: "info" | "warning" | "error";
  detail?: unknown;
};

type PreviewMessageHandlerResult =
  | { kind: "ready" }
  | { kind: "diagnostic"; error: PreviewError }
  | { kind: "ignored" };

export function toPreviewError(input: PreviewErrorInput): PreviewError {
  const error: PreviewError = {
    id: `${input.source}_${input.code}_${Date.now()}`,
    source: input.source,
    severity: input.severity ?? "warning",
    code: input.code,
    message: input.message,
    createdAt: new Date().toISOString()
  };

  if (input.detail !== undefined) {
    error.detail = input.detail;
  }

  return error;
}

export function handlePreviewMessage(
  event: MessageEvent,
  expected: { source: Window | null; nonce: string }
): PreviewMessageHandlerResult {
  const result = validatePreviewMessage(event, expected);

  if (!result.ok) {
    return {
      kind: "diagnostic",
      error: toPreviewError({
        source: "bridge",
        severity: "warning",
        code: result.failure.code,
        message: result.failure.message,
        detail: result.failure
      })
    };
  }

  switch (result.message.type) {
    case "preview.ready":
      return { kind: "ready" };
    case "preview.runtime-error":
      return {
        kind: "diagnostic",
        error: toPreviewError({
          source: "runtime",
          severity: "error",
          code: "runtime_error",
          message: result.message.message,
          detail: result.message.stack
        })
      };
    case "preview.console":
      if (result.message.level !== "error" && result.message.level !== "warn") {
        return { kind: "ignored" };
      }
      return {
        kind: "diagnostic",
        error: toPreviewError({
          source: "console",
          severity: result.message.level === "error" ? "error" : "warning",
          code: `console_${result.message.level}`,
          message: result.message.args.join(" ")
        })
      };
  }

  return { kind: "ignored" };
}
