"use client";

import { useMemo, useState } from "react";
import type { CanvasGraph, DesignSystem } from "@kdesign/editor-core";

export type ComponentPlaygroundState = {
  componentId: string;
  componentName: string;
  variantId: string | undefined;
  variantName: string;
  propValues: Record<string, unknown>;
  mode: string;
  snapshotHash: string;
};

type ComponentPlaygroundPanelProps = {
  graph: CanvasGraph | undefined;
  designSystem: DesignSystem | undefined;
  playgroundState: ComponentPlaygroundState | null;
  onCreatePlaygroundState(
    componentId: string,
    input: { variantId?: string; propValues?: Record<string, unknown>; mode?: string }
  ): void;
};

export function ComponentPlaygroundPanel({
  graph,
  designSystem,
  playgroundState,
  onCreatePlaygroundState
}: ComponentPlaygroundPanelProps) {
  const components = useMemo(() => graph ? Object.values(graph.components) : [], [graph]);
  const [componentId, setComponentId] = useState("");
  const activeComponent = components.find((component) => component.id === componentId) ?? components[0];
  const [variantId, setVariantId] = useState("");
  const [propKey, setPropKey] = useState("headline");
  const [propValue, setPropValue] = useState("Playground headline");
  const [mode, setMode] = useState("default");
  const resolvedVariantId = variantId || activeComponent?.variants[0]?.id || "";

  return (
    <section className="tweak-card component-playground-panel" data-testid="component-playground-panel">
      <div className="inspector-heading">
        <div>
          <h2>Component Playground</h2>
          <p>{components.length} components · {designSystem?.tokens.length ?? 0} tokens</p>
        </div>
        <span>{playgroundState?.mode ?? "preview"}</span>
      </div>

      {components.length === 0 ? (
        <p className="empty-inspector">먼저 Components 패널에서 로컬 컴포넌트를 만드세요.</p>
      ) : (
        <>
          <div className="playground-controls">
            <label className="field-stack">
              <span>Component</span>
              <select
                data-testid="playground-component-select"
                value={activeComponent?.id ?? ""}
                onChange={(event) => {
                  setComponentId(event.target.value);
                  setVariantId("");
                }}
              >
                {components.map((component) => (
                  <option key={component.id} value={component.id}>{component.name}</option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Variant</span>
              <select
                data-testid="playground-variant-select"
                value={resolvedVariantId}
                onChange={(event) => setVariantId(event.target.value)}
              >
                {activeComponent?.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.name}</option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Prop key</span>
              <input data-testid="playground-prop-key-input" value={propKey} onChange={(event) => setPropKey(event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Prop value</span>
              <input data-testid="playground-prop-value-input" value={propValue} onChange={(event) => setPropValue(event.target.value)} />
            </label>
            <label className="field-stack">
              <span>Mode</span>
              <input data-testid="playground-mode-input" value={mode} onChange={(event) => setMode(event.target.value)} />
            </label>
            <button
              type="button"
              onClick={() => activeComponent && onCreatePlaygroundState(activeComponent.id, {
                variantId: resolvedVariantId,
                propValues: propKey.trim() ? { [propKey.trim()]: propValue } : {},
                mode
              })}
            >
              Preview playground state
            </button>
          </div>

          <div className="playground-preview" data-testid="playground-state-summary">
            {playgroundState ? (
              <>
                <strong>{playgroundState.componentName}</strong>
                <span>{playgroundState.variantName} · {playgroundState.mode}</span>
                <span>{Object.keys(playgroundState.propValues).join(", ") || "no props"}</span>
                <span>{playgroundState.snapshotHash}</span>
              </>
            ) : (
              <span>변형과 props를 선택해 미리보기 상태를 만드세요.</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
