import { stableHash } from "./ids.js";
import { normalizeHtml } from "./normalize.js";
import {
  GeneratedNoteSchema,
  IngestionJobSchema,
  ParsedContextArtifactSchema,
  ProjectBundleSchema,
  SourceRecordSchema,
  WebSnapshotSchema,
  type GeneratedNote,
  type IngestionJob,
  type ParsedContextArtifact,
  type ParsedContextKind,
  type ProjectBundle,
  type ContextAttachment,
  type SourceKind,
  type SourceParseStatus,
  type SourceUsageStatus,
  type SourceRecord,
  type WebSnapshot
} from "./schemas.js";

type StringRecord = Record<string, string>;

const DEFAULT_CREATED_AT = "2026-04-29T00:00:00.000Z";

export function createSourceRecord(input: {
  projectId: string;
  kind: SourceKind;
  name: string;
  bytes?: string;
  sourceUrl?: string;
  localPath?: string;
  mimeType?: string;
  rights?: string;
  uncertainty?: string;
  createdAt?: string;
}): SourceRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const hashInput = input.bytes ?? input.sourceUrl ?? input.localPath ?? input.name;
  const diagnostics = input.uncertainty ? [`uncertain:${input.uncertainty}`] : [];
  return SourceRecordSchema.parse({
    id: `source_${stableHash(`${input.projectId}:${input.kind}:${input.name}:${hashInput}`)}`,
    kind: input.kind,
    name: input.name,
    hash: `hash_${stableHash(hashInput)}`,
    createdAt,
    importedAt: createdAt,
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    ...(input.localPath ? { localPath: input.localPath } : {}),
    ...(input.mimeType ? { mimeType: input.mimeType } : {}),
    assetIds: [],
    parseStatus: defaultParseStatus(input.kind),
    usageStatus: usageStatusFor(input.rights, input.uncertainty),
    ...(input.rights ? { rights: input.rights } : {}),
    ...(input.uncertainty ? { uncertainty: input.uncertainty } : {}),
    diagnostics
  });
}

export function createIngestionJob(input: {
  sourceId: string;
  status?: SourceParseStatus;
  diagnostics?: string[];
  createdAt?: string;
}): IngestionJob {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return IngestionJobSchema.parse({
    id: `ingest_${stableHash(`${input.sourceId}:${input.status ?? "queued"}:${createdAt}`)}`,
    sourceId: input.sourceId,
    status: input.status ?? "queued",
    createdAt,
    updatedAt: createdAt,
    diagnostics: input.diagnostics ?? []
  });
}

export function migrateContextAttachmentsToSourceRecords(
  bundle: ProjectBundle,
  createdAt = DEFAULT_CREATED_AT
): ProjectBundle {
  const existingIds = new Set(bundle.sourceRecords.map((source) => source.id));
  const migrated = (bundle.source.contextAttachments ?? [])
    .map((attachment) => {
      const source = createSourceRecord({
      projectId: bundle.id,
      kind: sourceKindForAttachment(attachment.kind),
      name: attachment.name,
      ...(attachment.sourceUrl ? { sourceUrl: attachment.sourceUrl } : {}),
      ...(attachment.mimeType ? { mimeType: attachment.mimeType } : {}),
      rights: attachment.status === "unknown" ? "unknown-rights" : "user-provided-context",
      ...(attachment.note ? { uncertainty: attachment.note } : {}),
      createdAt
      });
      return SourceRecordSchema.parse({
        ...source,
        id: `source_${stableHash(attachment.id)}`,
        parseStatus: attachment.status === "blocked" ? "blocked" : source.parseStatus,
        usageStatus: attachment.status === "blocked"
          ? "blocked"
          : attachment.status === "unknown" ? "unknownRights" : source.usageStatus
      });
    })
    .filter((source) => !existingIds.has(source.id));

  return ProjectBundleSchema.parse({
    ...bundle,
    sourceRecords: [...bundle.sourceRecords, ...migrated]
  });
}

