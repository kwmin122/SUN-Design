import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASIC_LANDING_FIXTURE_HTML,
  createSlideDeck,
  normalizeHtml,
  parseProjectBundleJson,
  ProjectBundleSchema,
  type ProjectBundle
} from "@kdesign/editor-core";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { exportAnimationGif, exportAnimationMp4 } from "../animation.js";
import {
  materializeCodeRoundtripPackage,
  materializeStaticPublishPreview,
  materializeStoredStateExport,
  writeWorkerBundleFixture
} from "../export-worker.js";
import { createEditableSubsetPptx, createRasterizedPptx } from "../pptx.js";
import { renderBundlePreview } from "../render.js";
import { writeDeterministicZip } from "../zip.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const OUT_DIR = path.join(ROOT, ".tmp-export-worker/phase-10-fixture");
const FIXTURE_PATH = path.join(OUT_DIR, "phase-10-worker-export-bundle.generated.json");
const COMMITTED_FIXTURE_PATH = path.join(ROOT, "apps/web/tests/fixtures/phase-10-worker-export-bundle.json");
const NOW = "2026-04-29T00:00:00.000Z";

describe("Phase 10 export worker", () => {
  it("writes deterministic artifacts and a web-loadable ProjectBundle fixture", async () => {
    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });
    const bundle = withAnimationTemplate(ProjectBundleSchema.parse({
      ...normalizeHtml({
        id: "phase-10-worker-fixture",
        title: "Phase 10 Worker Fixture",
        html: BASIC_LANDING_FIXTURE_HTML
      }),
      createdAt: NOW,
      updatedAt: NOW
    }));

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
    expect(editableSlide).toContain("button:");
    expect(editableSlide).toContain("<p:pic>");
    expect(editableSlide).toContain("editable-diagnostics");
    expect(editableSlide).toContain("editable-subset:skipped:");
    expect(editableSlide).toContain("<a:prstGeom prst=\"rect\">");
    expect(editableSlide).not.toContain("unsupported-pptx-node:button");
    expect(editableRels).toContain("Target=\"../media/asset_1bgo2te.svg\"");
    await expectZipContains("site.zip", ["index.html", "manifest.json", "project-bundle.json"]);

    const fixture = parseProjectBundleJson(await readFile(FIXTURE_PATH, "utf8"));
    expect(fixture.exportArtifacts).toHaveLength(9);
    expect(fixture.exportArtifacts.find((artifact) => artifact.kind === "png")?.bytes).toBeGreaterThan(20_000);
    expect(fixture.exportArtifacts.find((artifact) => artifact.kind === "pdf")?.bytes).toBeGreaterThan(20_000);
    expect(fixture.exportArtifacts.find((artifact) => artifact.kind === "gif")?.diagnostics).toContain("animation-frames:3");
    const editableArtifact = fixture.exportArtifacts.find((artifact) => artifact.filename === "slides-editable.pptx");
    expect(editableArtifact?.diagnostics.some((diagnostic) => diagnostic.startsWith("editable-subset:skipped:"))).toBe(true);
    expect(editableArtifact?.diagnostics).not.toContain("unsupported-pptx-node:button");
    expect(fixture.exportVerifications.some((item) => item.kind === "signature")).toBe(true);
    expect(fixture.exportVerifications.some((item) => item.kind === "visual-diff")).toBe(true);
    expect(fixture.exportVerifications.filter((item) => item.kind === "visual-diff").every((item) => item.expectedHash !== item.actualHash)).toBe(true);
    expect(fixture.exportVerifications.some((item) => item.kind === "manifest")).toBe(true);
    expect(fixture.exportVerifications.some((item) => item.kind === "roundtrip")).toBe(true);
    expect(fixture.publishPreviews[0]?.url).toMatch(/^kdesign:\/\/publish\/phase-10-worker-fixture\/publish_/);
    const roundtripManifest = JSON.parse(fixture.codeRoundtripPackages[0]!.manifestJson);
    expect(roundtripManifest.sourceOfTruth).toBe("ProjectBundle");
    expect(roundtripManifest.projectBundle.id).toBe("phase-10-worker-fixture");
    expect(roundtripManifest.projectBundleHash).toEqual(expect.any(String));
    expect(roundtripManifest.exportArtifacts.length).toBeGreaterThan(0);
    expect(fixture.html.normalized).not.toContain("live iframe DOM");
    const committedFixture = parseProjectBundleJson(await readFile(COMMITTED_FIXTURE_PATH, "utf8"));
    const generatedFixture = parseProjectBundleJson(await readFile(FIXTURE_PATH, "utf8"));
    expect(workerFixtureContract(generatedFixture)).toEqual(workerFixtureContract(committedFixture));
  });

  it("exposes plan-level public APIs and rejects unsafe paths", async () => {
    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });
    const bundle = ProjectBundleSchema.parse({
      ...normalizeHtml({
        id: "phase-10-api-fixture",
        title: "Phase 10 API Fixture",
        html: BASIC_LANDING_FIXTURE_HTML
      }),
      createdAt: NOW,
      updatedAt: NOW
    });

    expect(typeof createEditableSubsetPptx).toBe("function");
    expect(typeof createRasterizedPptx).toBe("function");
    expect(typeof exportAnimationGif).toBe("function");
    expect(typeof exportAnimationMp4).toBe("function");
    const editableSubset = createEditableSubsetPptx(bundle, { createdAt: NOW });
    expect(Buffer.from(editableSubset.data).subarray(0, 2).toString("latin1")).toBe("PK");
    expect(editableSubset.diagnostics.some((diagnostic) => diagnostic.startsWith("editable-subset:mapped:"))).toBe(true);
    const rasterized = createRasterizedPptx(bundle);
    expect(Buffer.from(rasterized).subarray(0, 2).toString("latin1")).toBe("PK");
    expect(() => createRasterizedPptx(bundle, { pngArtifactPaths: ["/etc/passwd"] }))
      .toThrow("PPTX raster preview must be a PNG artifact");

    const html = await materializeStoredStateExport({
      bundle,
      kind: "html",
      viewport: "desktop",
      outputDir: OUT_DIR,
      createdAt: NOW
    });
    expect(html.artifact.filename).toBe("index.html");

    const publish = await materializeStaticPublishPreview({
      bundle: html.bundle,
      outputDir: OUT_DIR,
      createdAt: NOW
    });
    expect(publish.preview.url).toMatch(/^kdesign:\/\/publish\//);

    const roundtrip = await materializeCodeRoundtripPackage({
      bundle: publish.bundle,
      runtime: "codex",
      outputDir: OUT_DIR,
      createdAt: NOW
    });
    expect(roundtrip.package.manifestJson).toContain("\"projectBundle\"");
    expect(roundtrip.artifact.filename).toBe("code-agent-package.zip");

    const blockedGif = await materializeStoredStateExport({
      bundle,
      kind: "gif",
      viewport: "desktop",
      outputDir: OUT_DIR,
      createdAt: NOW
    });
    expect(blockedGif.artifact.diagnostics).toContain("animation-template-required");
    expect(blockedGif.verifications[0]?.status).toBe("failed");

    const animatedGif = await materializeStoredStateExport({
      bundle: withAnimationTemplate(bundle),
      kind: "gif",
      viewport: "desktop",
      outputDir: OUT_DIR,
      createdAt: NOW
    });
    expect(animatedGif.artifact.diagnostics).toContain("animation-frames:3");
    expect(animatedGif.verifications.some((verification) => verification.kind === "visual-diff")).toBe(true);

    expect(() => writeDeterministicZip([{ path: "../escape.txt", data: "owned" }])).toThrow("Unsafe zip entry path");
    await expect(materializeStoredStateExport({
      bundle,
      kind: "html",
      viewport: "desktop",
      outputDir: path.join(ROOT, "outside-exports"),
      createdAt: NOW
    })).rejects.toThrow("approved roots");
  });

  it("strips local resource URLs before worker rendering", async () => {
    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });
    const base = normalizeHtml({
      id: "phase-10-network-fixture",
      title: "Phase 10 Network Fixture",
      html: BASIC_LANDING_FIXTURE_HTML
    });
    const bundle = ProjectBundleSchema.parse({
      ...base,
      html: {
        ...base.html,
        normalized: `${base.html.normalized}<img src="http://127.0.0.1:9/private.png" alt="blocked">`
      },
      createdAt: NOW,
      updatedAt: NOW
    });

    const rendered = await renderBundlePreview(bundle, path.join(OUT_DIR, "network-render"));
    expect(rendered.html).not.toContain("127.0.0.1");
    expect(rendered.diagnostics.some((diagnostic) => diagnostic.includes("127.0.0.1"))).toBe(false);
  });
});

