import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kdesign.phase01.project.v1";

type StoredAgentContextPackage = {
  id: string;
  runtime: string;
  targetObjectId: string;
  sourceRevision: string;
  prompt: string;
  selectedObject: {
    id: string;
    name: string;
  };
  guardrails: string[];
  instructionsPath: string;
};

async function openFreshProject(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
}

async function createAgentContext(page: Page): Promise<StoredAgentContextPackage> {
  const frame = page.frameLocator('iframe[title="Sandboxed design preview"]');
  await frame.getByText("AI 디자인을 바로 편집 가능한 결과물로").click();
  await page.getByTestId("localized-remix-prompt").fill("선택 영역을 두 가지 high fidelity 방향으로 다시 다듬어줘");
  await page.getByTestId("create-agent-context-button").click();
  await expect(page.getByTestId("agent-context-list")).toContainText("context-driven-design-agent-prompt.md");

  return page.evaluate((key) => {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return saved.agentContextPackages[0] as StoredAgentContextPackage;
  }, STORAGE_KEY);
}

function buildAgentOutput(contextPackage: StoredAgentContextPackage, overrides: {
  runtime?: string;
  sourceRevision?: string;
  directionCount?: number;
} = {}) {
  const runtime = overrides.runtime ?? "codex";
  const sourceRevision = overrides.sourceRevision ?? contextPackage.sourceRevision;
  const directions = [{
    id: "agent_dir_sharp",
    name: "Agent sharper hierarchy",
    description: "Sharpen the selected region with a clearer lead and tighter spacing.",
    rationale: "The selected region needs stronger hierarchy without touching nearby sections.",
    targetObjectId: contextPackage.targetObjectId,
    operations: [{
      id: "agent_op_sharp",
      op: "setLayoutConstraints",
      objectId: contextPackage.targetObjectId,
      value: { constraints: { layout: { padding: "18px", gap: "10px" } } },
      source: "agent",
      baseRevision: sourceRevision,
      createdAt: "2026-04-28T00:00:01.000Z"
    }],
    patches: [],
    provenance: `agent-output:${runtime}`,
    createdAt: "2026-04-28T00:00:01.000Z"
  }, {
    id: "agent_dir_calm",
    name: "Agent calmer rhythm",
    description: "Open the selected region with calmer rhythm and more generous spacing.",
    rationale: "The selected region needs a roomier read while preserving layout.",
    targetObjectId: contextPackage.targetObjectId,
    operations: [{
      id: "agent_op_calm",
      op: "setLayoutConstraints",
      objectId: contextPackage.targetObjectId,
      value: { constraints: { layout: { padding: "28px", gap: "14px" } } },
      source: "agent",
      baseRevision: sourceRevision,
      createdAt: "2026-04-28T00:00:02.000Z"
    }],
    patches: [],
    provenance: `agent-output:${runtime}`,
    createdAt: "2026-04-28T00:00:02.000Z"
  }];

  return {
    id: "agent_output_e2e",
    contextPackageId: contextPackage.id,
    runtime,
    targetObjectId: contextPackage.targetObjectId,
    sourceRevision,
    prompt: contextPackage.prompt,
    directions: directions.slice(0, overrides.directionCount ?? 2),
    diagnostics: [],
    createdAt: "2026-04-28T00:00:03.000Z"
  };
}

test("ingests agent generated selected-region directions", async ({ page }) => {
  await openFreshProject(page);
  const contextPackage = await createAgentContext(page);

  expect(contextPackage.targetObjectId).toBeTruthy();
  expect(contextPackage.sourceRevision).toBeTruthy();
  expect(contextPackage.selectedObject).toBeTruthy();
  expect(contextPackage.guardrails).toContain("Use stored ProjectBundle ids only.");
  expect(contextPackage.instructionsPath).toBe("docs/prompts/context-driven-design-agent-prompt.md");

  await page.getByTestId("agent-output-json-input").fill(JSON.stringify(buildAgentOutput(contextPackage)));
  await page.getByTestId("ingest-agent-output-button").click();

  await expect(page.getByTestId("variation-direction-list")).toContainText("Agent sharper hierarchy");
  await expect(page.getByTestId("variation-direction-list")).toContainText("Agent calmer rhythm");
  await expect(page.getByTestId("agent-output-diagnostics")).toContainText("validated");

  await page.getByRole("button", { name: "Promote variation" }).click();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");

  const savedAfterPromote = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(savedAfterPromote).toContain("agentRuns");
  expect(savedAfterPromote).toContain("Agent sharper hierarchy");
  expect(savedAfterPromote).not.toContain("iframe.contentDocument");

  await page.reload();
  await expect(page.getByTestId("diagnostics-readiness")).toContainText("ready");
  await expect(page.getByTestId("variation-direction-list")).toContainText("Agent sharper hierarchy");
  await expect(page.getByTestId("agent-output-diagnostics")).toContainText("validated");

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
  }
});

test("rejects invalid agent selected-region output with diagnostics", async ({ page }) => {
  await openFreshProject(page);
  const contextPackage = await createAgentContext(page);

  await page.getByTestId("agent-output-json-input").fill(JSON.stringify(buildAgentOutput(contextPackage, {
    sourceRevision: "rev_stale"
  })));
  await page.getByTestId("ingest-agent-output-button").click();
  await expect(page.getByTestId("agent-output-diagnostics")).toContainText("stale-revision");

  await page.getByTestId("agent-output-json-input").fill(JSON.stringify(buildAgentOutput(contextPackage, {
    directionCount: 1
  })));
  await page.getByTestId("ingest-agent-output-button").click();
  await expect(page.getByTestId("agent-output-diagnostics")).toContainText(/insufficient-directions|schema-error/);

  await page.getByTestId("agent-output-json-input").fill(JSON.stringify(buildAgentOutput(contextPackage, {
    runtime: "claudeCode"
  })));
  await page.getByTestId("ingest-agent-output-button").click();
  await expect(page.getByTestId("agent-output-diagnostics")).toContainText("runtime-mismatch");

  const saved = await page.evaluate((key) => {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return {
      variationSets: parsed.variationSets.length,
      promoted: JSON.stringify(parsed).includes("promotedDirectionId")
    };
  }, STORAGE_KEY);
  expect(saved.variationSets).toBe(0);
  expect(saved.promoted).toBe(false);
});
