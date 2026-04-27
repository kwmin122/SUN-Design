import { expect, test } from "@playwright/test";

test("switches responsive preview modes without losing editable state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const frameWrap = page.getByTestId("preview-frame-wrap");
  await expect(frameWrap).toHaveClass(/preview-desktop/);

  await page.getByRole("button", { name: "Tablet" }).click();
  await expect(frameWrap).toHaveClass(/preview-tablet/);

  await page.getByRole("button", { name: "Mobile" }).click();
  await expect(frameWrap).toHaveClass(/preview-mobile/);

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();
  await expect(page.getByTestId("selection-inspector")).toContainText("text");

  await page.getByRole("button", { name: "Desktop" }).click();
  await expect(frameWrap).toHaveClass(/preview-desktop/);
  await expect(page.getByTestId("selection-inspector")).toContainText("text");
});

test("creates stored-state export jobs and quality flags", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  await page.getByRole("button", { name: "Mobile" }).click();
  const exportPanel = page.getByTestId("export-panel");
  await exportPanel.getByRole("button", { name: "HTML" }).click();
  await exportPanel.getByRole("button", { name: "PNG" }).click();
  await exportPanel.getByRole("button", { name: "PDF" }).click();
  await exportPanel.getByRole("button", { name: "ZIP" }).click();
  await exportPanel.getByRole("button", { name: "PPTX" }).click();
  await exportPanel.getByRole("button", { name: "디자인 리뷰" }).click();

  await expect(page.getByTestId("export-jobs")).toContainText("HTML · mobile · ready");
  await expect(page.getByTestId("export-jobs")).toContainText("PNG · mobile · ready");
  await expect(page.getByTestId("export-jobs")).toContainText("PDF · mobile · ready");
  await expect(page.getByTestId("export-jobs")).toContainText("ZIP · mobile · ready");
  await expect(page.getByTestId("export-jobs")).toContainText("PPTX · mobile · ready");
  await expect(page.getByTestId("quality-issues")).not.toContainText("검사 전");

  const saved = await page.evaluate(() => window.localStorage.getItem("kdesign.phase01.project.v1"));
  expect(saved).toContain("\"kind\":\"html\"");
  expect(saved).toContain("\"viewport\":\"mobile\"");
  expect(saved).toContain("cleanHtml");
  expect(saved).not.toContain("preview.ready");
});
