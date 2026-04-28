import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("reviews publishes remixes rolls back and reloads a governed design system", async ({ page }) => {
  await openFreshProject(page);

  await page.getByTestId("design-system-panel").getByRole("button", { name: "Extract candidates" }).click();
  await expect(page.getByTestId("design-token-list")).toContainText("color.");
  await expect(page.getByTestId("design-token-list")).toContainText("typography.heading");

  await page.getByTestId("design-token-list").locator(".token-row").first().click();
  await page.getByRole("button", { name: "Approve selected token" }).click();

  await page.getByTestId("code-ref-name-input").fill("MarketingCard");
  await page.getByTestId("code-ref-framework-input").fill("react");
  await page.getByTestId("code-ref-import-input").fill("@/components/marketing-card");
  await page.getByTestId("code-ref-export-input").fill("MarketingCard");
  await page.getByTestId("code-ref-source-input").fill("apps/web/components/marketing-card.tsx");
  await page.getByTestId("code-ref-docs-input").fill("https://example.com/docs/marketing-card");
  await page.getByTestId("code-ref-storybook-input").fill("https://example.com/storybook/marketing-card");
  await page.getByRole("button", { name: "Add code reference" }).click();
  await expect(page.getByTestId("code-reference-list")).toContainText("MarketingCard");

  await page.getByTestId("token-css-variable-input").fill("--brand-primary");
  await page.getByTestId("token-tailwind-class-input").fill("text-brand-primary");
  await page.getByRole("button", { name: "Map token" }).click();

  await page.getByTestId("publish-label-input").fill("Studio System v1");
  await page.getByRole("button", { name: "Publish system" }).click();
  await expect(page.getByTestId("design-system-version-list")).toContainText("Studio System v1");

  await page.getByTestId("remix-name-input").fill("Studio System Remix");
  await page.getByRole("button", { name: "Remix system" }).click();
  await expect(page.getByTestId("design-system-panel")).toContainText("draft");

  await page.getByRole("button", { name: "Rollback system" }).click();
  await expect(page.getByTestId("design-system-panel")).toContainText("published");
  await page.getByTestId("handoff-panel").getByRole("button", { name: "Codex" }).click();

  let saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("Studio System v1");
  expect(saved).toContain("--brand-primary");
  expect(saved).toContain("text-brand-primary");
  expect(saved).toContain("MarketingCard");
  expect(saved).toContain("designTokens");
  expect(saved).toContain("codeReferences");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("design-system-version-list")).toContainText("Studio System v1");
  await expect(page.getByTestId("code-reference-list")).toContainText("MarketingCard");
  saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("--brand-primary");

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
  }
});
