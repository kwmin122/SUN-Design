import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("persists canvas object selection, rename, layout constraints, and tablet/mobile width", async ({ page }) => {
  await openFreshProject(page);

  await expect(page.getByTestId("canvas-layer-tree")).toBeVisible();
  await expect(page.getByTestId("canvas-object-inspector")).toBeVisible();

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();

  await expect(page.getByTestId("canvas-object-breadcrumb")).toBeVisible();
  await page.getByTestId("object-name-input").fill("Hero headline object");
  await page.getByRole("button", { name: "Rename object" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  let saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("Hero headline object");

  await frame.locator(".feature-grid").click({ position: { x: 12, y: 12 } });
  await page.getByRole("button", { name: "Layout grid" }).click();
  await page.getByRole("button", { name: "Gap 16" }).click();
  await page.getByRole("button", { name: "Grid 3 columns" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("\"gridTemplateColumns\":\"repeat(3, minmax(0, 1fr))\"");
  await expect.poll(async () => frame.locator(".feature-grid").getAttribute("style")).toContain("repeat(3");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("canvas-layer-tree")).toContainText("Hero headline object");

  for (const viewport of [{ width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
  }
});
