import { z } from "zod";

export const AssetRefSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["image", "font", "stylesheet", "script", "other"]),
  sourceUrl: z.string().optional(),
  localPath: z.string().optional(),
  status: z.enum(["verified", "cached", "placeholder", "blocked", "unknown"]),
  mimeType: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  license: z.string().optional()
});
export type AssetRef = z.infer<typeof AssetRefSchema>;

export const EditNodeKindSchema = z.enum([
  "frame",
  "block",
  "text",
  "image",
  "button",
  "control",
  "decorative",
  "unknown"
]);
export type EditNodeKind = z.infer<typeof EditNodeKindSchema>;

export const EditNodeSchema = z.object({
  id: z.string().min(1),
  kind: EditNodeKindSchema,
  tagName: z.string().min(1),
  parentId: z.string().optional(),
  domPath: z.string().min(1),
  fingerprint: z.string().min(1),
  editableProps: z.array(z.string()),
  textPreview: z.string().optional(),
  assetId: z.string().optional()
});
export type EditNode = z.infer<typeof EditNodeSchema>;

export const EditGraphSchema = z.object({
  version: z.literal(1),
  rootNodeIds: z.array(z.string()),
  nodes: z.record(z.string(), EditNodeSchema)
});
export type EditGraph = z.infer<typeof EditGraphSchema>;

export const EditPatchSchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  op: z.enum([
    "setText",
    "setStyle",
    "replaceAsset",
    "setAttr",
    "move",
    "resize",
    "align",
    "reorder",
    "setVisibility"
  ]),
  value: z.unknown(),
  source: z.enum(["system", "canvas", "tweaks", "agent"]),
  baseRevision: z.string().min(1),
  createdAt: z.string().min(1)
});
export type EditPatch = z.infer<typeof EditPatchSchema>;

export const CanvasCommentSchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  body: z.string().min(1),
  author: z.string().min(1),
  rect: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().nonnegative(),
    height: z.number().nonnegative()
  }).optional(),
  createdAt: z.string().min(1)
});
export type CanvasComment = z.infer<typeof CanvasCommentSchema>;

export const BundleVersionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  html: z.string(),
  patchCount: z.number().int().nonnegative(),
  createdAt: z.string().min(1)
});
export type BundleVersion = z.infer<typeof BundleVersionSchema>;

export const SanitizerChangeSchema = z.object({
  kind: z.enum(["removed-element", "removed-attribute", "blocked-url", "rewritten-style"]),
  path: z.string().min(1),
  target: z.string().min(1),
  reason: z.string().optional()
});
export type SanitizerChange = z.infer<typeof SanitizerChangeSchema>;

export const SanitizerReportSchema = z.object({
  removedElementCount: z.number().int().nonnegative(),
  removedAttributeCount: z.number().int().nonnegative(),
  blockedUrlCount: z.number().int().nonnegative(),
  changes: z.array(SanitizerChangeSchema)
});
export type SanitizerReport = z.infer<typeof SanitizerReportSchema>;

export const ProjectBundleSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  baseRevision: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  source: z.object({
    kind: z.enum(["fixture", "imported"]),
    filename: z.string().optional()
  }),
  html: z.object({
    raw: z.string(),
    sanitized: z.string(),
    normalized: z.string()
  }),
  assets: z.array(AssetRefSchema),
  editGraph: EditGraphSchema,
  patches: z.array(EditPatchSchema),
  sanitizerReport: SanitizerReportSchema,
  comments: z.array(CanvasCommentSchema).default([]),
  versions: z.array(BundleVersionSchema).default([]),
  tweakValues: z.record(z.string(), z.unknown()).default({})
});
export type ProjectBundle = z.infer<typeof ProjectBundleSchema>;

export const CreateProjectBundleInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  html: z.string(),
  filename: z.string().optional()
});
export type CreateProjectBundleInput = z.infer<typeof CreateProjectBundleInputSchema>;
