import { parseFragment, serialize } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { stableHash } from "./ids.js";
import { ensureCanvasGraph } from "./canvas-graph.js";
import { sanitizeHtml } from "./sanitize.js";
import type { ExportJob, ExportKind, PreviewDevice, ProjectBundle, QualityIssue } from "./schemas.js";

type Attribute = {
  name: string;
  value: string;
};

type AstNode = {
  nodeName: string;
  tagName?: string;
  attrs?: Attribute[];
  childNodes?: AstNode[];
  value?: string;
};

type Parse5ParentNode = DefaultTreeAdapterMap["parentNode"];

export function createStandaloneHtml(bundle: ProjectBundle): string {
  const materialized = ensureCanvasGraph(bundle);
  const sanitized = sanitizeHtml(materialized.html.normalized);
  const fragment = parseFragment(sanitized.html) as AstNode;
  stripEditorAttributes(fragment);
  const body = serialize(fragment as unknown as Parse5ParentNode);
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(materialized.title)}</title>
</head>
<body>
${body}
</body>
</html>`;
}

export function createExportJob(input: {
  bundle: ProjectBundle;
  kind: ExportKind;
  viewport: PreviewDevice;
  createdAt?: string;
}): ExportJob {
  const cleanHtml = createStandaloneHtml(input.bundle);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const filename = `${slugify(input.bundle.title)}-${input.viewport}.${input.kind}`;
  const bytes = input.kind === "html" ? byteLength(cleanHtml) : byteLength(`${input.kind}:${input.bundle.baseRevision}:${input.viewport}`);
  const job: ExportJob = {
    id: `export_${stableHash(`${input.kind}:${input.bundle.baseRevision}:${input.viewport}:${createdAt}`)}`,
    kind: input.kind,
    status: "ready",
    sourceRevision: input.bundle.baseRevision,
    viewport: input.viewport,
    filename,
    bytes,
    createdAt
  };
  if (input.kind === "html") {
    job.cleanHtml = cleanHtml;
  }
  return job;
}

export function runKoreanQualityAudit(bundle: ProjectBundle): QualityIssue[] {
  const text = Object.values(bundle.editGraph.nodes)
    .map((node) => node.textPreview ?? "")
    .join(" ");
  const issues: QualityIssue[] = [];

  if (!/[가-힣]/.test(text)) {
    issues.push({
      id: "quality_no_hangul",
      severity: "warning",
      code: "no_hangul",
      message: "한국어 산출물인데 한글 텍스트가 충분히 보이지 않습니다."
    });
  }

  if (/lorem ipsum|placeholder|untitled/i.test(text)) {
    issues.push({
      id: "quality_placeholder_copy",
      severity: "warning",
      code: "placeholder_copy",
      message: "placeholder 성격의 문구가 남아 있습니다."
    });
  }

  const longNode = Object.values(bundle.editGraph.nodes).find((node) => (node.textPreview?.length ?? 0) > 70);
  if (longNode) {
    issues.push({
      id: "quality_long_korean_line",
      severity: "info",
      code: "long_korean_line",
      message: "긴 한국어 문장은 모바일에서 줄바꿈을 확인해야 합니다.",
      nodeId: longNode.id
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "quality_korean_ready",
      severity: "info",
      code: "korean_ready",
      message: "한국어 텍스트와 기본 품질 신호가 확인되었습니다."
    });
  }

  return issues;
}

function stripEditorAttributes(node: AstNode): void {
  if (node.attrs) {
    node.attrs = node.attrs.filter((attr) => !attr.name.startsWith("data-cdx-"));
  }
  for (const child of node.childNodes ?? []) {
    stripEditorAttributes(child);
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "design";
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
