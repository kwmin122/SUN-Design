import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { ensureCanvasGraph } from "../canvas-graph.js";
import { normalizeHtml } from "../normalize.js";
import {
  createMemoryProjectRepository,
  parseProjectBundleJson,
  serializeProjectBundle
} from "../persistence.js";

function createBundle() {
  return normalizeHtml({
    id: "phase-01-fixture",
    title: "Phase 01 Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  });
}

describe("project bundle persistence", () => {
  it("serializes and parses a normalized bundle", () => {
    const bundle = createBundle();
    const parsed = parseProjectBundleJson(serializeProjectBundle(bundle));

    expect(parsed.id).toBe(bundle.id);
    expect(parsed.baseRevision).toBe(bundle.baseRevision);
    expect(parsed.html.normalized).toBe(bundle.html.normalized);
    expect(Object.keys(parsed.editGraph.nodes).sort()).toEqual(Object.keys(bundle.editGraph.nodes).sort());
  });

  it("saves and reloads equivalent bundles from the memory repository", async () => {
    const bundle = createBundle();
    const repository = createMemoryProjectRepository();

    await repository.save(bundle);
    const loaded = await repository.load(bundle.id);

    expect(loaded?.id).toBe(bundle.id);
    expect(loaded?.html.normalized).toBe(bundle.html.normalized);
  });

  it("stores cloned JSON values rather than object references", async () => {
    const bundle = createBundle();
    const repository = createMemoryProjectRepository();

    await repository.save(bundle);
    bundle.title = "Mutated after save";

    const loaded = await repository.load(bundle.id);
    expect(loaded?.title).toBe("Phase 01 Fixture");
  });

  it("throws for malformed JSON", () => {
    expect(() => parseProjectBundleJson("{not-json")).toThrow();
  });

  it("throws when schemaVersion is omitted", () => {
    const bundle = createBundle();
    const parsed = JSON.parse(serializeProjectBundle(bundle)) as Record<string, unknown>;
    delete parsed.schemaVersion;

    expect(() => parseProjectBundleJson(JSON.stringify(parsed))).toThrow();
  });

  it("rejects persisted prototype references to missing canvas objects", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const raw = JSON.parse(serializeProjectBundle(bundle));
    raw.prototypeGraph = {
      version: 1,
      variables: [],
      stateRules: [],
      interactions: [{
        id: "proto_ix_corrupt",
        sourceObjectId: "missing-object",
        trigger: "click",
        action: "navigateTo",
        targetObjectId: "also-missing",
        provenance: "corrupt-fixture",
        createdAt: "2026-04-28T00:00:00.000Z"
      }],
      updatedAt: "2026-04-28T00:00:00.000Z"
    };

    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("missing canvas object");
  });

  it("rejects persisted slide references to missing objects and interactions", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const raw = JSON.parse(serializeProjectBundle(bundle));
    raw.slideDecks = [{
      id: "deck_corrupt",
      title: "Corrupt Deck",
      view: "slide",
      activeSlideId: "slide_1",
      slides: [{
        id: "slide_1",
        title: "Corrupt Slide",
        order: 0,
        notes: "",
        blocks: [{
          id: "block_corrupt",
          kind: "canvasObject",
          objectId: "missing-object",
          order: 0
        }],
        feedback: []
      }],
      createdAt: "2026-04-28T00:00:00.000Z",
      updatedAt: "2026-04-28T00:00:00.000Z"
    }];

    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Slide block references missing canvas object");

    raw.slideDecks[0].slides[0].blocks = [{
      id: "block_corrupt_proto",
      kind: "prototypeBlock",
      interactionId: "missing-interaction",
      order: 0
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("missing prototype interaction");
  });

  it("rejects persisted variation and recipe references outside stored state", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const raw = JSON.parse(serializeProjectBundle(bundle));
    const targetObjectId = raw.canvasGraph.rootObjectIds[0];
    raw.variationSets = [{
      id: "variation_set_corrupt",
      targetObjectId,
      prompt: "Corrupt selected-region remix",
      sourceRevision: raw.baseRevision,
      directions: [{
        id: "variation_dir_corrupt",
        name: "Corrupt",
        description: "Attempts to edit another object.",
        targetObjectId,
        operations: [{
          id: "variation_op_corrupt",
          op: "setLayoutConstraints",
          objectId: "missing-object",
          value: { constraints: { layout: { padding: "12px" } } },
          source: "agent",
          baseRevision: raw.baseRevision,
          createdAt: "2026-04-28T00:00:00.000Z"
        }],
        patches: [],
        status: "candidate",
        provenance: "corrupt-fixture",
        createdAt: "2026-04-28T00:00:00.000Z"
      }],
      createdAt: "2026-04-28T00:00:00.000Z",
      updatedAt: "2026-04-28T00:00:00.000Z"
    }];

    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("missing canvas object");

    raw.variationSets = [];
    raw.agentRecipes = [{
      id: "agent_recipe_corrupt",
      runtime: "codex",
      targetObjectId: "missing-object",
      sourceRevision: raw.baseRevision,
      prompt: "Replay corrupt state.",
      instructionsPath: "docs/prompts/context-driven-design-agent-prompt.md",
      operationIds: [],
      replaySteps: ["Load bundle."],
      createdAt: "2026-04-28T00:00:00.000Z"
    }];

    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Agent recipe references missing canvas object");
  });

  it("rejects persisted agent output references", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const raw = JSON.parse(serializeProjectBundle(bundle)) as {
      baseRevision: string;
      canvasGraph: {
        objects: Record<string, {
          id: string;
          kind: string;
          name: string;
          nodeId?: string;
          parentId?: string;
          childIds: string[];
        }>;
      };
      [key: string]: unknown;
    };
    const targetObject = Object.values(raw.canvasGraph.objects).find((object) => object.nodeId)!;
    const targetObjectId = targetObject.id;
    const contextPackage = {
      id: "agent_context_valid",
      runtime: "codex",
      targetObjectId,
      sourceRevision: raw.baseRevision,
      prompt: "Generate selected-region directions.",
      instructionsPath: "docs/prompts/context-driven-design-agent-prompt.md",
      selectedObject: {
        id: targetObjectId,
        kind: targetObject.kind,
        name: targetObject.name,
        nodeId: targetObject.nodeId,
        parentId: targetObject.parentId,
        childIds: targetObject.childIds
      },
      ancestors: [],
      siblings: [],
      tokenSummary: [],
      guardrails: ["Use stored ProjectBundle ids only."],
      createdAt: "2026-04-28T00:00:00.000Z"
    };

    raw.agentContextPackages = [{
      ...contextPackage,
      targetObjectId: "missing-object",
      selectedObject: { ...contextPackage.selectedObject, id: "missing-object" }
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Agent context package references missing canvas object");

    raw.agentContextPackages = [];
    raw.agentOutputs = [{
      id: "agent_output_corrupt",
      contextPackageId: "missing-context",
      runtime: "codex",
      targetObjectId,
      sourceRevision: raw.baseRevision,
      prompt: "Generate selected-region directions.",
      directions: [{
        id: "agent_dir_a",
        name: "A",
        description: "A",
        rationale: "A",
        targetObjectId,
        operations: [],
        patches: [],
        provenance: "agent-output:codex",
        createdAt: "2026-04-28T00:00:01.000Z"
      }, {
        id: "agent_dir_b",
        name: "B",
        description: "B",
        rationale: "B",
        targetObjectId,
        operations: [],
        patches: [],
        provenance: "agent-output:codex",
        createdAt: "2026-04-28T00:00:02.000Z"
      }],
      diagnostics: [],
      createdAt: "2026-04-28T00:00:03.000Z"
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Agent output references missing context package");

    raw.agentOutputs = [];
    raw.agentContextPackages = [contextPackage];
    raw.agentRuns = [{
      id: "agent_run_corrupt",
      runtime: "codex",
      status: "validated",
      contextPackageId: contextPackage.id,
      outputId: "missing-output",
      targetObjectId,
      sourceRevision: raw.baseRevision,
      diagnostics: [],
      createdAt: "2026-04-28T00:00:04.000Z",
      updatedAt: "2026-04-28T00:00:04.000Z"
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Agent run references missing output id");
  });
});
