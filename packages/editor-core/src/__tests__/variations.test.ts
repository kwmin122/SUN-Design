import { describe, expect, it } from "vitest";

import { ensureCanvasGraph } from "../canvas-graph.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import type { CanvasOperation, ProjectBundle, VariationDirection } from "../schemas.js";
import {
  addVariationDirection,
  createSelectedRegionRemix,
  exportAgentRecipe,
  promoteVariationDirection
} from "../variations.js";

function createVariationBundle(): { bundle: ProjectBundle; targetObjectId: string; otherObjectId: string } {
  const bundle = ensureCanvasGraph(normalizeHtml({
    id: "variations-fixture",
    title: "Variations Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  }));
  const graph = bundle.canvasGraph!;
  const objects = Object.values(graph.objects).filter((object) => object.nodeId);
  const targetObjectId = objects[0]!.id;
  const otherObjectId = objects.find((object) => object.id !== targetObjectId)!.id;
  return { bundle, targetObjectId, otherObjectId };
}

describe("variation helpers", () => {
  it("creates compares promotes and exports selected-region variation recipes", () => {
    const fixture = createVariationBundle();
    let bundle = createSelectedRegionRemix(fixture.bundle, {
      id: "variation_set_region",
      targetObjectId: fixture.targetObjectId,
      prompt: "Make the selected region clearer.",
      createdAt: "2026-04-28T00:00:00.000Z"
    });
    const set = bundle.variationSets.find((item) => item.id === "variation_set_region")!;
    const direction = set.directions[0]!;

    expect(set.directions.map((item) => item.name)).toEqual([
      "Tighter hierarchy",
      "Roomier rhythm",
      "Presentation emphasis"
    ]);

    bundle = promoteVariationDirection(bundle, set.id, direction.id);
    const promotedSet = bundle.variationSets.find((item) => item.id === set.id)!;
    expect(promotedSet.promotedDirectionId).toBe(direction.id);
    expect(promotedSet.directions.find((item) => item.id === direction.id)?.status).toBe("promoted");
    expect(bundle.canvasOperations.map((operation) => operation.id)).toContain(direction.operations[0]!.id);

    bundle = exportAgentRecipe(bundle, {
      runtime: "codex",
      targetObjectId: fixture.targetObjectId,
      prompt: "Replay the promoted selected-region direction.",
      variationSetId: set.id,
      directionId: direction.id,
      createdAt: "2026-04-28T00:00:01.000Z"
    });

    expect(bundle.agentRecipes[0]?.runtime).toBe("codex");
    expect(bundle.agentRecipes[0]?.instructionsPath).toBe("docs/prompts/context-driven-design-agent-prompt.md");
    expect(bundle.agentRecipes[0]?.operationIds).toEqual(direction.operations.map((operation) => operation.id));
  });

  it("rejects stale unsafe or cross-region variation operations", () => {
    const fixture = createVariationBundle();
    let bundle = createSelectedRegionRemix(fixture.bundle, {
      id: "variation_set_region",
      targetObjectId: fixture.targetObjectId,
      prompt: "Make the selected region clearer.",
      createdAt: "2026-04-28T00:00:00.000Z"
    });
    const set = bundle.variationSets.find((item) => item.id === "variation_set_region")!;
    const crossRegionOperation: CanvasOperation = {
      id: "variation_op_cross_region",
      op: "setLayoutConstraints",
      objectId: fixture.otherObjectId,
      value: { constraints: { layout: { padding: "12px" } } },
      source: "agent",
      baseRevision: bundle.baseRevision,
      createdAt: "2026-04-28T00:00:01.000Z"
    };

    expect(() => addVariationDirection(bundle, set.id, {
      name: "Cross region",
      description: "Attempts to edit outside the selected object.",
      targetObjectId: fixture.targetObjectId,
      operations: [crossRegionOperation],
      patches: []
    })).toThrow("selected object");

    bundle = addVariationDirection(bundle, set.id, {
      id: "variation_dir_stale",
      name: "Stale",
      description: "Uses an old source revision.",
      targetObjectId: fixture.targetObjectId,
      operations: [{
        id: "variation_op_stale",
        op: "setLayoutConstraints",
        objectId: fixture.targetObjectId,
        value: { constraints: { layout: { padding: "12px" } } },
        source: "agent",
        baseRevision: "rev_stale",
        createdAt: "2026-04-28T00:00:02.000Z"
      }],
      patches: []
    });

    expect(() => promoteVariationDirection(bundle, set.id, "variation_dir_stale"))
      .toThrow("Stale variation operation revision");

    expect(() => exportAgentRecipe(bundle, {
      runtime: "codex",
      targetObjectId: fixture.targetObjectId,
      prompt: "Unsafe recipe",
      instructionsPath: "../prompts/unsafe.md"
    })).toThrow("instructionsPath");
  });

  it("rejects unsafe raw-html and live-dom variation records", () => {
    const fixture = createVariationBundle();
    const bundle = createSelectedRegionRemix(fixture.bundle, {
      id: "variation_set_region",
      targetObjectId: fixture.targetObjectId,
      prompt: "Make the selected region clearer.",
      createdAt: "2026-04-28T00:00:00.000Z"
    });
    const set = bundle.variationSets.find((item) => item.id === "variation_set_region")!;
    const targetNodeId = bundle.canvasGraph!.objects[fixture.targetObjectId]!.nodeId!;

    expect(() => addVariationDirection(bundle, set.id, {
      name: "Raw HTML",
      description: "Attempts to store raw HTML as an operation.",
      targetObjectId: fixture.targetObjectId,
      operations: [],
      patches: [{
        id: "variation_patch_raw_html",
        nodeId: targetNodeId,
        op: "setHtml",
        value: "<script>alert(1)</script>",
        source: "agent",
        baseRevision: bundle.baseRevision,
        createdAt: "2026-04-28T00:00:01.000Z"
      } as never]
    })).toThrow();

    expect(() => exportAgentRecipe(bundle, {
      runtime: "codex",
      targetObjectId: fixture.targetObjectId,
      prompt: "Unsafe recipe",
      instructionsPath: "https://example.com/prompt.md"
    })).toThrow("instructionsPath");
  });

  it("rejects promoted persisted agent-output directions with unsupported operations", () => {
    const fixture = createVariationBundle();
    const bundle = createSelectedRegionRemix(fixture.bundle, {
      id: "variation_set_region",
      targetObjectId: fixture.targetObjectId,
      prompt: "Make the selected region clearer.",
      createdAt: "2026-04-28T00:00:00.000Z"
    });
    const set = bundle.variationSets.find((item) => item.id === "variation_set_region")!;
    const corruptDirection: VariationDirection = {
      id: "variation_dir_agent_corrupt",
      name: "Corrupt agent direction",
      description: "Attempts to bypass ingest validation through persisted state.",
      targetObjectId: fixture.targetObjectId,
      operations: [{
        id: "variation_op_agent_corrupt",
        op: "reorderObject",
        objectId: fixture.targetObjectId,
        value: { parentId: fixture.targetObjectId, index: 0 },
        source: "agent",
        baseRevision: bundle.baseRevision,
        createdAt: "2026-04-28T00:00:01.000Z"
      }],
      patches: [],
      status: "candidate",
      provenance: "agent-output:codex",
      createdAt: "2026-04-28T00:00:01.000Z"
    };
    const pollutedBundle: ProjectBundle = {
      ...bundle,
      variationSets: bundle.variationSets.map((item) => item.id === set.id ? {
        ...item,
        directions: [...item.directions, corruptDirection]
      } : item)
    };

    expect(() => promoteVariationDirection(pollutedBundle, set.id, corruptDirection.id))
      .toThrow("Agent variation direction failed validation");
  });
});
