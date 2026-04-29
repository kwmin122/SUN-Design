import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseProjectBundleJson, ProjectBundleSchema } from "@kdesign/editor-core";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML, normalizeHtml } from "@kdesign/editor-core";

import { writeWorkerBundleFixture } from "../export-worker.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const OUT_DIR = path.join(ROOT, ".tmp-export-worker/phase-10");
const FIXTURE_PATH = path.join(OUT_DIR, "phase-10-worker-export-bundle.json");
const NOW = "2026-04-29T00:00:00.000Z";

describe("Phase 10 export worker", () => {
  it("writes deterministic artifacts and a web-loadable ProjectBundle fixture", async () => {
    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });
    const bundle = ProjectBundleSchema.parse({
      ...normalizeHtml({
        id: "phase-10-worker-fixture",
        title: "Phase 10 Worker Fixture",
        html: BASIC_LANDING_FIXTURE_HTML
      }),
      createdAt: NOW,
      updatedAt: NOW
    });

    const result = await writeWorkerBundleFixture({
      bundle,
      outDir: OUT_DIR,
      fixturePath: FIXTURE_PATH,
      createdAt: NOW
    });

    const filenames = result.artifacts.map((artifact) => artifact.filename).sort();
    expect(filenames).toEqual([
      "animation.gif",
      "animation.mp4",
      "index.html",
      "preview.pdf",
      "preview.png",
      "site.zip",
      "slides-editable.pptx",
      "slides-raster.pptx"
    ]);

    await expectSignature("index.html", "<!doctype html>");
    await expectSignature("site.zip", "PK");
    await expectSignature("preview.png", "\u0089PNG");
    await expectSignature("preview.pdf", "%PDF");
    await expectSignature("slides-raster.pptx", "PK");
    await expectSignature("slides-editable.pptx", "PK");
    await expectSignature("animation.gif", "GIF89a");
    await expectFileContains("animation.mp4", "ftyp");
    await expectMinBytes("preview.png", 20_000);
    await expectMinBytes("preview.pdf", 20_000);
    await expectMinBytes("animation.gif", 20_000);
    await expectMinBytes("animation.mp4", 20_000);
    await expectZipContains("slides-raster.pptx", ["ppt/media/preview.png"]);
    await expectZipContains("slides-editable.pptx", ["ppt/slides/slide1.xml", "ppt/media/asset_1bgo2te.svg"]);
    const editableSlide = await readZipText("slides-editable.pptx", "ppt/slides/slide1.xml");
    const editableRels = await readZipText("slides-editable.pptx", "ppt/slides/_rels/slide1.xml.rels");
    expect(editableSlide).toContain("K-Design Studio");
    expect(editableSlide).toContain("frame:");
    expect(editableSlide).toContain("<p:pic>");
    expect(editableSlide).toContain("editable-diagnostics");
    expect(editableSlide).toContain("editable-subset:skipped:");
    expect(editableSlide).toContain("unsupported-node-kind:button");
    expect(editableRels).toContain("Target=\"../media/asset_1bgo2te.svg\"");

    const fixture = parseProjectBundleJson(await readFile(FIXTURE_PATH, "utf8"));
    expect(fixture.exportArtifacts).toHaveLength(8);
    expect(fixture.exportArtifacts.find((artifact) => artifact.kind === "png")?.bytes).toBeGreaterThan(20_000);
    expect(fixture.exportArtifacts.find((artifact) => artifact.kind === "pdf")?.bytes).toBeGreaterThan(20_000);
    expect(fixture.exportArtifacts.find((artifact) => artifact.kind === "gif")?.diagnostics).toContain("animation-frames:3");
    const editableArtifact = fixture.exportArtifacts.find((artifact) => artifact.filename === "slides-editable.pptx");
    expect(editableArtifact?.diagnostics).toContain("editable-subset:skipped:7");
    expect(editableArtifact?.diagnostics).toContain("unsupported-node-kind:button");
    expect(fixture.exportVerifications.some((item) => item.kind === "signature")).toBe(true);
    expect(fixture.exportVerifications.some((item) => item.kind === "manifest")).toBe(true);
    expect(fixture.publishPreviews[0]?.url).toMatch(/^kdesign:\/\/publish\/phase-10-worker-fixture\/publish_/);
    expect(fixture.codeRoundtripPackages[0]?.manifestJson).toContain("ProjectBundle");
    expect(fixture.html.normalized).not.toContain("live iframe DOM");
  });
});

async function expectSignature(filename: string, signature: string): Promise<void> {
  const bytes = await readFile(path.join(OUT_DIR, filename));
  const head = bytes.subarray(0, signature.length).toString("latin1");
  expect(head).toBe(signature);
}

async function expectMinBytes(filename: string, minBytes: number): Promise<void> {
  const bytes = await readFile(path.join(OUT_DIR, filename));
  expect(bytes.byteLength).toBeGreaterThan(minBytes);
}

async function expectFileContains(filename: string, content: string): Promise<void> {
  const bytes = await readFile(path.join(OUT_DIR, filename));
  expect(bytes.toString("latin1")).toContain(content);
}

async function expectZipContains(filename: string, entries: string[]): Promise<void> {
  const bytes = await readFile(path.join(OUT_DIR, filename));
  const zip = unzipSync(new Uint8Array(bytes));
  for (const entry of entries) {
    expect(Object.hasOwn(zip, entry)).toBe(true);
  }
}

async function readZipText(filename: string, entry: string): Promise<string> {
  const bytes = await readFile(path.join(OUT_DIR, filename));
  const zip = unzipSync(new Uint8Array(bytes));
  const value = zip[entry];
  if (!value) {
    throw new Error(`Missing zip entry: ${entry}`);
  }
  return new TextDecoder().decode(value);
}
