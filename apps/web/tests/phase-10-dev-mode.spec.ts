import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("creates Dev Mode inspect code readiness diff and asset records", async ({ page }) => {
  await openFreshProject(page);

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();
  await page.getByTestId("phase-10-dev-mode-toggle").click();
  await expect(page.getByTestId("phase-10-dev-mode-panel")).toBeVisible();

  await page.getByTestId("phase-10-create-inspect-report").click();
  await expect(page.getByTestId("phase-10-inspect-measurements")).not.toContainText("No report");
  await expect(page.getByTestId("phase-10-token-references")).toBeVisible();
  await expect(page.getByTestId("phase-10-accessibility-notes")).toBeVisible();
  await expect(page.getByTestId("phase-10-component-metadata")).toBeVisible();
  await expect(page.getByTestId("phase-10-prototype-metadata")).toBeVisible();

  for (const kind of ["css", "tailwind", "reactProps", "tokenReference"]) {
    await page.getByTestId("phase-10-code-snippet-kind").selectOption(kind);
    await page.getByTestId("phase-10-create-code-snippet").click();
  }
  await expect(page.getByTestId("phase-10-code-snippets")).toContainText("css");
  await expect(page.getByTestId("phase-10-code-snippets")).toContainText("reactProps");

  await page.getByTestId("phase-10-mark-ready").click();
  await expect(page.getByTestId("phase-10-ready-state")).toContainText("ready");
  await page.getByTestId("phase-10-create-version-diff").click();
  await expect(page.getByTestId("phase-10-version-diff")).toContainText("changes");
  await page.getByTestId("phase-10-create-asset-download").click();
  await expect(page.getByTestId("phase-10-asset-downloads")).toContainText("kdesign://asset");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await page.getByTestId("phase-10-dev-mode-toggle").click();
  await expect(page.getByTestId("phase-10-ready-state")).toContainText("ready");
  await expect(page.getByTestId("phase-10-code-snippets")).toContainText("reactProps");

  const saved = await page.evaluate((key) => window.localStorage.getItem(key) ?? "", STORAGE_KEY);
  expect(saved).toContain("devModeReports");
  expect(saved).toContain("readyForDevMarkers");
  expect(saved).toContain("assetDownloads");
  expect(saved).not.toContain("live iframe DOM");

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
  }
});
