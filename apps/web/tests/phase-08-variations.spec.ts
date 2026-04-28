import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("creates promotes persists and exports selected-region variations", async ({ page }) => {
  await openFreshProject(page);

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();

  const panel = page.getByTestId("variation-compare-panel");
  await page.getByTestId("localized-remix-prompt").fill("선택 영역을 Paper/Figma 수준의 더 선명한 정보 위계로 다듬어줘");
  await panel.getByRole("button", { name: "Create localized remix" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("variation-direction-list")).toContainText("Tighter hierarchy");
  await expect(page.getByTestId("variation-direction-list")).toContainText("Roomier rhythm");
  await expect(page.getByTestId("variation-direction-list")).toContainText("Presentation emphasis");

  const beforePromotion = await page.evaluate((key) => {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return {
      canvasOperations: saved.canvasOperations.length,
      baseRevision: saved.baseRevision
    };
  }, STORAGE_KEY);

  await panel.getByRole("button", { name: "Promote variation" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const afterPromotion = await page.evaluate((key) => {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return {
      canvasOperations: saved.canvasOperations.length,
      baseRevision: saved.baseRevision,
      raw: window.localStorage.getItem(key)
    };
  }, STORAGE_KEY);
  expect(afterPromotion.canvasOperations).toBeGreaterThan(beforePromotion.canvasOperations);
  expect(afterPromotion.raw).toContain("promotedDirectionId");
  expect(afterPromotion.raw).not.toContain("iframe.contentDocument");

  await page.getByTestId("export-agent-recipe-button").click();
  await expect(page.getByTestId("agent-recipe-list")).toContainText("codex");
  await expect(page.getByTestId("agent-recipe-list")).toContainText("context-driven-design-agent-prompt.md");

  const saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("agentRecipes");
  expect(saved).toContain("context-driven-design-agent-prompt.md");
  expect(saved).toContain("targetObjectId");
  expect(saved).toContain("operationIds");
  expect(saved).toContain("선택 영역을 Paper/Figma");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("variation-direction-list")).toContainText("Tighter hierarchy");
  await expect(page.getByTestId("agent-recipe-list")).toContainText("codex");

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
  }
});
