"use client";

import { useEffect, useMemo, useState } from "react";
import type { CanvasGraph, CanvasObject } from "@kdesign/editor-core";

type ComponentInstancePanelProps = {
  graph: CanvasGraph;
  selectedObject: CanvasObject | undefined;
  onCreateComponent(name: string, options: { propNames: string[]; variantNames: string[] }): void;
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
  const [componentName, setComponentName] = useState("");
  const [propNames, setPropNames] = useState("name");
  const [variantName, setVariantName] = useState("");
  const [overrideKey, setOverrideKey] = useState("name");
  const [overrideValue, setOverrideValue] = useState("");

  const components = useMemo(() => Object.values(graph.components), [graph.components]);
  const instances = useMemo(() => Object.values(graph.instances), [graph.instances]);
  const selectedInstance = selectedObject?.componentInstanceId
    ? graph.instances[selectedObject.componentInstanceId]
    : instances.find((instance) => instance.objectId === selectedObject?.id);
  const activeComponent = selectedInstance
    ? graph.components[selectedInstance.componentId]
    : components[0];

  useEffect(() => {
    setComponentName((current) => current || (selectedObject?.name ?? ""));
  }, [selectedObject?.id, selectedObject?.name]);

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
      <label className="field-stack">
        <span>Props</span>
        <input
          data-testid="component-prop-input"
          placeholder="name, headline, image"
          value={propNames}
          onChange={(event) => setPropNames(event.target.value)}
        />
      </label>
      <label className="field-stack">
        <span>Initial variant</span>
        <input
          data-testid="component-variant-input"
          placeholder="Desktop, Compact, Mobile..."
          value={variantName}
          onChange={(event) => setVariantName(event.target.value)}
        />
      </label>

      <div className="component-controls">
        <button
          type="button"
          disabled={!selectedObject || !componentName.trim()}
          onClick={() => componentName.trim() && onCreateComponent(componentName.trim(), {
            propNames: parseNames(propNames),
            variantNames: variantName.trim() ? [variantName.trim()] : []
          })}
        >
          Create component
        </button>
        <button
          type="button"
          disabled={!selectedObject || !activeComponent || Boolean(selectedInstance)}
          onClick={() => activeComponent && onCreateInstance(activeComponent.id)}
        >
          Create instance
        </button>
      </div>

      {activeComponent ? (
        <div className="component-controls variant-controls">
          {activeComponent.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              disabled={!selectedInstance}
              onClick={() => selectedInstance && onSetVariant(selectedInstance.id, variant.id)}
            >
              Variant {variant.name}
            </button>
          ))}
        </div>
      ) : null}

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
        <span>Override key</span>
        <input
          data-testid="component-override-key-input"
          value={overrideKey}
          onChange={(event) => setOverrideKey(event.target.value)}
        />
      </label>
      <label className="field-stack">
        <span>Override value</span>
        <input
          data-testid="component-override-value-input"
          value={overrideValue}
          onChange={(event) => setOverrideValue(event.target.value)}
        />
      </label>
      <div className="component-controls">
        <button
          type="button"
          disabled={!selectedInstance || !overrideKey.trim() || !overrideValue.trim()}
          onClick={() => selectedInstance && overrideKey.trim() && overrideValue.trim() && onSetOverride(selectedInstance.id, overrideKey.trim(), overrideValue.trim())}
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
              {component?.name ?? instance.componentId} · {variant?.name ?? "Base"} · {instance.state}
              {instance.detached ? " · detached" : ""}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function parseNames(value: string): string[] {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}
