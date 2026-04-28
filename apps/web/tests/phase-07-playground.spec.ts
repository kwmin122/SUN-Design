import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("previews component playground state without mutating the canvas operation log", async ({ page }) => {
  await openFreshProject(page);

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();
  await page.getByTestId("component-name-input").fill("Article Module");
  await page.getByTestId("component-prop-input").fill("headline");
  await page.getByTestId("component-variant-input").fill("Marketing");
  await page.getByRole("button", { name: "Create component" }).click();
  await expect(page.getByTestId("component-instance-panel")).toContainText("Article Module");

  const before = await page.evaluate((key) => {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      operationCount: parsed?.canvasOperations?.length ?? 0,
      selectedComponentCount: Object.keys(parsed?.canvasGraph?.components ?? {}).length
    };
  }, STORAGE_KEY);
  expect(before.selectedComponentCount).toBeGreaterThan(0);

  await expect(page.getByTestId("component-playground-panel")).toBeVisible();
  await page.getByTestId("playground-variant-select").selectOption({ label: "Marketing" });
  await page.getByTestId("playground-prop-key-input").fill("headline");
  await page.getByTestId("playground-prop-value-input").fill("Playground headline");
  await page.getByTestId("playground-mode-input").fill("dark");
  await page.getByRole("button", { name: "Preview playground state" }).click();
  await expect(page.getByTestId("playground-state-summary")).toContainText("Article Module");
  await expect(page.getByTestId("playground-state-summary")).toContainText("Marketing");
  await expect(page.getByTestId("playground-state-summary")).toContainText("dark");
  await expect(page.getByTestId("playground-state-summary")).toContainText("headline");

  const after = await page.evaluate((key) => {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      operationCount: parsed?.canvasOperations?.length ?? 0,
      selectedComponentCount: Object.keys(parsed?.canvasGraph?.components ?? {}).length,
      saved
    };
  }, STORAGE_KEY);
  expect(after.operationCount).toBe(before.operationCount);
  expect(after.selectedComponentCount).toBe(before.selectedComponentCount);
  expect(after.saved).not.toContain("Playground headline");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("component-instance-panel")).toContainText("Article Module");
  await expect(page.getByTestId("playground-state-summary")).not.toContainText("Playground headline");
});
