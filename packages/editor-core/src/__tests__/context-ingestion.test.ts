import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import {
  appendGeneratedNote,
  appendParsedContextArtifact,
  appendSourceRecord,
  createGeneratedDesignContext,
  createGeneratedSourceNotes,
  createSourceRecord,
  createWebSnapshot,
  migrateContextAttachmentsToSourceRecords,
  parseCodebaseFolderManifest,
  parseDocumentSource,
  parseFigmaExportSource,
  parseSlideDeckSource,
  parseSpreadsheetSource,
  parseUrlSource,
  rejectUnsupportedSource,
  validatePublicSourceUrl
} from "../context-ingestion.js";

const TEST_TIME = "2026-04-29T00:00:00.000Z";

function createBundle() {
  return normalizeHtml({
    id: "phase-09-context",
    title: "Phase 09 Context",
    html: BASIC_LANDING_FIXTURE_HTML
  });
}

describe("context ingestion foundation", () => {
  it("creates source records and migrates legacy context attachments", () => {
    const source = createSourceRecord({
      projectId: "project",
      kind: "image",
      name: "제품 스크린샷.png",
      bytes: "image-bytes",
      createdAt: TEST_TIME
    });

    expect(source.id).toMatch(/^source_/);
    expect(source.parseStatus).toBe("parsed");

    const migrated = migrateContextAttachmentsToSourceRecords({
      ...createBundle(),
      source: {
        kind: "generated",
        contextAttachments: [{
          id: "ctx_doc",
          kind: "document",
          name: "제품 요구사항.docx",
          status: "unknown",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          note: "부분 파싱"
        }]
      }
    }, TEST_TIME);

    expect(migrated.sourceRecords).toHaveLength(1);
    expect(migrated.sourceRecords[0]?.usageStatus).toBe("unknownRights");
  });

  it("creates structured parsed summaries for document, slide, sheet, figma, codebase, and URL sources", () => {
    const doc = createSourceRecord({ projectId: "project", kind: "document", name: "제품 요구사항.docx", createdAt: TEST_TIME });
    const deck = createSourceRecord({ projectId: "project", kind: "slideDeck", name: "소개자료.pptx", createdAt: TEST_TIME });
    const sheet = createSourceRecord({ projectId: "project", kind: "spreadsheet", name: "고객목록.xlsx", createdAt: TEST_TIME });
    const figma = createSourceRecord({ projectId: "project", kind: "figma", name: "Figma export", createdAt: TEST_TIME });
    const codebase = createSourceRecord({ projectId: "project", kind: "codebase", name: "app manifest", createdAt: TEST_TIME });
    const url = createSourceRecord({ projectId: "project", kind: "url", name: "공식 페이지", sourceUrl: "https://example.com", createdAt: TEST_TIME });

    const summaries = [
      parseDocumentSource({ source: doc, text: "브랜드 핵심 문장\n사용자: 바이브코더", createdAt: TEST_TIME }),
      parseSlideDeckSource({ source: deck, slideTitles: ["문제", "해결"], notes: ["발표 노트"], createdAt: TEST_TIME }),
      parseSpreadsheetSource({ source: sheet, rows: [{ name: "민지", role: "PM" }], createdAt: TEST_TIME }),
      parseFigmaExportSource({ source: figma, frameNames: ["Landing / Desktop"], componentNames: ["CTA"], createdAt: TEST_TIME }),
      parseCodebaseFolderManifest({
        source: codebase,
        files: [{ path: "app/page.tsx", kind: "react", summary: "랜딩 화면" }],
        createdAt: TEST_TIME
      }),
      parseUrlSource({ source: url, title: "공식 페이지", text: "공식 제품 소개", createdAt: TEST_TIME })
    ];

    expect(summaries.map((summary) => summary.kind)).toEqual([
      "documentSummary",
      "slideDeckSummary",
      "spreadsheetSummary",
      "figmaSummary",
      "codebaseSummary",
      "urlSummary"
    ]);
    expect(summaries.some((summary) => summary.frameNames.includes("Landing / Desktop"))).toBe(true);
    expect(summaries.some((summary) => summary.textBlocks.some((block) => block.includes("app/page.tsx")))).toBe(true);
    expect(summaries.every((summary) => (
      summary.textBlocks.length > 0 ||
      summary.tables.length > 0 ||
      summary.frameNames.length > 0 ||
      Object.keys(summary.metadata).length > 0
    ))).toBe(true);
  });

  it("generates source-notes.md and design-context.md with uncertainty and rights", () => {
    const bundle = createBundle();
    const source = createSourceRecord({
      projectId: bundle.id,
      kind: "document",
      name: "브랜드 가이드.docx",
      rights: "unknown-rights",
      uncertainty: "로고 출처 확인 필요",
      createdAt: TEST_TIME
    });
    const withSource = appendSourceRecord(bundle, source);
    const sourceNotes = createGeneratedSourceNotes(withSource, TEST_TIME);
    const designContext = createGeneratedDesignContext(withSource, TEST_TIME);

    expect(sourceNotes.path).toBe("source-notes.md");
    expect(sourceNotes.content).toContain("# Source Notes");
    expect(sourceNotes.content).toContain("로고 출처 확인 필요");
    expect(designContext.path).toBe("design-context.md");
    expect(designContext.content).toContain("# Design Context");
    expect(designContext.content).toContain("## Usage rights");

    const withNotes = appendGeneratedNote(appendGeneratedNote(withSource, sourceNotes), designContext);
    expect(withNotes.generatedNotes.map((note) => note.path)).toContain("source-notes.md");
  });

  it("creates editable, reference-only, and blocked web snapshots", () => {
    const bundle = createBundle();
    const source = createSourceRecord({
      projectId: bundle.id,
      kind: "webCapture",
      name: "공식 웹",
      sourceUrl: "https://example.com/product",
      createdAt: TEST_TIME
    });

    const editable = createWebSnapshot({
      bundle,
      sourceId: source.id,
      url: "https://example.com/product",
      html: "<main><h1>공식 제품</h1><script>alert(1)</script></main>",
      createdAt: TEST_TIME
    });
    const referenceOnly = createWebSnapshot({
      bundle,
      sourceId: source.id,
      url: "https://example.com/product",
      createdAt: TEST_TIME
    });
    const blocked = createWebSnapshot({
      bundle,
      sourceId: source.id,
      url: "javascript:alert(1)",
      html: "<main></main>",
      createdAt: TEST_TIME
    });

    expect(editable.status).toBe("editable");
    expect(editable.normalizedHtml).toContain("data-cdx-id");
    expect(editable.normalizedHtml).not.toContain("<script");
    expect(referenceOnly.status).toBe("referenceOnly");
    expect(blocked.status).toBe("blocked");
    expect(blocked.diagnostics.join(" ")).toContain("blocked-url");
  });

  it("rejects unsafe URLs and unsupported source types with diagnostics", () => {
    expect(validatePublicSourceUrl("javascript:alert(1)").valid).toBe(false);
    expect(validatePublicSourceUrl("http://localhost:3000/private").valid).toBe(false);
    expect(validatePublicSourceUrl("http://169.254.169.254/latest/meta-data").valid).toBe(false);
    expect(validatePublicSourceUrl("http://[::1]/").valid).toBe(false);
    expect(validatePublicSourceUrl("http://[fd00::1]/").valid).toBe(false);
    expect(validatePublicSourceUrl("http://[fe80::1]/").valid).toBe(false);
    expect(validatePublicSourceUrl("http://[::ffff:127.0.0.1]/").valid).toBe(false);
    expect(validatePublicSourceUrl("http://[::ffff:10.0.0.1]/").valid).toBe(false);
    expect(validatePublicSourceUrl("http://[::ffff:169.254.169.254]/").valid).toBe(false);
    expect(validatePublicSourceUrl("https://example.com/product").valid).toBe(true);
    expect(validatePublicSourceUrl("https://fc-public.example.com/product").valid).toBe(true);
    expect(validatePublicSourceUrl("http://[::ffff:93.184.216.34]/").valid).toBe(true);

    const blocked = rejectUnsupportedSource({
      projectId: "project",
      name: "archive.exe",
      mimeType: "application/x-msdownload",
      reason: "binary executable",
      createdAt: TEST_TIME
    });

    expect(blocked.source.kind).toBe("unsupported");
    expect(blocked.source.parseStatus).toBe("blocked");
    expect(blocked.job.diagnostics.join(" ")).toContain("unsupported-source-type");
  });

  it("surfaces parse failure diagnostics and appends parsed artifacts", () => {
    const bundle = createBundle();
    const doc = createSourceRecord({ projectId: bundle.id, kind: "document", name: "빈 문서.docx", createdAt: TEST_TIME });
    const parsed = parseDocumentSource({ source: doc, text: "", createdAt: TEST_TIME });
    const next = appendParsedContextArtifact(appendSourceRecord(bundle, doc), parsed);

    expect(parsed.diagnostics).toContain("parse-failed-empty-document");
    expect(next.parsedContextArtifacts).toHaveLength(1);
  });
});
