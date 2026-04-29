import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("creates export publish and code roundtrip records and loads worker artifacts", async ({ page }) => {
  await openFreshProject(page);
  await expect(page.getByTestId("phase-10-export-publish-panel")).toBeVisible();

  for (const testId of [
    "phase-10-export-html",
    "phase-10-export-zip",
    "phase-10-export-png",
    "phase-10-export-pdf",
    "phase-10-export-pptx-raster",
    "phase-10-export-pptx-editable",
    "phase-10-export-gif",
    "phase-10-export-mp4"
  ]) {
    await page.getByTestId(testId).click();
    await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  }

  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText(".html");
  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText(".zip");
  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText(".png");
  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText(".pdf");
  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText(".pptx");
  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText(".gif");
  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText(".mp4");
  await expect(page.getByTestId("phase-10-export-verifications")).toContainText("signature");
  await expect(page.getByTestId("phase-10-export-verifications")).toContainText("manifest");

  await page.getByTestId("phase-10-create-publish-preview").click();
  await expect(page.getByTestId("phase-10-publish-previews")).toContainText("kdesign://publish/");
  await page.getByTestId("phase-10-create-code-roundtrip").click();
  await expect(page.getByTestId("phase-10-code-roundtrip-results")).toContainText("codex package");
  await page.getByTestId("phase-10-import-roundtrip-conflict").click();
  await expect(page.getByTestId("phase-10-code-roundtrip-results")).toContainText("source-revision-mismatch");

  await page.getByTestId("phase-10-load-worker-export-fixture").click();
  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText("index.html");
  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText("worker-created");
  await expect(page.getByTestId("phase-10-publish-previews")).toContainText("phase-10-worker-fixture");
  await expect(page.getByTestId("phase-10-code-roundtrip-results")).toContainText("ProjectBundle");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("phase-10-export-artifacts")).toContainText("index.html");

  const saved = await page.evaluate((key) => window.localStorage.getItem(key) ?? "", STORAGE_KEY);
  expect(saved).toContain("exportArtifacts");
  expect(saved).toContain("publishPreviews");
  expect(saved).toContain("codeRoundtripPackages");
  expect(saved).toContain("worker-created");
  expect(saved).not.toContain("data-preview-bridge");
  expect(saved).not.toContain("selection-overlay");
  expect(saved).not.toContain("live iframe DOM");

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
  }
});
