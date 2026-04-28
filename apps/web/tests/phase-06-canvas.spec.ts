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
  await expect(page.locator(".design-agent-steps")).toContainText("3 Directions");

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();

  await expect(page.getByTestId("canvas-object-breadcrumb")).toBeVisible();
  await page.getByTestId("object-name-input").fill("Hero headline object");
  await page.getByRole("button", { name: "Rename object" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  let saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("Hero headline object");

  await page.getByRole("button", { name: "Lock object" }).click();
  await page.getByTestId("selected-text-input").fill("Locked patch should not apply");
  await page.getByRole("button", { name: "텍스트 적용" }).click();
  await expect(page.getByTestId("diagnostics-bridge")).toContainText("locked");
  saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).not.toContain("Locked patch should not apply");

  await page.locator(".chat-rail").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.locator(".layer-tree").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const featureGridLayer = page.getByTestId("layer-row-obj_cdx_autztk").getByRole("button").first();
  await featureGridLayer.scrollIntoViewIfNeeded();
  await expect(featureGridLayer).toBeVisible();
  await featureGridLayer.click();
  await expect(page.getByTestId("canvas-object-breadcrumb")).toContainText("02 편집 가능한 구조");
  await page.getByTestId("layout-columns-input").fill("4");
  await page.getByTestId("layout-gap-input").fill("20px");
  await page.getByTestId("layout-breakpoint-input").fill("768px");
  for (const action of ["Layout grid", "Apply gap", "Apply grid columns", "Apply breakpoint"]) {
    await page.getByRole("button", { name: action }).click();
    await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  }

  saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("\"gridTemplateColumns\":\"repeat(4, minmax(0, 1fr))\"");
  expect(saved).toContain("\"breakpoint\":\"768px\"");
  await expect.poll(async () => frame.locator(".feature-grid").getAttribute("style")).toContain("repeat(4");
  await expect.poll(async () => frame.locator(".feature-grid").getAttribute("style")).toContain("--cdx-breakpoint: 768px");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("canvas-layer-tree")).toContainText("Hero headline object");

  for (const viewport of [{ width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
  }
});
