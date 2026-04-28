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

export const CreationModeSchema = z.enum(["prototype", "slideDeck", "template", "other"]);
export type CreationMode = z.infer<typeof CreationModeSchema>;

export const FidelityTargetSchema = z.enum(["wireframe", "highFidelity"]);
export type FidelityTarget = z.infer<typeof FidelityTargetSchema>;

export const KoreanPresetSchema = z.enum(["saasLanding", "pitchDeck", "mobileApp"]);
export type KoreanPreset = z.infer<typeof KoreanPresetSchema>;

export const PreviewDeviceSchema = z.enum(["desktop", "tablet", "mobile"]);
export type PreviewDevice = z.infer<typeof PreviewDeviceSchema>;

export const ExportKindSchema = z.enum(["html", "png", "pdf", "zip", "pptx"]);
export type ExportKind = z.infer<typeof ExportKindSchema>;

export const ShareAccessSchema = z.enum(["view", "comment", "edit"]);
export type ShareAccess = z.infer<typeof ShareAccessSchema>;

export const AgentRuntimeSchema = z.enum(["codex", "claudeCode", "cursor", "localAgent", "webAgent"]);
export type AgentRuntime = z.infer<typeof AgentRuntimeSchema>;

export const ContextAttachmentSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["image", "document", "slideDeck", "spreadsheet", "codebase", "webCapture", "designFile"]),
  name: z.string().min(1),
  status: z.enum(["verified", "cached", "placeholder", "blocked", "unknown"]),
  sourceUrl: z.string().optional(),
  mimeType: z.string().optional(),
  note: z.string().optional()
});
export type ContextAttachment = z.infer<typeof ContextAttachmentSchema>;

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

export const CanvasObjectKindSchema = z.enum([
  "page",
  "artboard",
  "frame",
  "section",
  "componentInstance",
  "slot",
  "text",
  "image",
  "button",
  "vectorLike",
  "unknown"
]);
export type CanvasObjectKind = z.infer<typeof CanvasObjectKindSchema>;

export const CanvasLayoutModeSchema = z.enum(["none", "block", "flex", "grid"]);
export type CanvasLayoutMode = z.infer<typeof CanvasLayoutModeSchema>;

export const CanvasResizeModeSchema = z.enum(["fixed", "hug", "fill"]);
export type CanvasResizeMode = z.infer<typeof CanvasResizeModeSchema>;

export const CanvasPinnedEdgesSchema = z.object({
  top: z.boolean().default(false),
  right: z.boolean().default(false),
  bottom: z.boolean().default(false),
  left: z.boolean().default(false)
});
export type CanvasPinnedEdges = z.infer<typeof CanvasPinnedEdgesSchema>;

export const CanvasLayoutSchema = z.object({
  mode: CanvasLayoutModeSchema.optional(),
  display: z.enum(["block", "flex", "grid"]).optional(),
  flexDirection: z.enum(["row", "row-reverse", "column", "column-reverse"]).optional(),
  gap: z.string().optional(),
  padding: z.string().optional(),
  alignItems: z.string().optional(),
  justifyContent: z.string().optional(),
  gridTemplateColumns: z.string().optional(),
  breakpoint: z.string().optional()
});
export type CanvasLayout = z.infer<typeof CanvasLayoutSchema>;

export const CanvasConstraintsSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
  resizeMode: CanvasResizeModeSchema.optional(),
  pinned: CanvasPinnedEdgesSchema.optional(),
  layout: CanvasLayoutSchema.optional()
});
export type CanvasConstraints = z.infer<typeof CanvasConstraintsSchema>;

export const CanvasObjectSchema = z.object({
  id: z.string().min(1),
  kind: CanvasObjectKindSchema,
  name: z.string().min(1),
  nodeId: z.string().min(1).optional(),
  parentId: z.string().min(1).optional(),
  childIds: z.array(z.string().min(1)).default([]),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  constraints: CanvasConstraintsSchema.optional(),
  componentInstanceId: z.string().min(1).optional()
});
export type CanvasObject = z.infer<typeof CanvasObjectSchema>;

export const CanvasComponentPropSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["text", "color", "number", "boolean", "slot"]),
  defaultValue: z.unknown().optional()
});
export type CanvasComponentProp = z.infer<typeof CanvasComponentPropSchema>;

export const CanvasComponentVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({})
});
export type CanvasComponentVariant = z.infer<typeof CanvasComponentVariantSchema>;

export const CanvasComponentDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceObjectId: z.string().min(1),
  slotObjectIds: z.array(z.string().min(1)),
  props: z.array(CanvasComponentPropSchema),
  variants: z.array(CanvasComponentVariantSchema),
  createdAt: z.string().min(1)
});
export type CanvasComponentDefinition = z.infer<typeof CanvasComponentDefinitionSchema>;