export function createParsedContextArtifact(input: {
  sourceId: string;
  kind: ParsedContextKind;
  title: string;
  summary: string;
  textBlocks?: string[];
  tables?: StringRecord[];
  frameNames?: string[];
  assetIds?: string[];
  metadata?: StringRecord;
  diagnostics?: string[];
  createdAt?: string;
}): ParsedContextArtifact {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return ParsedContextArtifactSchema.parse({
    id: `parsed_${stableHash(`${input.sourceId}:${input.kind}:${input.title}:${input.summary}`)}`,
    sourceId: input.sourceId,
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    textBlocks: input.textBlocks ?? [],
    tables: input.tables ?? [],
    frameNames: input.frameNames ?? [],
    assetIds: input.assetIds ?? [],
    metadata: input.metadata ?? {},
    diagnostics: input.diagnostics ?? [],
    createdAt
  });
}

export function parseDocumentSource(input: {
  source: SourceRecord;
  text: string;
  createdAt?: string;
}): ParsedContextArtifact {
  const textBlocks = splitTextBlocks(input.text);
  const diagnostics = diagnosticsForSourceKind(input.source, "document");
  if (textBlocks.length === 0) {
    diagnostics.push("parse-failed-empty-document");
  }
  return createParsedContextArtifact({
    sourceId: input.source.id,
    kind: "documentSummary",
    title: input.source.name,
    summary: summarizeText(textBlocks, "No document text extracted."),
    textBlocks,
    metadata: { expectedKind: "document", sourceName: input.source.name },
    diagnostics,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
}

export function parseSlideDeckSource(input: {
  source: SourceRecord;
  slideTitles: string[];
  notes?: string[];
  createdAt?: string;
}): ParsedContextArtifact {
  const titles = input.slideTitles.map((title) => title.trim()).filter(Boolean);
  const notes = input.notes?.map((note) => note.trim()).filter(Boolean) ?? [];
  const diagnostics = diagnosticsForSourceKind(input.source, "slideDeck");
  if (titles.length === 0) {
    diagnostics.push("parse-failed-empty-slide-deck");
  }
  return createParsedContextArtifact({
    sourceId: input.source.id,
    kind: "slideDeckSummary",
    title: input.source.name,
    summary: titles.length > 0 ? `Slides: ${titles.join(", ")}` : "No slide titles extracted.",
    textBlocks: [...titles, ...notes],
    metadata: { slideCount: String(titles.length), expectedKind: "slideDeck" },
    diagnostics,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
}

export function parseSpreadsheetSource(input: {
  source: SourceRecord;
  rows: StringRecord[];
  createdAt?: string;
}): ParsedContextArtifact {
  const diagnostics = diagnosticsForSourceKind(input.source, "spreadsheet");
  if (input.rows.length === 0) {
    diagnostics.push("parse-failed-empty-spreadsheet");
  }
  const fields = Array.from(new Set(input.rows.flatMap((row) => Object.keys(row))));
  return createParsedContextArtifact({
    sourceId: input.source.id,
    kind: "spreadsheetSummary",
    title: input.source.name,
    summary: input.rows.length > 0
      ? `${input.rows.length} rows with fields: ${fields.join(", ")}`
      : "No spreadsheet rows extracted.",
    tables: input.rows,
    metadata: { fields: fields.join(","), expectedKind: "spreadsheet" },
    diagnostics,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
}

export function parseFigmaExportSource(input: {
  source: SourceRecord;
  frameNames: string[];
  componentNames?: string[];
  assetIds?: string[];
  createdAt?: string;
}): ParsedContextArtifact {
  const frameNames = input.frameNames.map((name) => name.trim()).filter(Boolean);
  const componentNames = input.componentNames?.map((name) => name.trim()).filter(Boolean) ?? [];
  const diagnostics = diagnosticsForSourceKind(input.source, "figma");
  if (frameNames.length === 0) {
    diagnostics.push("parse-partial-no-figma-frames");
  }
  return createParsedContextArtifact({
    sourceId: input.source.id,
    kind: "figmaSummary",
    title: input.source.name,
    summary: frameNames.length > 0 ? `Figma frames: ${frameNames.join(", ")}` : "No Figma frame metadata extracted.",
    frameNames,
    assetIds: input.assetIds ?? [],
    metadata: { components: componentNames.join(","), expectedKind: "figma" },
    diagnostics,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
}

export function parseCodebaseFolderManifest(input: {
  source: SourceRecord;
  files: Array<{ path: string; kind: string; summary: string }>;
  createdAt?: string;
}): ParsedContextArtifact {
  const diagnostics = diagnosticsForSourceKind(input.source, "codebase");
  if (input.files.length === 0) {
    diagnostics.push("parse-failed-empty-codebase-manifest");
  }
  const textBlocks = input.files.map((file) => `${file.path} (${file.kind}): ${file.summary}`);
  return createParsedContextArtifact({
    sourceId: input.source.id,
    kind: "codebaseSummary",
    title: input.source.name,
    summary: input.files.length > 0 ? `${input.files.length} files summarized.` : "No codebase files extracted.",
    textBlocks,
    metadata: { fileCount: String(input.files.length), expectedKind: "codebase" },
    diagnostics,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
}

export function parseUrlSource(input: {
  source: SourceRecord;
  title: string;
  text: string;
  createdAt?: string;
}): ParsedContextArtifact {
  const textBlocks = splitTextBlocks(input.text);
  const diagnostics = diagnosticsForSourceKind(input.source, "url");
  if (textBlocks.length === 0) {
    diagnostics.push("parse-partial-empty-url-text");
  }
  return createParsedContextArtifact({
    sourceId: input.source.id,
    kind: "urlSummary",
    title: input.title,
    summary: summarizeText(textBlocks, "No URL text extracted."),
    textBlocks,
    metadata: { sourceUrl: input.source.sourceUrl ?? "", expectedKind: "url" },
    diagnostics,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
}

export function validatePublicSourceUrl(url: string): {
  valid: boolean;
  normalizedUrl?: string;
  reason?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "invalid-url" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, reason: "unsafe-url-scheme" };
  }
  if (isPrivateHostname(parsed.hostname)) {
    return { valid: false, reason: "private-or-local-url" };
  }
  return { valid: true, normalizedUrl: parsed.toString() };
}

export function rejectUnsupportedSource(input: {
  projectId: string;
  name: string;
  mimeType?: string;
  reason: string;
  createdAt?: string;
}): { source: SourceRecord; job: IngestionJob } {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const source = SourceRecordSchema.parse({
    id: `source_${stableHash(`${input.projectId}:unsupported:${input.name}:${input.reason}`)}`,
    kind: "unsupported",
    name: input.name,
    hash: `hash_${stableHash(`${input.name}:${input.mimeType ?? ""}:${input.reason}`)}`,
    createdAt,
    importedAt: createdAt,
    ...(input.mimeType ? { mimeType: input.mimeType } : {}),
    assetIds: [],
    parseStatus: "blocked",
    usageStatus: "blocked",
    uncertainty: input.reason,
    diagnostics: [`unsupported-source-type:${input.reason}`]
  });
  const job = createIngestionJob({
    sourceId: source.id,
    status: "blocked",
    diagnostics: [`unsupported-source-type:${input.reason}`],
    createdAt
  });
  return { source, job };
}

export function createGeneratedSourceNotes(bundle: ProjectBundle, createdAt = new Date().toISOString()): GeneratedNote {
  const sourceLines = bundle.sourceRecords.map((source) => (
    `- ${source.name} (${source.kind}) — parse:${source.parseStatus}, usage:${source.usageStatus}, rights:${source.rights ?? "unspecified"}`
  ));
  const uncertain = bundle.sourceRecords.filter((source) => source.uncertainty || source.usageStatus === "unknownRights");
  const content = [
    "# Source Notes",
    "",
    `Collected: ${createdAt}`,
    "",
    "## Sources",
    ...(sourceLines.length > 0 ? sourceLines : ["- No sources recorded."]),
    "",
    "## Uncertain facts",
    ...(uncertain.length > 0
      ? uncertain.map((source) => `- ${source.name}: ${source.uncertainty ?? "unknown rights"}`)
      : ["- None recorded."]),
    "",
    "## Diagnostics",
    ...bundle.sourceRecords.flatMap((source) => source.diagnostics.map((diagnostic) => `- ${source.name}: ${diagnostic}`))
  ].join("\n");

  return GeneratedNoteSchema.parse({
    id: `note_${stableHash(`source-notes:${bundle.id}:${bundle.baseRevision}`)}`,
    kind: "source-notes",
    path: "source-notes.md",
    sourceIds: bundle.sourceRecords.map((source) => source.id),
    content,
    createdAt,
    updatedAt: createdAt
  });
}

export function createGeneratedDesignContext(bundle: ProjectBundle, createdAt = new Date().toISOString()): GeneratedNote {
  const assetLines = bundle.assets.map((asset) => (
    `- ${asset.id}: ${asset.localPath ?? asset.sourceUrl ?? "no path"} (${asset.status})`
  ));
  const content = [
    "# Design Context",
    "",
    `Project: ${bundle.title}`,
    `Collected: ${createdAt}`,
    "",
    "## Official sources",
    ...sourceList(bundle),
    "",
    "## Asset paths",
    ...(assetLines.length > 0 ? assetLines : ["- No assets recorded."]),
    "",
    "## Uncertain facts",
    ...uncertaintyList(bundle),
    "",
    "## Usage rights",
    ...rightsList(bundle)
  ].join("\n");

  return GeneratedNoteSchema.parse({
    id: `note_${stableHash(`design-context:${bundle.id}:${bundle.baseRevision}`)}`,
    kind: "design-context",
    path: "design-context.md",
    sourceIds: bundle.sourceRecords.map((source) => source.id),
    content,
    createdAt,
    updatedAt: createdAt
  });
}

export function createWebSnapshot(input: {
  bundle: ProjectBundle;
  sourceId: string;
  url: string;
  html?: string;
  screenshotAssetId?: string;
  createdAt?: string;
}): WebSnapshot {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const validation = validatePublicSourceUrl(input.url);
  if (!validation.valid) {
    return WebSnapshotSchema.parse({
      id: `web_snapshot_${stableHash(`${input.sourceId}:${input.url}:${createdAt}`)}`,
      sourceId: input.sourceId,
      url: input.url,
      status: "blocked",
      canvasObjectIds: [],
      diagnostics: [`blocked-url:${validation.reason ?? "unknown"}`],
      createdAt
    });
  }

  if (!input.html) {
    return WebSnapshotSchema.parse({
      id: `web_snapshot_${stableHash(`${input.sourceId}:${validation.normalizedUrl}:reference:${createdAt}`)}`,
      sourceId: input.sourceId,
      url: validation.normalizedUrl,
      status: "referenceOnly",
      ...(input.screenshotAssetId ? { screenshotAssetId: input.screenshotAssetId } : {}),
      canvasObjectIds: [],
      diagnostics: ["reference-only-no-safe-html"],
      createdAt
    });
  }

  const normalized = normalizeHtml({
    id: `snapshot_${stableHash(`${input.sourceId}:${validation.normalizedUrl}`)}`,
    title: "Web Snapshot",
    html: input.html
  });
  return WebSnapshotSchema.parse({
    id: `web_snapshot_${stableHash(`${input.sourceId}:${validation.normalizedUrl}:editable:${createdAt}`)}`,
    sourceId: input.sourceId,
    url: validation.normalizedUrl,
    status: "editable",
    sanitizedHtml: normalized.html.sanitized,
    normalizedHtml: normalized.html.normalized,
    ...(input.screenshotAssetId ? { screenshotAssetId: input.screenshotAssetId } : {}),
    canvasObjectIds: [],
    diagnostics: normalized.sanitizerReport.changes.map((change) => `${change.kind}:${change.target}`),
    createdAt
  });
}

export function appendSourceRecord(bundle: ProjectBundle, source: SourceRecord): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    sourceRecords: [...bundle.sourceRecords.filter((item) => item.id !== source.id), source]
  });
}

export function appendParsedContextArtifact(
  bundle: ProjectBundle,
  artifact: ParsedContextArtifact
): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    parsedContextArtifacts: [
      ...bundle.parsedContextArtifacts.filter((item) => item.id !== artifact.id),
      artifact
    ]
  });
}

export function appendGeneratedNote(bundle: ProjectBundle, note: GeneratedNote): ProjectBundle {
  return ProjectBundleSchema.parse({
    ...bundle,
    generatedNotes: [...bundle.generatedNotes.filter((item) => item.path !== note.path), note]
  });
}

function defaultParseStatus(kind: SourceKind): SourceParseStatus {
  if (kind === "unsupported") {
    return "blocked";
  }
  if (["image", "screenshot", "csv", "json", "apiFixture"].includes(kind)) {
    return "parsed";
  }
  return "queued";
}

function usageStatusFor(rights: string | undefined, uncertainty: string | undefined): SourceUsageStatus {
  if (rights?.toLowerCase().includes("blocked")) {
    return "blocked";
  }
  if (rights?.toLowerCase().includes("unknown") || uncertainty) {
    return "unknownRights";
  }
  return "candidate";
}

function sourceKindForAttachment(kind: ContextAttachment["kind"]): SourceKind {
  switch (kind) {
    case "designFile":
      return "figma";
    case "webCapture":
      return "webCapture";
    default:
      return kind;
  }
}

function splitTextBlocks(text: string): string[] {
  return text
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function summarizeText(textBlocks: string[], fallback: string): string {
  return textBlocks[0]?.slice(0, 180) ?? fallback;
}

function diagnosticsForSourceKind(source: SourceRecord, expected: SourceKind): string[] {
  return source.kind === expected ? [] : [`unexpected-source-kind:${source.kind}:expected-${expected}`];
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (["localhost", "0.0.0.0", "::1"].includes(normalized) || normalized.endsWith(".localhost")) {
    return true;
  }
  if (
    /^127\./.test(normalized) ||
    /^10\./.test(normalized) ||
    /^169\.254\./.test(normalized) ||
    /^192\.168\./.test(normalized)
  ) {
    return true;
  }
  const private172 = normalized.match(/^172\.(\d+)\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) {
    return true;
  }
  if (normalized.includes(":")) {
    return (
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized === "fe80::1"
    );
  }
  return false;
}

function sourceList(bundle: ProjectBundle): string[] {
  const lines = bundle.sourceRecords
    .filter((source) => source.sourceUrl || source.localPath)
    .map((source) => `- ${source.name}: ${source.sourceUrl ?? source.localPath}`);
  return lines.length > 0 ? lines : ["- No official source links recorded."];
}

function uncertaintyList(bundle: ProjectBundle): string[] {
  const lines = bundle.sourceRecords
    .filter((source) => source.uncertainty || source.diagnostics.length > 0)
    .map((source) => `- ${source.name}: ${source.uncertainty ?? source.diagnostics.join(", ")}`);
  return lines.length > 0 ? lines : ["- None recorded."];
}

function rightsList(bundle: ProjectBundle): string[] {
  const lines = bundle.sourceRecords.map((source) => `- ${source.name}: ${source.rights ?? source.usageStatus}`);
  return lines.length > 0 ? lines : ["- No source rights recorded."];
}