function withAnimationTemplate(bundle: ProjectBundle): ProjectBundle {
  return createSlideDeck(bundle, {
    id: "deck_phase10_animation",
    title: "Animation template",
    createdAt: NOW
  });
}

function workerFixtureContract(bundle: ProjectBundle) {
  const roundtripManifest = JSON.parse(bundle.codeRoundtripPackages[0]?.manifestJson ?? "{}");
  return {
    id: bundle.id,
    artifactFiles: bundle.exportArtifacts
      .map((artifact) => `${artifact.kind}:${artifact.filename}:${artifact.viewport}`)
      .sort(),
    verificationKinds: bundle.exportVerifications
      .map((verification) => `${verification.kind}:${verification.status}`)
      .sort(),
    publishPreviewCount: bundle.publishPreviews.length,
    roundtripRuntime: bundle.codeRoundtripPackages[0]?.runtime,
    roundtripManifestSource: roundtripManifest.sourceOfTruth,
    hasProjectBundleHash: typeof roundtripManifest.projectBundleHash === "string",
    editablePptxDiagnostics: bundle.exportArtifacts
      .find((artifact) => artifact.filename === "slides-editable.pptx")
      ?.diagnostics.filter((diagnostic) => diagnostic.startsWith("editable-subset:") || diagnostic.startsWith("unsupported-pptx-node:"))
      .sort()
  };
}

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
