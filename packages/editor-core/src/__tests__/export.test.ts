import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { createGeneratedProjectBundle } from "../generation.js";
import { normalizeHtml } from "../normalize.js";
import { createExportJob, createStandaloneHtml, runKoreanQualityAudit } from "../export.js";

describe("stored-state export helpers", () => {
  it("creates clean standalone HTML without editor metadata", () => {
    const bundle = normalizeHtml({
      id: "export-fixture",
      title: "Export Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
    });

    const html = createStandaloneHtml(bundle);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<html lang=\"ko\">");
    expect(html).not.toContain("data-cdx-id");
    expect(html).not.toContain("preview.ready");
  });

  it("strips unsafe active content and local resource URLs from standalone HTML", () => {
    const bundle = normalizeHtml({
      id: "export-unsafe-url-fixture",
      title: "Export Unsafe URL Fixture",
      html: `
        <main>
          <img src="file:///Users/a0000/private.png" alt="local">
          <img src="http://127.0.0.1/private.png" alt="loopback">
          <a href="http://[::ffff:169.254.169.254]/metadata">metadata</a>
          <script>alert("blocked")</script>
        </main>
      `
    });

    const html = createStandaloneHtml(bundle);

    expect(html).not.toContain("file://");
    expect(html).not.toContain("127.0.0.1");
    expect(html).not.toContain("169.254.169.254");
    expect(html).not.toContain("<script");
  });

  it("creates deterministic export job records from bundle state", () => {
    const bundle = normalizeHtml({
      id: "export-fixture",
      title: "Export Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
    });

    const job = createExportJob({
      bundle,
      kind: "html",
      viewport: "mobile",
      createdAt: "2026-04-27T00:00:00.000Z"
    });

    expect(job.status).toBe("ready");
    expect(job.sourceRevision).toBe(bundle.baseRevision);
    expect(job.viewport).toBe("mobile");
    expect(job.cleanHtml).toContain("AI 디자인을 바로 편집 가능한 결과물로");
  });

  it("surfaces Korean quality issues from generated bundles", () => {
    const bundle = createGeneratedProjectBundle({
      id: "generated-quality",
      prompt: "한국어 제품 출시 페이지",
      mode: "prototype",
      fidelity: "highFidelity",
      preset: "saasLanding",
      contextAttachments: []
    });

    const issues = runKoreanQualityAudit(bundle);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.code === "korean_ready" || issue.code === "long_korean_line")).toBe(true);
  });
});
