"use client";

import { useMemo, useState } from "react";
import type { AgentRuntime, CanvasGraph, ProjectBundle } from "@kdesign/editor-core";

type VariationComparePanelProps = {
  bundle: ProjectBundle;
  graph: CanvasGraph;
  selectedObjectId: string | null;
  onCreateRemix(prompt: string, targetObjectId: string): void;
  onCreateAgentContext(input: { runtime: AgentRuntime; targetObjectId: string; prompt: string }): void;
  onIngestAgentOutput(input: { contextPackageId: string; runtime: AgentRuntime; outputJson: string }): void;
  onPromote(variationSetId: string, directionId: string): void;
  onExportRecipe(input: {
    runtime: AgentRuntime;
    targetObjectId: string;
    prompt: string;
    variationSetId?: string;
    directionId?: string;
  }): void;
};

const RUNTIMES: AgentRuntime[] = ["codex", "claudeCode", "cursor", "localAgent", "webAgent"];

export function VariationComparePanel({
  bundle,
  graph,
  selectedObjectId,
  onCreateRemix,
  onCreateAgentContext,
  onIngestAgentOutput,
  onPromote,
  onExportRecipe
}: VariationComparePanelProps) {
  const objects = useMemo(() => Object.values(graph.objects).filter((object) => object.parentId), [graph.objects]);
  const fallbackObjectId = selectedObjectId ?? objects[0]?.id ?? "";
  const selectedObject = fallbackObjectId ? graph.objects[fallbackObjectId] : undefined;
  const activeSet = bundle.variationSets[0];
  const [prompt, setPrompt] = useState("선택한 영역을 더 명확한 high fidelity 구성으로 다듬어줘");
  const [runtime, setRuntime] = useState<AgentRuntime>("codex");
  const [selectedDirectionId, setSelectedDirectionId] = useState("");
  const [agentOutputJson, setAgentOutputJson] = useState("");
  const activeDirectionId = selectedDirectionId || activeSet?.directions[0]?.id || "";
  const latestContextPackage = bundle.agentContextPackages[0];
  const latestAgentRun = bundle.agentRuns[0];

  return (
    <section className="tweak-card variation-compare-panel" data-testid="variation-compare-panel">
      <div className="inspector-heading">
        <div>
          <h2>Variations</h2>
          <p>{bundle.variationSets.length} sets · {bundle.agentRecipes.length} recipes</p>
        </div>
        <span>{selectedObject?.kind ?? "none"}</span>
      </div>

      <div className="selected-region-summary">
        <strong>{selectedObject?.name ?? "Select a canvas object"}</strong>
        <span>{fallbackObjectId || "no target"}</span>
      </div>
      <label className="field-stack">
        <span>Localized remix prompt</span>
        <textarea
          aria-label="Localized remix request"
          data-testid="localized-remix-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <button
        className="quality-button"
        type="button"
        disabled={!fallbackObjectId}
        onClick={() => onCreateRemix(prompt, fallbackObjectId)}
      >
        Create localized remix
      </button>
      <div className="presentation-actions">
        <button
          data-testid="create-agent-context-button"
          type="button"
          disabled={!fallbackObjectId}
          onClick={() => onCreateAgentContext({ runtime, targetObjectId: fallbackObjectId, prompt })}
        >
          Create agent context
        </button>
        <select
          data-testid="agent-runtime-select"
          value={runtime}
          onChange={(event) => setRuntime(event.target.value as AgentRuntime)}
        >
          {RUNTIMES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="agent-context-list" data-testid="agent-context-list">
        <strong>Agent context</strong>
        {bundle.agentContextPackages.length === 0 ? <span>아직 없음</span> : bundle.agentContextPackages.slice(0, 3).map((contextPackage) => (
          <span key={contextPackage.id}>
            {contextPackage.id} · {contextPackage.runtime ?? "runtime-open"} · {contextPackage.selectedObject.name} · {contextPackage.instructionsPath}
          </span>
        ))}
      </div>

      <label className="field-stack">
        <span>Paste agent output JSON</span>
        <textarea
          aria-label="Paste agent output JSON"
          className="agent-output-json"
          data-testid="agent-output-json-input"
          value={agentOutputJson}
          onChange={(event) => setAgentOutputJson(event.target.value)}
        />
      </label>
      <button
        className="quality-button"
        data-testid="ingest-agent-output-button"
        type="button"
        disabled={!latestContextPackage || !agentOutputJson.trim()}
        onClick={() => latestContextPackage && onIngestAgentOutput({
          contextPackageId: latestContextPackage.id,
          runtime,
          outputJson: agentOutputJson
        })}
      >
        Ingest agent output
      </button>
      <div className="agent-output-diagnostics" data-testid="agent-output-diagnostics">
        <strong>Agent validation</strong>
        {latestAgentRun ? (
          <>
            <span>{latestAgentRun.status}</span>
            {latestAgentRun.diagnostics.length === 0 ? <span>no diagnostics</span> : latestAgentRun.diagnostics.map((diagnostic) => (
              <span key={diagnostic.id}>{diagnostic.code} · {diagnostic.message}</span>
            ))}
          </>
        ) : <span>not run</span>}
      </div>

      <div className="variation-direction-list" data-testid="variation-direction-list">
        {activeSet?.directions.length ? activeSet.directions.map((direction) => (
          <button
            className={activeDirectionId === direction.id ? "variation-direction-card active" : "variation-direction-card"}
            data-provenance={direction.provenance}
            key={direction.id}
            type="button"
            onClick={() => setSelectedDirectionId(direction.id)}
          >
            <strong>{direction.name}</strong>
            <span>{direction.description}</span>
            <small>{direction.operations.length + direction.patches.length} typed ops · {direction.status} · {direction.provenance}</small>
          </button>
        )) : <span>아직 variation 없음</span>}
      </div>

      <div className="presentation-actions">
        <button
          type="button"
          disabled={!activeSet || !activeDirectionId}
          onClick={() => activeSet && onPromote(activeSet.id, activeDirectionId)}
        >
          Promote variation
        </button>
      </div>
      <button
        className="quality-button"
        aria-label="Create agent recipe"
        data-testid="export-agent-recipe-button"
        type="button"
        disabled={!fallbackObjectId}
        onClick={() => onExportRecipe({
          runtime,
          targetObjectId: fallbackObjectId,
          prompt,
          ...(activeSet ? { variationSetId: activeSet.id } : {}),
          ...(activeDirectionId ? { directionId: activeDirectionId } : {})
        })}
      >
        Export agent recipe
      </button>

      <div className="agent-recipe-list" data-testid="agent-recipe-list">
        <strong>Recipes</strong>
        {bundle.agentRecipes.length === 0 ? <span>아직 없음</span> : bundle.agentRecipes.slice(0, 5).map((recipe) => (
          <span key={recipe.id}>{recipe.runtime} · {recipe.instructionsPath} · {recipe.operationIds.length} ops</span>
        ))}
      </div>
    </section>
  );
}
