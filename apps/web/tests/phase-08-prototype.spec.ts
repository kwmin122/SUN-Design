import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

async function addInteraction(page: Page, trigger: string, action: string) {
  const panel = page.getByTestId("prototype-panel");
  await page.getByTestId("prototype-trigger-select").selectOption(trigger);
  await page.getByTestId("prototype-action-select").selectOption(action);
  if (action === "toggleVariable" || action === "setVariable") {
    await page.getByTestId("prototype-variable-select").selectOption({ label: "Overlay open" });
  }
  await panel.getByRole("button", { name: "Add interaction" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("authors prototype interactions and previews playback without source mutation", async ({ page }) => {
  await openFreshProject(page);

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();
  const panel = page.getByTestId("prototype-panel");
  await expect(panel).toBeVisible();

  await page.getByTestId("prototype-variable-name-input").fill("Overlay open");
  await page.getByTestId("prototype-variable-kind-select").selectOption("boolean");
  await page.getByTestId("prototype-variable-add").click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  await addInteraction(page, "click", "navigateTo");
  await addInteraction(page, "hover", "setComponentState");
  await addInteraction(page, "tap", "toggleVariable");
  await addInteraction(page, "keyboard", "setVariable");
  await addInteraction(page, "timed", "openOverlay");
  await expect(page.getByTestId("prototype-interaction-list")).toContainText("keyboard");
  await expect(page.getByTestId("prototype-interaction-list")).toContainText("timed");

  const beforePresentation = await page.evaluate((key) => {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return {
      canvasOperations: saved.canvasOperations.length,
      patches: saved.patches.length,
      interactionCount: saved.prototypeGraph.interactions.length
    };
  }, STORAGE_KEY);

  await page.getByTestId("present-prototype-button").click();
  await page.getByRole("button", { name: "Play interaction" }).click();
  await expect(page.getByTestId("presentation-mode")).toContainText("1 steps");

  const afterPresentation = await page.evaluate((key) => {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return {
      canvasOperations: saved.canvasOperations.length,
      patches: saved.patches.length,
      interactionCount: saved.prototypeGraph.interactions.length,
      raw: window.localStorage.getItem(key)
    };
  }, STORAGE_KEY);

  expect(afterPresentation.canvasOperations).toBe(beforePresentation.canvasOperations);
  expect(afterPresentation.patches).toBe(beforePresentation.patches);
  expect(afterPresentation.interactionCount).toBe(5);
  expect(afterPresentation.raw).toContain("Overlay open");
  expect(afterPresentation.raw).toContain("prototypeGraph");
  expect(afterPresentation.raw).not.toContain("presentationState");

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
  }
});
