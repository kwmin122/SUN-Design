import { z } from "zod";

export const PreviewDiagnosticSeveritySchema = z.enum(["info", "warning", "error"]);
export type PreviewDiagnosticSeverity = z.infer<typeof PreviewDiagnosticSeveritySchema>;

export const PreviewDiagnosticSourceSchema = z.enum([
  "readiness",
  "sanitizer",
  "bridge",
  "runtime",
  "console"
]);
export type PreviewDiagnosticSource = z.infer<typeof PreviewDiagnosticSourceSchema>;

export const PreviewErrorSchema = z.object({
  id: z.string().min(1),
  source: PreviewDiagnosticSourceSchema,
  severity: PreviewDiagnosticSeveritySchema,
  code: z.string().min(1),
  message: z.string().min(1),
  detail: z.unknown().optional(),
  nodeId: z.string().optional(),
  createdAt: z.string().min(1)
});
export type PreviewError = z.infer<typeof PreviewErrorSchema>;

const PreviewMessageBaseSchema = z.object({
  nonce: z.string().min(1)
});

export const PreviewReadyMessageSchema = PreviewMessageBaseSchema.extend({
  type: z.literal("preview.ready"),
  documentId: z.string().min(1),
  nodeCount: z.number().int().nonnegative()
});

export const PreviewRuntimeErrorMessageSchema = PreviewMessageBaseSchema.extend({
  type: z.literal("preview.runtime-error"),
  message: z.string().min(1),
  stack: z.string().optional(),
  nodeId: z.string().optional()
});

export const PreviewConsoleMessageSchema = PreviewMessageBaseSchema.extend({
  type: z.literal("preview.console"),
  level: z.enum(["log", "info", "warn", "error"]),
  args: z.array(z.string())
});

export const PreviewNodeRectSchema = z.object({
  nodeId: z.string().min(1),
  kind: z.string().min(1),
  tagName: z.string().min(1),
  textPreview: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative()
});
export type PreviewNodeRect = z.infer<typeof PreviewNodeRectSchema>;

export const PreviewNodesMessageSchema = PreviewMessageBaseSchema.extend({
  type: z.literal("preview.nodes"),
  documentId: z.string().min(1),
  nodes: z.array(PreviewNodeRectSchema)
});

export const PreviewSelectMessageSchema = PreviewMessageBaseSchema.extend({
  type: z.literal("preview.select"),
  node: PreviewNodeRectSchema
});

export const PreviewHoverMessageSchema = PreviewMessageBaseSchema.extend({
  type: z.literal("preview.hover"),
  node: PreviewNodeRectSchema
});

export const PreviewMessageSchema = z.discriminatedUnion("type", [
  PreviewReadyMessageSchema,
  PreviewRuntimeErrorMessageSchema,
  PreviewConsoleMessageSchema,
  PreviewNodesMessageSchema,
  PreviewSelectMessageSchema,
  PreviewHoverMessageSchema
]);
export type PreviewMessage = z.infer<typeof PreviewMessageSchema>;

export const BridgeValidationFailureSchema = z.object({
  code: z.enum(["invalid_source", "missing_nonce", "invalid_nonce", "unknown_type", "schema_invalid"]),
  message: z.string().min(1),
  type: z.string().optional()
});
export type BridgeValidationFailure = z.infer<typeof BridgeValidationFailureSchema>;
