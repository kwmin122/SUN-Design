import { expect, test } from "@playwright/test";

test("creates a generated artifact from prompt, mode, fidelity, and context", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  await page.getByRole("button", { name: "Slide deck" }).click();
  await page.getByRole("button", { name: "Wireframe 빠른 구조와 흐름" }).click();
  await page.getByRole("textbox", { name: "Prompt" }).fill("AI 회의록 제품을 투자자에게 설명하는 첫 화면");
  const composer = page.locator(".prompt-composer");
  await composer.getByRole("button", { name: "Image" }).click();
  await composer.getByRole("button", { name: "PPTX" }).click();
  await composer.getByRole("button", { name: "DOCX" }).click();
  await composer.getByRole("button", { name: "XLSX" }).click();
  await composer.getByRole("button", { name: "Web" }).click();

  await expect(page.getByTestId("context-attachments")).toContainText("제품 스크린샷.png");
  await expect(page.getByTestId("context-attachments")).toContainText("https://example.com · placeholder");

  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await expect(frame.getByText("AI 회의록 제품을 투자자에게 설명하는 첫 화면")).toBeVisible();
  await expect(frame.getByText("Slide deck · Wireframe")).toBeVisible();
  await expect(page.getByTestId("asset-manifest")).toContainText("generated");
  await expect(page.getByTestId("asset-manifest")).toContainText("slideDeck");
  await expect(page.getByTestId("asset-manifest")).toContainText("placeholder");

  await frame.getByText("AI 회의록 제품을 투자자에게 설명하는 첫 화면").click();
  await page.getByTestId("selected-text-input").fill("프롬프트 생성 후 바로 편집된 제목");
  await page.getByRole("button", { name: "텍스트 적용" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(frame.getByText("프롬프트 생성 후 바로 편집된 제목")).toBeVisible();

  const saved = await page.evaluate(() => window.localStorage.getItem("kdesign.phase01.project.v1"));
  expect(saved).toContain("\"kind\":\"generated\"");
  expect(saved).toContain("\"mode\":\"slideDeck\"");
  expect(saved).toContain("제품 요구사항.docx");
  expect(saved).toContain("프롬프트 생성 후 바로 편집된 제목");
});

test("creates all three Korean preset contexts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');

  await page.getByRole("button", { name: "피치덱" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(frame.getByText("문제, 해결책, 시장, 실행 계획")).toBeVisible();
  await expect(page.getByTestId("asset-manifest")).toContainText("pitchDeck");

  await page.getByRole("button", { name: "모바일 앱" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(frame.getByText("한국어 앱 화면에서 읽히는 줄 길이")).toBeVisible();
  await expect(page.getByTestId("asset-manifest")).toContainText("mobileApp");

  await page.getByRole("button", { name: "SaaS 랜딩" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(frame.getByText("실제 제품 맥락과 한국어 문장 리듬")).toBeVisible();
  await expect(page.getByTestId("asset-manifest")).toContainText("saasLanding");
});
