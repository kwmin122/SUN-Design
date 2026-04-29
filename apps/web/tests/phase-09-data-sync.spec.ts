import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("binds fallback CSV data before explicit import without corrupting persisted sources", async ({ page }) => {
  await openFreshProject(page);

  await page.getByTestId("phase-09-create-data-binding").click();
  await expect(page.getByTestId("phase-09-data-binding-preview")).toContainText("민지");

  const saved = await page.evaluate((key) => {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    const sourceIds = new Set(parsed.sourceRecords.map((source: { id: string }) => source.id));
    return {
      sourceRecords: parsed.sourceRecords.length,
      dataSources: parsed.dataSources.length,
      sourceLinked: parsed.dataSources.every((source: { sourceId: string }) => sourceIds.has(source.sourceId))
    };
  }, STORAGE_KEY);
  expect(saved.sourceRecords).toBeGreaterThan(0);
  expect(saved.dataSources).toBeGreaterThan(0);
  expect(saved.sourceLinked).toBe(true);

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("phase-09-data-binding-preview")).toContainText("민지");
});

test("binds deterministic data and persists sync foundation diagnostics", async ({ page }) => {
  await openFreshProject(page);

  await page.getByTestId("phase-09-import-csv-data").click();
  await page.getByTestId("phase-09-create-data-binding").click();
  await expect(page.getByTestId("phase-09-data-binding-preview")).toContainText("민지");
  await expect(page.getByTestId("phase-09-data-binding-preview")).toContainText("유진");
  await expect(page.getByTestId("phase-09-data-binding-preview")).toContainText("서연");

  await page.getByTestId("phase-09-create-sync-envelope").click();
  await expect(page.getByTestId("phase-09-sync-status")).toContainText("DATA-01 foundation only");

  await page.getByTestId("phase-09-mark-sync-diverged").click();
  await expect(page.getByTestId("phase-09-sync-status")).toContainText("diverged");

  const saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("dataSources");
  expect(saved).toContain("dataBindings");
  expect(saved).toContain("syncEnvelope");
  expect(saved).not.toContain("iframe.contentDocument");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("phase-09-data-binding-preview")).toContainText("민지");
  await expect(page.getByTestId("phase-09-sync-status")).toContainText("diverged");
});
