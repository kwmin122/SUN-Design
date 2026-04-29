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

type RawCanvasObject = {
  id: string;
  kind: string;
  name: string;
  nodeId?: string;
  parentId?: string;
  childIds: string[];
};

type RawProjectBundle = {
  baseRevision: string;
  canvasGraph: {
    rootObjectIds: string[];
    objects: Record<string, RawCanvasObject>;
  };
  agentContextPackages?: unknown[];
  agentOutputs?: unknown[];
  agentRuns?: unknown[];
  variationSets?: unknown[];
  [key: string]: unknown;
};

const AGENT_TEST_TIME = "2026-04-28T00:00:00.000Z";

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

  it("migrates legacy context attachments before persisted integrity validation", () => {
    const bundle = createBundle();
    const raw = JSON.parse(serializeProjectBundle(bundle));
    raw.source = {
      ...raw.source,
      contextAttachments: [{
        id: "legacy_doc",
        kind: "document",
        name: "Legacy requirements.docx",
        status: "verified",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      }]
    };

    const parsed = parseProjectBundleJson(JSON.stringify(raw));
    const migrated = parsed.sourceRecords.find((source) => source.name === "Legacy requirements.docx");
    expect(migrated?.id).toMatch(/^source_/);
    expect(migrated?.localPath).toBe("legacy-context/legacy_doc");
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

  it("rejects persisted agent output safety violations", () => {
    const { raw, contextPackage, targetObjectId, targetNodeId } = createRawAgentState();

    raw.agentContextPackages = [contextPackage];
    raw.agentOutputs = [createRawAgentOutput(contextPackage, {
      targetObjectId,
      directions: [{
        id: "agent_dir_unsupported",
        name: "Unsupported",
        description: "Attempts an unsupported graph mutation.",
        rationale: "Polluted persisted state.",
        targetObjectId,
        operations: [{
          id: "agent_op_unsupported",
          op: "reorderObject",
          objectId: targetObjectId,
          value: { parentId: targetObjectId, index: 0 },
          source: "agent",
          baseRevision: raw.baseRevision,
          createdAt: AGENT_TEST_TIME
        }],
        patches: [],
        provenance: "agent-output:codex",
        createdAt: AGENT_TEST_TIME
      }, {
        id: "agent_dir_unsafe_patch",
        name: "Unsafe patch",
        description: "Attempts raw HTML patch output.",
        rationale: "Polluted persisted state.",
        targetObjectId,
        operations: [],
        patches: [{
          id: "agent_patch_unsafe",
          nodeId: targetNodeId,
          op: "setText",
          value: "<strong onclick=\"alert(1)\">unsafe</strong>",
          source: "agent",
          baseRevision: raw.baseRevision,
          createdAt: AGENT_TEST_TIME
        }],
        provenance: "agent-output:codex",
        createdAt: AGENT_TEST_TIME
      }]
    })];

    expect(() => parseProjectBundleJson(JSON.stringify(raw)))
      .toThrow("Agent output failed persisted validation");
  });

  it("rejects persisted agent output context runtime mismatches", () => {
    const { raw, contextPackage, targetObjectId } = createRawAgentState();

    raw.agentContextPackages = [contextPackage];
    raw.agentOutputs = [createRawAgentOutput(contextPackage, {
      targetObjectId,
      runtime: "claudeCode"
    })];

    expect(() => parseProjectBundleJson(JSON.stringify(raw)))
      .toThrow("Agent output failed persisted validation");
  });

  it("rejects persisted agent run runtime mismatches", () => {
    const { raw, contextPackage, targetObjectId } = createRawAgentState();
    const output = createRawAgentOutput(contextPackage, { targetObjectId });

    raw.agentContextPackages = [contextPackage];
    raw.agentOutputs = [output];
    raw.agentRuns = [{
      id: "agent_run_runtime_mismatch",
      runtime: "claudeCode",
      status: "validated",
      contextPackageId: contextPackage.id,
      outputId: output.id,
      targetObjectId,
      sourceRevision: raw.baseRevision,
      diagnostics: [],
      createdAt: AGENT_TEST_TIME,
      updatedAt: AGENT_TEST_TIME
    }];

    expect(() => parseProjectBundleJson(JSON.stringify(raw)))
      .toThrow("Agent run runtime does not match output runtime");
  });

  it("rejects persisted agent-output variation safety violations", () => {
    const { raw, targetObjectId } = createRawAgentState();

    raw.variationSets = [{
      id: "variation_set_agent_corrupt",
      targetObjectId,
      prompt: "Agent output variation should be safe on reload.",
      sourceRevision: raw.baseRevision,
      directions: [{
        id: "variation_dir_agent_corrupt",
        name: "Corrupt agent direction",
        description: "Attempts an unsupported operation through persisted state.",
        targetObjectId,
        operations: [{
          id: "variation_op_agent_corrupt",
          op: "reorderObject",
          objectId: targetObjectId,
          value: { parentId: targetObjectId, index: 0 },
          source: "agent",
          baseRevision: raw.baseRevision,
          createdAt: AGENT_TEST_TIME
        }],
        patches: [],
        status: "candidate",
        provenance: "agent-output:codex",
        createdAt: AGENT_TEST_TIME
      }],
      createdAt: AGENT_TEST_TIME,
      updatedAt: AGENT_TEST_TIME
    }];

    expect(() => parseProjectBundleJson(JSON.stringify(raw)))
      .toThrow("Agent variation direction failed persisted validation");
  });

  it("rejects persisted Phase 09 context references", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const raw = JSON.parse(serializeProjectBundle(bundle));

    raw.generatedNotes = [{
      id: "note_corrupt",
      kind: "source-notes",
      path: "source-notes.md",
      sourceIds: ["missing-source"],
      content: "# Source Notes",
      createdAt: AGENT_TEST_TIME,
      updatedAt: AGENT_TEST_TIME
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Generated note references missing source");

    raw.generatedNotes = [];
    raw.parsedContextArtifacts = [{
      id: "parsed_corrupt",
      sourceId: "missing-source",
      kind: "documentSummary",
      title: "Corrupt",
      summary: "Corrupt",
      textBlocks: ["Corrupt"],
      tables: [],
      frameNames: [],
      assetIds: [],
      metadata: {},
      diagnostics: [],
      createdAt: AGENT_TEST_TIME
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Parsed context artifact references missing source");

    raw.sourceRecords = [{
      id: "source_valid",
      kind: "document",
      name: "Doc",
      hash: "hash_doc",
      createdAt: AGENT_TEST_TIME,
      importedAt: AGENT_TEST_TIME,
      localPath: "fixtures/doc.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      assetIds: [],
      parseStatus: "parsed",
      usageStatus: "candidate",
      diagnostics: []
    }];
    raw.parsedContextArtifacts[0].sourceId = "source_valid";
    raw.parsedContextArtifacts[0].assetIds = ["missing-asset"];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Parsed context artifact references missing asset");

    raw.parsedContextArtifacts = [];
    raw.sourceRecords[0].assetIds = ["missing-source-asset"];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Source record references missing asset");

    raw.sourceRecords[0].assetIds = [];
    raw.sourceRecords[0].sourceUrl = "http://[::]/";
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Source record URL is not public");

    delete raw.sourceRecords[0].sourceUrl;
    delete raw.sourceRecords[0].localPath;
    delete raw.sourceRecords[0].mimeType;
    raw.sourceRecords[0].diagnostics = [];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Source record missing provenance evidence");

    raw.sourceRecords[0].parseStatus = "blocked";
    raw.sourceRecords[0].usageStatus = "used";
    raw.sourceRecords[0].diagnostics = ["blocked-url:private-or-local-url"];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Blocked source must have blocked usage status");
  });

  it("rejects persisted Phase 09 snapshot data asset and sync corruption", () => {
    const bundle = ensureCanvasGraph(createBundle());
    const raw = JSON.parse(serializeProjectBundle(bundle));
    const objectId = raw.canvasGraph.rootObjectIds[0];
    raw.sourceRecords = [{
      id: "source_valid",
      kind: "webCapture",
      name: "Web",
      hash: "hash_web",
      createdAt: AGENT_TEST_TIME,
      importedAt: AGENT_TEST_TIME,
      sourceUrl: "https://example.com",
      assetIds: [],
      parseStatus: "parsed",
      usageStatus: "candidate",
      diagnostics: []
    }];

    raw.webSnapshots = [{
      id: "snapshot_corrupt",
      sourceId: "source_valid",
      url: "https://example.com/",
      status: "editable",
      sanitizedHtml: "<main></main>",
      normalizedHtml: "<main></main>",
      screenshotAssetId: "missing-asset",
      canvasObjectIds: [],
      diagnostics: [],
      createdAt: AGENT_TEST_TIME
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Web snapshot references missing asset");

    raw.webSnapshots[0].screenshotAssetId = undefined;
    raw.webSnapshots[0].url = "javascript:alert(1)";
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Web snapshot URL is not public");

    raw.webSnapshots[0].url = "https://different.example.com/";
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Web snapshot URL does not match source URL");

    raw.webSnapshots[0].url = "https://example.com/";
    raw.webSnapshots[0].canvasObjectIds = [objectId];

    raw.webSnapshots = [];
    raw.dataSources = [{
      id: "data_valid",
      kind: "csv",
      name: "Data",
      sourceId: "source_valid",
      fields: ["name"],
      rows: [{ name: "민지" }],
      status: "ready",
      createdAt: AGENT_TEST_TIME,
      updatedAt: AGENT_TEST_TIME
    }];
    raw.dataBindings = [{
      id: "binding_missing_source",
      dataSourceId: "missing-data",
      targetObjectId: objectId,
      fieldMap: { title: "name" },
      state: "ready",
      sourceRevision: raw.baseRevision,
      createdAt: AGENT_TEST_TIME,
      updatedAt: AGENT_TEST_TIME
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("data binding references missing data source");

    raw.dataBindings[0].dataSourceId = "data_valid";
    raw.dataBindings[0].fieldMap = { title: "missing-field" };
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Data binding references missing source field");

    raw.dataBindings[0].fieldMap = { title: "name" };
    raw.dataBindings[0].sourceRevision = "rev_stale";
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Data binding source revision is stale");

    raw.dataBindings = [];
    raw.assets = [{
      id: "asset_valid",
      kind: "image",
      status: "cached",
      localPath: "asset.png"
    }];
    raw.assetLifecycle = [{
      id: "event_corrupt",
      assetId: "asset_valid",
      type: "replaced",
      nextAssetId: "missing-next-asset",
      createdAt: AGENT_TEST_TIME
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Asset lifecycle next asset references missing asset");

    raw.assetLifecycle = [];
    raw.projectAssetUrls = [{
      assetId: "asset_valid",
      url: "kdesign://asset/phase-01-fixture/wrong-asset"
    }];
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("Project asset URL mismatches asset id");

    raw.projectAssetUrls = [];
    raw.syncEnvelope = {
      id: "sync_corrupt",
      status: "synced",
      localRevision: raw.baseRevision,
      diagnostics: []
    };
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("synced-missing-remote-document-id");

    raw.syncEnvelope = {
      id: "sync_remote_corrupt",
      status: "synced",
      remoteDocumentId: "remote_doc",
      localRevision: raw.baseRevision,
      remoteRevision: "rev_remote_old",
      diagnostics: []
    };
    expect(() => parseProjectBundleJson(JSON.stringify(raw))).toThrow("synced-remote-revision-mismatch");
  });
});

function createRawAgentState(): {
  raw: RawProjectBundle;
  contextPackage: {
    id: string;
    runtime: "codex";
    targetObjectId: string;
    sourceRevision: string;
    prompt: string;
    instructionsPath: string;
    selectedObject: RawCanvasObject;
    ancestors: unknown[];
    siblings: unknown[];
    tokenSummary: unknown[];
    guardrails: string[];
    createdAt: string;
  };
  targetObjectId: string;
  targetNodeId: string;
} {
  const bundle = ensureCanvasGraph(createBundle());
  const raw = JSON.parse(serializeProjectBundle(bundle)) as RawProjectBundle;
  const targetObject = Object.values(raw.canvasGraph.objects).find((object) => object.nodeId);
  if (!targetObject?.nodeId) {
    throw new Error("Expected a fixture object with a nodeId.");
  }
  const contextPackage = {
    id: "agent_context_valid",
    runtime: "codex" as const,
    targetObjectId: targetObject.id,
    sourceRevision: raw.baseRevision,
    prompt: "Generate selected-region directions.",
    instructionsPath: "docs/prompts/context-driven-design-agent-prompt.md",
    selectedObject: {
      id: targetObject.id,
      kind: targetObject.kind,
      name: targetObject.name,
      nodeId: targetObject.nodeId,
      ...(targetObject.parentId ? { parentId: targetObject.parentId } : {}),
      childIds: targetObject.childIds
    },
    ancestors: [],
    siblings: [],
    tokenSummary: [],
    guardrails: ["Use stored ProjectBundle ids only."],
    createdAt: AGENT_TEST_TIME
  };

  return {
    raw,
    contextPackage,
    targetObjectId: targetObject.id,
    targetNodeId: targetObject.nodeId
  };
}

function createRawAgentOutput(
  contextPackage: { id: string; runtime: "codex"; sourceRevision: string },
  input: {
    targetObjectId: string;
    directions?: unknown[];
    runtime?: "codex" | "claudeCode";
  }
) {
  const runtime = input.runtime ?? contextPackage.runtime;
  return {
    id: "agent_output_valid",
    contextPackageId: contextPackage.id,
    runtime,
    targetObjectId: input.targetObjectId,
    sourceRevision: contextPackage.sourceRevision,
    prompt: "Generate selected-region directions.",
    directions: input.directions ?? [{
      id: "agent_dir_a",
      name: "A",
      description: "A",
      rationale: "A",
      targetObjectId: input.targetObjectId,
      operations: [],
      patches: [],
      provenance: `agent-output:${runtime}`,
      createdAt: AGENT_TEST_TIME
    }, {
      id: "agent_dir_b",
      name: "B",
      description: "B",
      rationale: "B",
      targetObjectId: input.targetObjectId,
      operations: [],
      patches: [],
      provenance: `agent-output:${runtime}`,
      createdAt: AGENT_TEST_TIME
    }],
    diagnostics: [],
    createdAt: AGENT_TEST_TIME
  };
}