export const CanvasComponentInstanceSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  objectId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  state: z.enum(["default", "hover", "pressed", "disabled"]).default("default"),
  overrides: z.record(z.string(), z.unknown()).default({}),
  detached: z.boolean().default(false)
});
export type CanvasComponentInstance = z.infer<typeof CanvasComponentInstanceSchema>;

export const CanvasGuideSchema = z.object({
  id: z.string().min(1),
  axis: z.enum(["x", "y"]),
  position: z.number(),
  label: z.string().optional()
});
export type CanvasGuide = z.infer<typeof CanvasGuideSchema>;

export const CanvasGraphSchema = z.object({
  version: z.literal(1),
  rootObjectIds: z.array(z.string().min(1)),
  objects: z.record(z.string(), CanvasObjectSchema),
  components: z.record(z.string(), CanvasComponentDefinitionSchema).default({}),
  instances: z.record(z.string(), CanvasComponentInstanceSchema).default({}),
  guides: z.array(CanvasGuideSchema).default([]),
  updatedAt: z.string().min(1)
});
export type CanvasGraph = z.infer<typeof CanvasGraphSchema>;

export const CanvasOperationSchema = z.object({
  id: z.string().min(1),
  op: z.enum([
    "setObjectName",
    "setObjectVisibility",
    "setObjectLock",
    "reorderObject",
    "groupObjects",
    "ungroupObjects",
    "setLayoutConstraints",
    "createComponent",
    "createComponentInstance",
    "updateComponentOverride",
    "detachComponentInstance"
  ]),
  objectId: z.string().min(1),
  value: z.unknown(),
  source: z.enum(["canvas", "tweaks", "agent", "system"]),
  baseRevision: z.string().min(1),
  createdAt: z.string().min(1)
});
export type CanvasOperation = z.infer<typeof CanvasOperationSchema>;

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

export const ExportJobSchema = z.object({
  id: z.string().min(1),
  kind: ExportKindSchema,
  status: z.enum(["ready", "failed"]),
  sourceRevision: z.string().min(1),
  viewport: PreviewDeviceSchema,
  filename: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  cleanHtml: z.string().optional()
});
export type ExportJob = z.infer<typeof ExportJobSchema>;

export const QualityIssueSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(["info", "warning", "error"]),
  code: z.string().min(1),
  message: z.string().min(1),
  nodeId: z.string().optional()
});
export type QualityIssue = z.infer<typeof QualityIssueSchema>;

export const DesignSystemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colors: z.record(z.string(), z.string()),
  typography: z.object({
    heading: z.string().min(1),
    body: z.string().min(1)
  }),
  radius: z.string().min(1),
  spacing: z.string().min(1),
  source: z.enum(["manual", "learned", "connected"]),
  createdAt: z.string().min(1)
});
export type DesignSystem = z.infer<typeof DesignSystemSchema>;

export const ShareLinkSchema = z.object({
  id: z.string().min(1),
  access: ShareAccessSchema,
  url: z.string().regex(/^kdesign:\/\/share\/[A-Za-z0-9._~-]+\/share_[a-z0-9]+$/),
  createdAt: z.string().min(1)
});
export type ShareLink = z.infer<typeof ShareLinkSchema>;

export const HandoffPackageSchema = z.object({
  id: z.string().min(1),
  target: z.union([AgentRuntimeSchema, z.literal("canva")]),
  artifactId: z.string().min(1),
  sourceRevision: z.string().min(1),
  includes: z.array(z.string().min(1)),
  instructionsPath: z.string().refine((path) => (
    path.startsWith("docs/prompts/") &&
    path.endsWith(".md") &&
    !path.includes("..") &&
    !path.includes("://") &&
    !path.startsWith("/")
  ), "instructionsPath must be a safe repo-relative prompt markdown path"),
  createdAt: z.string().min(1)
});
export type HandoffPackage = z.infer<typeof HandoffPackageSchema>;

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
    kind: z.enum(["fixture", "imported", "generated"]),
    filename: z.string().optional(),
    prompt: z.string().optional(),
    mode: CreationModeSchema.optional(),
    fidelity: FidelityTargetSchema.optional(),
    preset: KoreanPresetSchema.optional(),
    contextAttachments: z.array(ContextAttachmentSchema).optional()
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
  tweakValues: z.record(z.string(), z.unknown()).default({}),
  exportJobs: z.array(ExportJobSchema).default([]),
  qualityIssues: z.array(QualityIssueSchema).default([]),
  designSystem: DesignSystemSchema.optional(),
  shareLinks: z.array(ShareLinkSchema).default([]),
  handoffPackages: z.array(HandoffPackageSchema).default([]),
  canvasGraph: CanvasGraphSchema.optional(),
  canvasOperations: z.array(CanvasOperationSchema).default([])
});
export type ProjectBundle = z.infer<typeof ProjectBundleSchema>;

export const CreateProjectBundleInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  html: z.string(),
  filename: z.string().optional()
});
export type CreateProjectBundleInput = z.infer<typeof CreateProjectBundleInputSchema>;
