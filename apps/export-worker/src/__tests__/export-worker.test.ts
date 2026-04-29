import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseProjectBundleJson } from "@kdesign/editor-core";
import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML, normalizeHtml } from "@kdesign/editor-core";

import { writeWorkerBundleFixture } from "../export-worker.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const OUT_DIR = path.join(ROOT, ".tmp-export-worker/phase-10");
const FIXTURE_PATH = path.join(ROOT, "apps/web/tests/fixtures/phase-10-worker-export-bundle.json");
const NOW = "2026-04-29T00:00:00.000Z";

describe("Phase 10 export worker", () => {
  it("writes deterministic artifacts and a web-loadable ProjectBundle fixture", async () => {
    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });
    const bundle = normalizeHtml({
      id: "phase-10-worker-fixture",
      title: "Phase 10 Worker Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
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
    await expectSignature("animation.mp4", "\u0000\u0000\u0000\u0018ftyp");

    const fixture = parseProjectBundleJson(await readFile(FIXTURE_PATH, "utf8"));
    expect(fixture.exportArtifacts).toHaveLength(8);
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
