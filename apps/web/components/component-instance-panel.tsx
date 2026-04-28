"use client";

import { useMemo, useState } from "react";
import type { CanvasGraph, CanvasObject } from "@kdesign/editor-core";

type ComponentInstancePanelProps = {
  graph: CanvasGraph;
  selectedObject: CanvasObject | undefined;
  onCreateComponent(name: string): void;
  onCreateInstance(componentId: string): void;
  onSetVariant(instanceId: string, variantId: string): void;
  onSetState(instanceId: string, state: "default" | "hover" | "pressed" | "disabled"): void;
  onSetOverride(instanceId: string, key: string, value: unknown): void;
  onDetachInstance(instanceId: string): void;
};

export function ComponentInstancePanel({
  graph,
  selectedObject,
  onCreateComponent,
  onCreateInstance,
  onSetVariant,
  onSetState,
  onSetOverride,
  onDetachInstance
}: ComponentInstancePanelProps) {
  const [componentName, setComponentName] = useState("Hero Card");
  const [labelOverride, setLabelOverride] = useState("");

  const components = useMemo(() => Object.values(graph.components), [graph.components]);
  const instances = useMemo(() => Object.values(graph.instances), [graph.instances]);
  const selectedInstance = selectedObject?.componentInstanceId
    ? graph.instances[selectedObject.componentInstanceId]
    : instances.find((instance) => instance.objectId === selectedObject?.id);
  const activeComponent = selectedInstance
    ? graph.components[selectedInstance.componentId]
    : components[0];
  const defaultVariant = activeComponent?.variants.find((variant) => variant.name === "Default") ?? activeComponent?.variants[0];
  const emphasisVariant = activeComponent?.variants.find((variant) => variant.name === "Emphasis") ?? activeComponent?.variants[1];

  return (
    <section className="tweak-card component-panel" data-testid="component-instance-panel">
      <div className="inspector-heading">
        <div>
          <h2>Components</h2>
          <p>{components.length} local components · {instances.length} instances</p>
        </div>
        <span>{selectedInstance?.detached ? "detached" : selectedInstance?.state ?? "ready"}</span>
      </div>

      <label className="field-stack">
        <span>Component name</span>
        <input
          data-testid="component-name-input"
          value={componentName}
          onChange={(event) => setComponentName(event.target.value)}
        />
      </label>

      <div className="component-controls">
        <button
          type="button"
          disabled={!selectedObject || !componentName.trim()}
          onClick={() => componentName.trim() && onCreateComponent(componentName.trim())}
        >
          Create component
        </button>
        <button
          type="button"
          disabled={!selectedObject || !activeComponent}
          onClick={() => activeComponent && onCreateInstance(activeComponent.id)}
        >
          Create instance
        </button>
      </div>

      <div className="component-controls">
        <button
          type="button"
          disabled={!selectedInstance || !defaultVariant}
          onClick={() => selectedInstance && defaultVariant && onSetVariant(selectedInstance.id, defaultVariant.id)}
        >
          Variant Default
        </button>
        <button
          type="button"
          disabled={!selectedInstance || !emphasisVariant}
          onClick={() => selectedInstance && emphasisVariant && onSetVariant(selectedInstance.id, emphasisVariant.id)}
        >
          Variant Emphasis
        </button>
      </div>

      <div className="component-controls state-controls">
        {(["default", "hover", "pressed", "disabled"] as const).map((state) => (
          <button
            key={state}
            type="button"
            disabled={!selectedInstance}
            onClick={() => selectedInstance && onSetState(selectedInstance.id, state)}
          >
            State {state}
          </button>
        ))}
      </div>

      <label className="field-stack">
        <span>Label override</span>
        <input
          data-testid="component-label-override"
          value={labelOverride}
          onChange={(event) => setLabelOverride(event.target.value)}
        />
      </label>
      <div className="component-controls">
        <button
          type="button"
          disabled={!selectedInstance || !labelOverride.trim()}
          onClick={() => selectedInstance && labelOverride.trim() && onSetOverride(selectedInstance.id, "label", labelOverride.trim())}
        >
          Apply override
        </button>
        <button
          type="button"
          disabled={!selectedInstance}
          onClick={() => selectedInstance && onDetachInstance(selectedInstance.id)}
        >
          Detach instance
        </button>
      </div>

      <div className="component-list">
        {components.length === 0 ? (
          <span>선택한 오브젝트를 로컬 컴포넌트로 저장하세요.</span>
        ) : components.map((component) => (
          <span key={component.id}>
            {component.name} · {component.variants.map((variant) => variant.name).join(" / ")}
          </span>
        ))}
      </div>
      <div className="component-list">
        {instances.length === 0 ? (
          <span>인스턴스 없음</span>
        ) : instances.map((instance) => {
          const component = graph.components[instance.componentId];
          const variant = component?.variants.find((item) => item.id === instance.variantId);
          return (
            <span key={instance.id}>
              {component?.name ?? instance.componentId} · {variant?.name ?? "Default"} · {instance.state}
              {instance.detached ? " · detached" : ""}
            </span>
          );
        })}
      </div>
    </section>
  );
}
