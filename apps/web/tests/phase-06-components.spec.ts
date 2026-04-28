import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("creates, edits, detaches, reloads, and hands off a local component instance", async ({ page }) => {
  await openFreshProject(page);

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();
  await expect(page.getByTestId("component-instance-panel")).toBeVisible();

  await page.getByTestId("component-name-input").fill("Article Module");
  await page.getByTestId("component-variant-input").fill("Marketing");
  await page.getByRole("button", { name: "Create component" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("component-instance-panel")).toContainText("Article Module");

  await page.getByRole("button", { name: "Create instance" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await page.getByRole("button", { name: "Variant Marketing" }).click();
  await page.getByRole("button", { name: "State hover" }).click();
  await page.getByTestId("component-override-key-input").fill("headline");
  await page.getByTestId("component-label-override").fill("가입 CTA");
  await page.getByRole("button", { name: "Apply override" }).click();
  await page.getByRole("button", { name: "Detach instance" }).click();

  await page.getByTestId("handoff-panel").getByRole("button", { name: "Codex" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  let saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("Article Module");
  expect(saved).toContain("Marketing");
  expect(saved).toContain("hover");
  expect(saved).toContain("headline");
  expect(saved).toContain("가입 CTA");
  expect(saved).toContain("\"detached\":true");
  expect(saved).toContain("\"canvasGraph\"");
  expect(saved).toContain("componentInstances");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("component-instance-panel")).toContainText("Article Module");
  saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("\"detached\":true");
});
