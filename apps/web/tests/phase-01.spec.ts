import { expect, test } from "@playwright/test";

test("renders fixture in a sandboxed iframe", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("K-Design Studio project launcher").getByText("K-Design Studio")).toBeVisible();
  await expect(page.getByText("Phase 02 Direct Canvas", { exact: false })).toBeVisible();

  const iframe = page.getByTitle("Sandboxed design preview");
  await expect(iframe).toHaveAttribute("sandbox", "allow-scripts");

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await expect(frame.getByText("AI 디자인을 바로 편집 가능한 결과물로")).toBeVisible();
  await expect(frame.locator("[data-cdx-id]").first()).toBeVisible();
});

test("surfaces sanitizer and readiness diagnostics", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("diagnostics-sanitizer")).not.toContainText("Sanitizer changes0");
  await expect(page.getByTestId("diagnostics-sanitizer")).toContainText(/removed-element|removed-attribute/);
});

test("rejects spoofed parent-side bridge messages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  await page.evaluate(() => {
    window.postMessage(
      { type: "preview.ready", nonce: "wrong", documentId: "spoof", nodeCount: 1 },
      "*"
    );
  });

  await expect(page.getByTestId("diagnostics-bridge")).toContainText(/invalid_source|invalid_nonce/);
});

test("reloads the saved bundle from local storage", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const savedBeforeReload = await page.evaluate(() =>
    window.localStorage.getItem("kdesign.phase01.project.v1")
  );
  expect(savedBeforeReload).not.toBeNull();

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await expect(frame.locator("[data-cdx-id]").first()).toBeVisible();

  const savedAfterReload = await page.evaluate(() =>
    window.localStorage.getItem("kdesign.phase01.project.v1")
  );
  expect(savedAfterReload).toContain("phase-01-fixture");
});

test("fixture tweaks rebuild stored state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  await page.getByRole("button", { name: "4열" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await page.getByRole("button", { name: "컴팩트" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await page.getByRole("button", { name: "틸" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await expect(frame.locator("[data-cdx-id]").first()).toBeVisible();

  await expect.poll(async () => {
    return frame.locator(".feature-grid").getAttribute("style");
  }).toContain("repeat(4");

  const savedAfterTweaks = await page.evaluate(() =>
    window.localStorage.getItem("kdesign.phase01.project.v1")
  );
  expect(savedAfterTweaks).toContain("repeat(4");
  expect(savedAfterTweaks).toContain("#2f9f8f");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(frame.locator(".feature-grid")).toHaveAttribute("style", /repeat\(4/);
});
