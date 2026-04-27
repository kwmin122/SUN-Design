import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";

describe("normalizeHtml", () => {
  it("sanitizes dangerous fixture content and records stable edit nodes", () => {
    const bundle = normalizeHtml({
      id: "phase-01-fixture",
      title: "Phase 01 Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
    });

    expect(bundle.html.normalized).not.toContain("<script>");
    expect(bundle.html.normalized).not.toContain("onclick");
    expect(bundle.html.normalized).not.toContain("<form");
    expect(bundle.html.normalized).toContain('data-cdx-id="cdx_');
    expect(bundle.sanitizerReport.removedElementCount).toBeGreaterThan(0);
    expect(bundle.sanitizerReport.removedAttributeCount).toBeGreaterThan(0);
    expect(bundle.html.normalized).not.toMatch(/javascript:/i);
    expect(bundle.html.normalized).not.toContain("srcdoc");
  });

  it("produces deterministic node ids across repeated normalization", () => {
    const first = normalizeHtml({
      id: "phase-01-fixture",
      title: "Phase 01 Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
    });
    const second = normalizeHtml({
      id: "phase-01-fixture",
      title: "Phase 01 Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
    });

    expect(Object.keys(first.editGraph.nodes).sort()).toEqual(Object.keys(second.editGraph.nodes).sort());
  });

  it("classifies Korean headline text as an editable text node", () => {
    const bundle = normalizeHtml({
      id: "phase-01-fixture",
      title: "Phase 01 Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
    });

    const textNodes = Object.values(bundle.editGraph.nodes).filter((node) => node.kind === "text");
    expect(textNodes.some((node) => node.textPreview?.includes("AI 디자인"))).toBe(true);
  });
});
