import { describe, expect, it } from "vitest";

import {
  createAgentContextPackage,
  ingestAgentOutput,
  parseAgentOutputJson
} from "../agent-output.js";
import { ensureCanvasGraph } from "../canvas-graph.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import type { AgentOutputEnvelope, CanvasOperation, EditPatch, ProjectBundle } from "../schemas.js";
import { promoteVariationDirection } from "../variations.js";

function createAgentFixture(): {
  bundle: ProjectBundle;
  targetObjectId: string;
  otherObjectId: string;
  targetNodeId: string;
} {
  const bundle = ensureCanvasGraph(normalizeHtml({
    id: "agent-output-fixture",
    title: "Agent Output Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  }));
  const objects = Object.values(bundle.canvasGraph!.objects).filter((object) => object.nodeId);
  const target = objects[0]!;
  const other = objects.find((object) => object.id !== target.id)!;
  return {
    bundle,
    targetObjectId: target.id,
    otherObjectId: other.id,
    targetNodeId: target.nodeId!
  };
}

function withContext(fixture = createAgentFixture()) {
  const bundle = createAgentContextPackage(fixture.bundle, {
    runtime: "codex",
    targetObjectId: fixture.targetObjectId,
    prompt: "선택 영역을 더 선명한 두 가지 방향으로 다듬어줘",
    createdAt: "2026-04-28T00:00:00.000Z"
  });
  return { ...fixture, bundle, contextPackage: bundle.agentContextPackages[0]! };
}

function createOperation(id: string, objectId: string, baseRevision: string, padding: string): CanvasOperation {
  return {
    id,
    op: "setLayoutConstraints",
    objectId,
    value: { constraints: { layout: { padding } } },
    source: "agent",
    baseRevision,
    createdAt: "2026-04-28T00:00:01.000Z"
  };
}

function createEnvelope(input: {
  contextPackageId: string;
  runtime?: "codex" | "claudeCode";
  targetObjectId: string;
  sourceRevision: string;
  operationObjectId?: string;
  directions?: AgentOutputEnvelope["directions"];
}): AgentOutputEnvelope {
  const runtime = input.runtime ?? "codex";
  const operationObjectId = input.operationObjectId ?? input.targetObjectId;
  return {
    id: "agent_output_valid",
    contextPackageId: input.contextPackageId,
    runtime,
    targetObjectId: input.targetObjectId,
    sourceRevision: input.sourceRevision,
    prompt: "선택 영역을 더 선명한 두 가지 방향으로 다듬어줘",
    directions: input.directions ?? [
      {
        id: "agent_dir_sharp",
        name: "Agent sharper hierarchy",
        description: "Sharper hierarchy from model output.",
        rationale: "The target region needs a stronger visual lead.",
        targetObjectId: input.targetObjectId,
        operations: [createOperation("agent_op_sharp", operationObjectId, input.sourceRevision, "18px")],
        patches: [],
        provenance: `agent-output:${runtime}`,
        createdAt: "2026-04-28T00:00:01.000Z"
      },
      {
        id: "agent_dir_calm",
        name: "Agent calmer rhythm",
        description: "Calmer rhythm from model output.",
        rationale: "The target region needs more breathing room.",
        targetObjectId: input.targetObjectId,
        operations: [createOperation("agent_op_calm", operationObjectId, input.sourceRevision, "28px")],
        patches: [],
        provenance: `agent-output:${runtime}`,
        createdAt: "2026-04-28T00:00:02.000Z"
      }
    ],
    diagnostics: [],
    createdAt: "2026-04-28T00:00:03.000Z"
  };
}

describe("agent output ingestion", () => {
  it("creates a selected-region agent context package from stored canvas state", () => {
    const fixture = withContext();

    expect(fixture.contextPackage.targetObjectId).toBe(fixture.targetObjectId);
    expect(fixture.contextPackage.sourceRevision).toBe(fixture.bundle.baseRevision);
    expect(fixture.contextPackage.selectedObject.id).toBe(fixture.targetObjectId);
    expect(fixture.contextPackage.guardrails).toContain("Use stored ProjectBundle ids only.");
    expect(fixture.contextPackage.guardrails).toContain("Do not read or save live iframe DOM.");
    expect(fixture.contextPackage.instructionsPath).toBe("docs/prompts/context-driven-design-agent-prompt.md");
  });

  it("ingests agent generated directions as validated variation candidates", () => {
    const fixture = withContext();
    const bundle = ingestAgentOutput(fixture.bundle, {
      contextPackageId: fixture.contextPackage.id,
      runtime: "codex",
      output: createEnvelope({
        contextPackageId: fixture.contextPackage.id,
        targetObjectId: fixture.targetObjectId,
        sourceRevision: fixture.contextPackage.sourceRevision
      }),
      createdAt: "2026-04-28T00:00:04.000Z"
    });

    expect(bundle.agentOutputs[0]?.id).toBe("agent_output_valid");
    expect(bundle.agentRuns[0]?.status).toBe("validated");
    expect(bundle.variationSets[0]?.directions.map((direction) => direction.name)).toEqual([
      "Agent sharper hierarchy",
      "Agent calmer rhythm"
    ]);
    expect(bundle.variationSets[0]?.directions.every((direction) => direction.status === "validated")).toBe(true);
    expect(bundle.variationSets[0]?.directions.every((direction) => direction.provenance === "agent-output:codex")).toBe(true);
  });

  it("records rejected agent runs for stale revisions", () => {
    const fixture = withContext();
    const bundle = ingestAgentOutput(fixture.bundle, {
      contextPackageId: fixture.contextPackage.id,
      runtime: "codex",
      output: createEnvelope({
        contextPackageId: fixture.contextPackage.id,
        targetObjectId: fixture.targetObjectId,
        sourceRevision: "rev_stale"
      }),
      createdAt: "2026-04-28T00:00:04.000Z"
    });

    expect(bundle.agentRuns[0]?.status).toBe("rejected");
    expect(bundle.agentRuns[0]?.diagnostics.map((diagnostic) => diagnostic.code)).toContain("stale-revision");
    expect(bundle.variationSets).toHaveLength(0);
  });

  it("records rejected agent runs for single-direction outputs", () => {
    const fixture = withContext();
    const output = createEnvelope({
      contextPackageId: fixture.contextPackage.id,
      targetObjectId: fixture.targetObjectId,
      sourceRevision: fixture.contextPackage.sourceRevision
    });
    const bundle = ingestAgentOutput(fixture.bundle, {
      contextPackageId: fixture.contextPackage.id,
      runtime: "codex",
      output: { ...output, directions: output.directions.slice(0, 1) },
      createdAt: "2026-04-28T00:00:04.000Z"
    });

    expect(bundle.agentRuns[0]?.status).toBe("rejected");
    expect(bundle.agentRuns[0]?.diagnostics.map((diagnostic) => diagnostic.code)).toContain("insufficient-directions");
    expect(bundle.variationSets).toHaveLength(0);
  });

  it("records rejected agent runs for parse errors", () => {
    const fixture = withContext();
    const bundle = ingestAgentOutput(fixture.bundle, {
      contextPackageId: fixture.contextPackage.id,
      runtime: "codex",
      output: "{not-json",
      createdAt: "2026-04-28T00:00:04.000Z"
    });

    expect(bundle.agentRuns[0]?.status).toBe("rejected");
    expect(bundle.agentRuns[0]?.diagnostics.map((diagnostic) => diagnostic.code)).toContain("parse-error");
    expect(bundle.variationSets).toHaveLength(0);
  });

  it("records rejected agent runs for runtime mismatches", () => {
    const fixture = withContext();
    const bundle = ingestAgentOutput(fixture.bundle, {
      contextPackageId: fixture.contextPackage.id,
      runtime: "codex",
      output: createEnvelope({
        contextPackageId: fixture.contextPackage.id,
        runtime: "claudeCode",
        targetObjectId: fixture.targetObjectId,
        sourceRevision: fixture.contextPackage.sourceRevision
      }),
      createdAt: "2026-04-28T00:00:04.000Z"
    });

    expect(bundle.agentRuns[0]?.status).toBe("rejected");
    expect(bundle.agentRuns[0]?.diagnostics.map((diagnostic) => diagnostic.code)).toContain("runtime-mismatch");
    expect(bundle.variationSets).toHaveLength(0);
  });

  it("records rejected agent runs for context package runtime mismatches", () => {
    const fixture = withContext();
    const bundle = ingestAgentOutput(fixture.bundle, {
      contextPackageId: fixture.contextPackage.id,
      runtime: "claudeCode",
      output: createEnvelope({
        contextPackageId: fixture.contextPackage.id,
        runtime: "claudeCode",
        targetObjectId: fixture.targetObjectId,
        sourceRevision: fixture.contextPackage.sourceRevision
      }),
      createdAt: "2026-04-28T00:00:04.000Z"
    });

    expect(bundle.agentRuns[0]?.status).toBe("rejected");
    expect(bundle.agentRuns[0]?.runtime).toBe("claudeCode");
    expect(bundle.agentRuns[0]?.diagnostics.map((diagnostic) => diagnostic.code)).toContain("runtime-mismatch");
    expect(bundle.agentOutputs).toHaveLength(0);
    expect(bundle.variationSets).toHaveLength(0);
  });

  it("records rejected agent runs for cross-target operations", () => {
    const fixture = withContext();
    const bundle = ingestAgentOutput(fixture.bundle, {
      contextPackageId: fixture.contextPackage.id,
      runtime: "codex",
      output: createEnvelope({
        contextPackageId: fixture.contextPackage.id,
        targetObjectId: fixture.targetObjectId,
        sourceRevision: fixture.contextPackage.sourceRevision,
        operationObjectId: fixture.otherObjectId
      }),
      createdAt: "2026-04-28T00:00:04.000Z"
    });

    expect(bundle.agentRuns[0]?.status).toBe("rejected");
    expect(bundle.agentRuns[0]?.diagnostics.map((diagnostic) => diagnostic.code)).toContain("out-of-scope-target");
    expect(bundle.variationSets).toHaveLength(0);
  });

  it("rejects unsupported operations and raw html patch output", () => {
    const fixture = withContext();
    const unsafePatch: EditPatch = {
      id: "agent_patch_html",
      nodeId: fixture.targetNodeId,
      op: "setText",
      value: "<strong onclick=\"alert(1)\">unsafe</strong>",
      source: "agent",
      baseRevision: fixture.contextPackage.sourceRevision,
      createdAt: "2026-04-28T00:00:01.000Z"
    };
    const unsupportedOperation = {
      ...createOperation("agent_op_unsupported", fixture.targetObjectId, fixture.contextPackage.sourceRevision, "18px"),
      op: "reorderObject",
      value: { parentId: fixture.otherObjectId, index: 0 }
    } satisfies CanvasOperation;
    const output = createEnvelope({
      contextPackageId: fixture.contextPackage.id,
      targetObjectId: fixture.targetObjectId,
      sourceRevision: fixture.contextPackage.sourceRevision,
      directions: [
        {
          id: "agent_dir_unsafe",
          name: "Unsafe raw HTML",
          description: "Attempts unsafe patch output.",
          rationale: "Bad model output.",
          targetObjectId: fixture.targetObjectId,
          operations: [unsupportedOperation],
          patches: [unsafePatch],
          provenance: "agent-output:codex",
          createdAt: "2026-04-28T00:00:01.000Z"
        },
        {
          id: "agent_dir_safe_shape",
          name: "Safe-shaped companion",
          description: "Keeps the envelope above the two-direction minimum.",
          rationale: "The whole envelope should still be rejected because one direction is unsafe.",
          targetObjectId: fixture.targetObjectId,
          operations: [createOperation("agent_op_safe_shape", fixture.targetObjectId, fixture.contextPackage.sourceRevision, "22px")],
          patches: [],
          provenance: "agent-output:codex",
          createdAt: "2026-04-28T00:00:02.000Z"
        }
      ]
    });
    const bundle = ingestAgentOutput(fixture.bundle, {
      contextPackageId: fixture.contextPackage.id,
      runtime: "codex",
      output,
      createdAt: "2026-04-28T00:00:04.000Z"
    });

    const diagnosticCodes = bundle.agentRuns[0]?.diagnostics.map((diagnostic) => diagnostic.code) ?? [];
    expect(diagnosticCodes).toContain("unsupported-operation");
    expect(diagnosticCodes).toContain("unsafe-patch");
    expect(bundle.variationSets).toHaveLength(0);
  });

  it("promotes an ingested agent direction through typed operations", () => {
    const fixture = withContext();
    let bundle = ingestAgentOutput(fixture.bundle, {
      contextPackageId: fixture.contextPackage.id,
      runtime: "codex",
      output: parseAgentOutputJson(JSON.stringify(createEnvelope({
        contextPackageId: fixture.contextPackage.id,
        targetObjectId: fixture.targetObjectId,
        sourceRevision: fixture.contextPackage.sourceRevision
      }))),
      createdAt: "2026-04-28T00:00:04.000Z"
    });
    const set = bundle.variationSets[0]!;
    const direction = set.directions.find((item) => item.name === "Agent sharper hierarchy")!;

    bundle = promoteVariationDirection(bundle, set.id, direction.id);

    expect(bundle.canvasOperations.map((operation) => operation.id)).toContain("agent_op_sharp");
    expect(bundle.variationSets[0]?.promotedDirectionId).toBe(direction.id);
    expect(bundle.variationSets[0]?.directions.find((item) => item.id === direction.id)?.status).toBe("promoted");
  });
});
