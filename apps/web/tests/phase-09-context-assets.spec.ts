import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("ingests context sources notes snapshots and asset provenance", async ({ page }) => {
  await openFreshProject(page);

  await page.getByTestId("phase-09-add-image-source").click();
  await page.getByTestId("phase-09-add-doc-source").click();
  await page.getByTestId("phase-09-add-pptx-source").click();
  await page.getByTestId("phase-09-add-xlsx-source").click();
  await page.getByTestId("phase-09-add-figma-source").click();
  await page.getByTestId("phase-09-add-codebase-source").click();

  await expect(page.getByTestId("phase-09-context-queue")).toContainText("제품 요구사항.docx");
  await expect(page.getByTestId("phase-09-parsed-context-summaries")).toContainText("바이브코더");
  await expect(page.getByTestId("phase-09-parsed-context-summaries")).toContainText("문제");
  await expect(page.getByTestId("phase-09-parsed-context-summaries")).toContainText("빠른 편집");
  await expect(page.getByTestId("phase-09-parsed-context-summaries")).toContainText("Landing / Desktop");
  await expect(page.getByTestId("phase-09-parsed-context-summaries")).toContainText("apps/web/components/editor-shell.tsx");

  await page.getByTestId("phase-09-add-unsupported-source").click();
  await expect(page.getByTestId("phase-09-context-queue")).toContainText("unsupported-source-type");

  await page.getByTestId("phase-09-generate-notes").click();
  await expect(page.getByTestId("phase-09-source-notes")).toContainText("# Source Notes");
  await expect(page.getByTestId("phase-09-design-context")).toContainText("# Design Context");

  await page.getByTestId("phase-09-web-snapshot-url").fill("https://example.com/product");
  await page.getByTestId("phase-09-capture-web-snapshot").click();
  await expect(page.getByTestId("phase-09-web-snapshot-list")).toContainText("editable");
  const editableSnapshotState = await page.evaluate((key) => {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    const snapshot = saved.webSnapshots.find((item: { status: string }) => item.status === "editable");
    const objectId = snapshot?.canvasObjectIds?.[0];
    return {
      objectId,
      objectExists: Boolean(objectId && saved.canvasGraph?.objects?.[objectId])
    };
  }, STORAGE_KEY);
  expect(editableSnapshotState.objectId).toBeTruthy();
  expect(editableSnapshotState.objectExists).toBe(true);

  await page.getByTestId("phase-09-capture-reference-snapshot").click();
  await expect(page.getByTestId("phase-09-web-snapshot-list")).toContainText("referenceOnly");

  await page.getByTestId("phase-09-capture-blocked-snapshot").click();
  await expect(page.getByTestId("phase-09-web-snapshot-list")).toContainText("blocked");
  await expect(page.getByTestId("phase-09-web-snapshot-list")).toContainText("javascript:");

  const blockedSnapshotState = await page.evaluate((key) => {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return saved.webSnapshots.filter((snapshot: { url: string }) => snapshot.url.startsWith("javascript:"));
  }, STORAGE_KEY);
  expect(JSON.stringify(blockedSnapshotState)).not.toContain('"status":"editable"');

  await page.getByTestId("phase-09-replace-asset").click();
  await expect(page.getByTestId("phase-09-asset-provenance")).toContainText("kdesign://asset");
  await page.getByTestId("phase-09-relink-asset").click();
  await expect(page.getByTestId("phase-09-asset-provenance")).toContainText("relinked");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("phase-09-source-notes")).toContainText("# Source Notes");
  await expect(page.getByTestId("phase-09-web-snapshot-list")).toContainText("referenceOnly");
  await expect(page.getByTestId("phase-09-asset-provenance")).toContainText("kdesign://asset");

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
  }
});
