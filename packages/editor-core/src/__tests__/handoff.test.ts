import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { ensureCanvasGraph } from "../canvas-graph.js";
import { createAgentHandoff, createCanvaHandoff, createShareLink, learnDesignSystem } from "../handoff.js";
import { normalizeHtml } from "../normalize.js";

describe("design system and handoff helpers", () => {
  const bundle = normalizeHtml({
    id: "handoff-fixture",
    title: "Handoff Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  });

  it("learns design-system tokens from stored bundle state", () => {
    const designSystem = learnDesignSystem(bundle, "2026-04-27T00:00:00.000Z");

    expect(designSystem.source).toBe("learned");
    expect(designSystem.colors.color1).toMatch(/^#/);
    expect(designSystem.typography.heading).toContain("Pretendard");
    expect(designSystem.tokens.some((token) => token.name.startsWith("color."))).toBe(true);
  });

  it("creates share links with access levels", () => {
    const link = createShareLink({
      bundle,
      access: "comment",
      createdAt: "2026-04-27T00:00:00.000Z"
    });

    expect(link.access).toBe("comment");
    expect(link.url).toMatch(/^kdesign:\/\/share\/handoff-fixture\/share_[a-z0-9]+$/);
  });

  it("creates canva and agent-agnostic handoff packages", () => {
    const canva = createCanvaHandoff({ bundle, createdAt: "2026-04-27T00:00:00.000Z" });
    const codex = createAgentHandoff({ bundle, target: "codex", createdAt: "2026-04-27T00:00:00.000Z" });

    expect(canva.target).toBe("canva");
    expect(codex.target).toBe("codex");
    expect(codex.artifactId).toBe("handoff-fixture");
    expect(codex.includes).toContain("ProjectBundle");
    expect(codex.instructionsPath).toBe("docs/prompts/context-driven-design-agent-prompt.md");
  });

  it("includes canvas and component records for portable handoff", () => {
    const withCanvas = ensureCanvasGraph(bundle);
    const codex = createAgentHandoff({
      bundle: withCanvas,
      target: "codex",
      createdAt: "2026-04-28T00:00:00.000Z"
    });

    expect(codex.includes).toContain("canvasGraph");
    expect(codex.includes).toContain("canvasOperations");
    expect(codex.includes).toContain("components");
    expect(codex.includes).toContain("componentInstances");
    expect(codex.includes).toContain("designTokens");
    expect(codex.includes).toContain("codeReferences");
    expect(codex.includes).toContain("componentPatterns");
    expect(codex.includes).toContain("designSystemVersions");
    expect(codex.includes).toContain("prototypeGraph");
    expect(codex.includes).toContain("slideDecks");
    expect(codex.includes).toContain("variationSets");
    expect(codex.includes).toContain("agentRecipes");
    expect(codex.includes).toContain("source-notes.md");
    expect(codex.includes).toContain("design-context.md");
    expect(codex.includes).toContain("sourceRecords");
    expect(codex.includes).toContain("dataSources");
    expect(codex.includes).toContain("assetLifecycle");
    expect(codex.includes).toContain("syncEnvelope");
  });
});
