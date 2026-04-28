import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

test("creates reloadable slide decks with notes embeds and feedback", async ({ page }) => {
  await openFreshProject(page);

  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();

  await page.getByTestId("prototype-panel").getByRole("button", { name: "Add interaction" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const slides = page.getByTestId("slide-deck-panel");
  await slides.getByRole("button", { name: "Create deck" }).click();
  await expect(page.getByTestId("slide-outline")).toContainText("Cover");
  await slides.getByRole("button", { name: "Add slide" }).click();
  await expect(page.getByTestId("slide-outline")).toContainText("Prototype decision");

  await slides.getByRole("button", { name: "grid" }).click();
  await expect(slides).toContainText("grid");
  await slides.getByRole("button", { name: "outline" }).click();
  await expect(slides).toContainText("outline");
  await slides.getByRole("button", { name: "slide", exact: true }).click();
  await expect(slides).toContainText("slide");

  await page.getByTestId("slide-notes-input").fill("발표자는 선택 영역의 prototype transition을 먼저 설명한다.");
  await slides.getByRole("button", { name: "Save notes" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  await slides.getByRole("button", { name: "Embed selected canvas object" }).click();
  await slides.getByRole("button", { name: "Embed prototype block" }).click();
  await expect(page.getByTestId("slide-deck-panel")).toContainText("prototypeBlock");

  await slides.getByLabel("Feedback").selectOption("comment");
  await slides.getByRole("button", { name: "Add comment" }).click();
  await slides.getByLabel("Feedback").selectOption("poll");
  await slides.getByRole("button", { name: "Add poll" }).click();
  await slides.getByLabel("Feedback").selectOption("vote");
  await slides.getByRole("button", { name: "Add vote" }).click();
  await slides.getByLabel("Feedback").selectOption("alignment");
  await slides.getByRole("button", { name: "Add alignment" }).click();
  await expect(page.getByTestId("slide-feedback-list")).toContainText("alignment");

  let saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("slideDecks");
  expect(saved).toContain("발표자는 선택 영역");
  expect(saved).toContain("canvasObject");
  expect(saved).toContain("prototypeBlock");
  expect(saved).toContain("alignment");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("slide-outline")).toContainText("Prototype decision");
  await expect(page.getByTestId("slide-notes-input")).toHaveValue(/발표자는 선택 영역/);
  await expect(page.getByTestId("slide-feedback-list")).toContainText("alignment");
  saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(saved).toContain("poll");
  expect(saved).toContain("vote");
});
