import { expect, test } from "@playwright/test";

test("selects canvas nodes and edits text, style, comments, versions, undo, and redo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();

  await expect(page.getByTestId("selection-inspector")).toContainText("text");
  await expect(page.locator(".selection-overlay.selected")).toBeVisible();

  await page.getByTestId("selected-text-input").fill("바이브코더용 직접 편집 캔버스");
  await page.getByRole("button", { name: "텍스트 적용" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(frame.getByText("바이브코더용 직접 편집 캔버스")).toBeVisible();

  await frame.getByText("바이브코더용 직접 편집 캔버스").click();
  await page.getByRole("button", { name: "텍스트 틸" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect.poll(async () => {
    return frame.getByText("바이브코더용 직접 편집 캔버스").getAttribute("style");
  }).toContain("color: #2f9f8f");

  await frame.getByText("바이브코더용 직접 편집 캔버스").click();
  await page.getByTestId("comment-input").fill("헤드라인을 더 제품 중심으로 유지");
  await page.getByRole("button", { name: "코멘트 추가" }).click();
  await expect(page.getByTestId("comments-list")).toContainText("헤드라인을 더 제품 중심으로 유지");

  await page.getByRole("button", { name: "버전 저장" }).click();
  await expect(page.getByTestId("versions-list")).toContainText("Direction 1");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("versions-list")).toContainText("아직 없음");

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByTestId("versions-list")).toContainText("Direction 1");

  const saved = await page.evaluate(() =>
    window.localStorage.getItem("kdesign.phase01.project.v1")
  );
  expect(saved).toContain("바이브코더용 직접 편집 캔버스");
  expect(saved).toContain("헤드라인을 더 제품 중심으로 유지");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(frame.getByText("바이브코더용 직접 편집 캔버스")).toBeVisible();
});

test("uses constrained layout controls and persists global tweaks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("검증 가능한 HTML").click();
  await expect(page.getByTestId("selection-inspector")).toContainText("text");

  await page.getByRole("button", { name: "오른쪽 이동" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await frame.getByText("검증 가능한 HTML").click();
  await page.getByRole("button", { name: "넓게" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await frame.getByText("검증 가능한 HTML").click();
  await page.getByRole("button", { name: "가운데 정렬" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  let saved = await page.evaluate(() =>
    window.localStorage.getItem("kdesign.phase01.project.v1")
  );
  expect(saved).toContain("transform: translate(18px, 0px)");
  expect(saved).toContain("text-align: center");

  await page.getByRole("button", { name: "4열" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  saved = await page.evaluate(() =>
    window.localStorage.getItem("kdesign.phase01.project.v1")
  );
  expect(saved).toContain("repeat(4, minmax(0, 1fr))");
  expect(saved).toContain("\"feedColumns\":4");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect.poll(async () => frame.locator(".feature-grid").getAttribute("style")).toContain("repeat(4");
});

test("toolbar, tabs, and bridge rejection paths remain usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  await page.getByRole("button", { name: "Comments" }).click();
  await page.getByRole("button", { name: "Chat" }).click();
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await page.getByRole("button", { name: "Draw" }).click();
  await page.getByTestId("tweaks-toggle").click();
  await expect(page.getByTestId("selection-inspector")).toHaveCount(0);
  await page.getByTestId("tweaks-toggle").click();
  await expect(page.getByTestId("selection-inspector")).toBeVisible();

  await page.evaluate(() => {
    window.postMessage(
      { type: "preview.select", nonce: "wrong", node: { nodeId: "cdx_bad", kind: "text", tagName: "h1", x: 0, y: 0, width: 10, height: 10 } },
      "*"
    );
  });

  await expect(page.getByTestId("diagnostics-bridge")).toContainText(/invalid_source|invalid_nonce/);
});
