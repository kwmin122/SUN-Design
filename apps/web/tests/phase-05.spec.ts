import { expect, test } from "@playwright/test";

test("creates design system, share links, canva handoff, and agent handoffs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const handoffPanel = page.getByTestId("handoff-panel");
  await handoffPanel.getByRole("button", { name: "디자인 시스템 학습" }).click();
  await expect(page.getByTestId("design-system-state")).toContainText("Phase 01 Fixture System");

  await handoffPanel.getByRole("button", { name: "View link" }).click();
  await handoffPanel.getByRole("button", { name: "Comment link" }).click();
  await handoffPanel.getByRole("button", { name: "Edit link" }).click();
  await expect(page.getByTestId("share-links")).toContainText("view");
  await expect(page.getByTestId("share-links")).toContainText("comment");
  await expect(page.getByTestId("share-links")).toContainText("edit");

  await handoffPanel.getByRole("button", { name: "Canva" }).click();
  await handoffPanel.getByRole("button", { name: "Codex" }).click();
  await handoffPanel.getByRole("button", { name: "Claude Code" }).click();
  await handoffPanel.getByRole("button", { name: "Cursor" }).click();
  await handoffPanel.getByRole("button", { name: "Local agent" }).click();
  await handoffPanel.getByRole("button", { name: "Web agent" }).click();
  await expect(page.getByTestId("handoff-packages")).toContainText("canva");
  await expect(page.getByTestId("handoff-packages")).toContainText("codex");
  await expect(page.getByTestId("handoff-packages")).toContainText("claudeCode");
  await expect(page.getByTestId("handoff-packages")).toContainText("cursor");
  await expect(page.getByTestId("handoff-packages")).toContainText("localAgent");
  await expect(page.getByTestId("handoff-packages")).toContainText("webAgent");

  const saved = await page.evaluate(() => window.localStorage.getItem("kdesign.phase01.project.v1"));
  expect(saved).toContain("designSystem");
  expect(saved).toContain("shareLinks");
  expect(saved).toContain("handoffPackages");
  expect(saved).toContain("docs/prompts/context-driven-design-agent-prompt.md");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("design-system-state")).toContainText("Phase 01 Fixture System");
  await expect(page.getByTestId("share-links")).toContainText("edit");
  await expect(page.getByTestId("handoff-packages")).toContainText("webAgent");
  await expect(page.getByTestId("handoff-packages")).toContainText("docs/prompts/context-driven-design-agent-prompt.md");
});
