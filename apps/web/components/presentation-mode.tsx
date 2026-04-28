"use client";

import { useMemo, useState } from "react";
import type { CanvasGraph, PresentationState, ProjectBundle } from "@kdesign/editor-core";

type PresentationModeProps = {
  bundle: ProjectBundle;
  graph: CanvasGraph;
  state: PresentationState | null;
  selectedObjectId: string | null;
  onStart(activeObjectId?: string): void;
  onPlay(interactionId: string): void;
};

export function PresentationMode({
  bundle,
  graph,
  state,
  selectedObjectId,
  onStart,
  onPlay
}: PresentationModeProps) {
  const interactions = bundle.prototypeGraph?.interactions ?? [];
  const objects = useMemo(() => Object.values(graph.objects).filter((object) => object.parentId), [graph.objects]);
  const fallbackObjectId = selectedObjectId ?? objects[0]?.id;
  const [interactionId, setInteractionId] = useState(interactions[0]?.id ?? "");
  const activeObject = state?.activeObjectId ? graph.objects[state.activeObjectId] : undefined;
  const activeInteraction = state?.activeInteractionId
    ? interactions.find((interaction) => interaction.id === state.activeInteractionId)
    : undefined;

  return (
    <section className="tweak-card presentation-mode" data-testid="presentation-mode">
      <div className="inspector-heading">
        <div>
          <h2>Presentation</h2>
          <p>Preview-only playback state</p>
        </div>
        <span>{state?.mode ?? "idle"}</span>
      </div>
      <div className="presentation-stage">
        <strong>{activeObject?.name ?? "No active object"}</strong>
        <span>{activeInteraction ? `${activeInteraction.trigger} · ${activeInteraction.action}` : "No interaction played"}</span>
        <span>{state ? `${state.history.length} steps · ${Object.keys(state.variableValues).length} vars` : "Source bundle untouched"}</span>
      </div>
      <div className="prototype-grid">
        <label className="field-stack">
          <span>Interaction</span>
          <select value={interactionId} onChange={(event) => setInteractionId(event.target.value)}>
            <option value="">none</option>
            {interactions.map((interaction) => (
              <option key={interaction.id} value={interaction.id}>
                {interaction.trigger} · {interaction.action}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="presentation-actions">
        <button
          aria-label="Start prototype preview"
          data-testid="present-prototype-button"
          type="button"
          onClick={() => onStart(fallbackObjectId)}
        >
          Present prototype
        </button>
        <button
          type="button"
          disabled={interactions.length === 0}
          onClick={() => onPlay(interactionId || interactions[0]!.id)}
        >
          Play interaction
        </button>
      </div>
    </section>
  );
}
