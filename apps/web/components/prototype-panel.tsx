"use client";

import { useMemo, useState } from "react";
import type {
  CanvasGraph,
  ComponentStateRule,
  PrototypeActionKind,
  PrototypeInteraction,
  PrototypeTrigger,
  PrototypeVariable,
  ProjectBundle
} from "@kdesign/editor-core";

type PrototypePanelProps = {
  bundle: ProjectBundle;
  graph: CanvasGraph;
  selectedObjectId: string | null;
  onAddVariable(input: {
    name: string;
    kind: PrototypeVariable["kind"];
    defaultValue: unknown;
    sharedComponentId?: string;
  }): void;
  onAddInteraction(input: {
    sourceObjectId: string;
    trigger: PrototypeTrigger;
    action: PrototypeActionKind;
    targetObjectId?: string;
    variableId?: string;
    value?: unknown;
    key?: string;
    delayMs?: number;
    conditions?: PrototypeInteraction["conditions"];
  }): void;
  onAddStateRule(input: Omit<ComponentStateRule, "id" | "conditions" | "variableBindings"> & {
    variableBindings?: ComponentStateRule["variableBindings"];
  }): void;
};

const TRIGGERS: PrototypeTrigger[] = ["click", "hover", "tap", "keyboard", "timed"];
const ACTIONS: PrototypeActionKind[] = ["navigateTo", "setComponentState", "setVariable", "toggleVariable", "openOverlay", "closeOverlay"];
const STATES = ["default", "hover", "pressed", "disabled"] as const;

export function PrototypePanel({
  bundle,
  graph,
  selectedObjectId,
  onAddVariable,
  onAddInteraction,
  onAddStateRule
}: PrototypePanelProps) {
  const objects = useMemo(() => Object.values(graph.objects).filter((object) => object.parentId), [graph.objects]);
  const variables = bundle.prototypeGraph?.variables ?? [];
  const interactions = bundle.prototypeGraph?.interactions ?? [];
  const components = useMemo(() => Object.values(graph.components), [graph.components]);
  const selectedObject = selectedObjectId ? graph.objects[selectedObjectId] : undefined;
  const fallbackObjectId = selectedObject?.id ?? objects[0]?.id ?? graph.rootObjectIds[0] ?? "";

  const [variableName, setVariableName] = useState("Prototype ready");
  const [variableKind, setVariableKind] = useState<PrototypeVariable["kind"]>("boolean");
  const [trigger, setTrigger] = useState<PrototypeTrigger>("click");
  const [action, setAction] = useState<PrototypeActionKind>("navigateTo");
  const [sourceObjectId, setSourceObjectId] = useState(fallbackObjectId);
  const [targetObjectId, setTargetObjectId] = useState(fallbackObjectId);
  const [variableId, setVariableId] = useState("");
  const [key, setKey] = useState("Enter");
  const [delayMs, setDelayMs] = useState(600);
  const [componentId, setComponentId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [state, setState] = useState<ComponentStateRule["state"]>("hover");

  const activeSourceObjectId = sourceObjectId || fallbackObjectId;
  const activeTargetObjectId = targetObjectId || fallbackObjectId;
  const activeComponent = graph.components[componentId] ?? components[0];

  return (
    <section className="tweak-card prototype-panel" data-testid="prototype-panel">
      <div className="inspector-heading">
        <div>
          <h2>Prototype</h2>
          <p>{interactions.length} interactions · {variables.length} variables</p>
        </div>
        <span>{selectedObject?.name ?? "no selection"}</span>
      </div>

      <div className="prototype-grid">
        <label className="field-stack">
          <span>Variable name</span>
          <input
            data-testid="prototype-variable-name-input"
            value={variableName}
            onChange={(event) => setVariableName(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Kind</span>
          <select
            data-testid="prototype-variable-kind-select"
            value={variableKind}
            onChange={(event) => setVariableKind(event.target.value as PrototypeVariable["kind"])}
          >
            <option value="boolean">boolean</option>
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="mode">mode</option>
          </select>
        </label>
      </div>
      <button
        className="quality-button"
        data-testid="prototype-variable-add"
        type="button"
        onClick={() => onAddVariable({
          name: variableName,
          kind: variableKind,
          defaultValue: defaultValueForKind(variableKind),
          ...(activeComponent ? { sharedComponentId: activeComponent.id } : {})
        })}
      >
        Add variable
      </button>

      <div className="prototype-grid">
        <label className="field-stack">
          <span>Source</span>
          <select value={activeSourceObjectId} onChange={(event) => setSourceObjectId(event.target.value)}>
            {objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}
          </select>
        </label>
        <label className="field-stack">
          <span>Target</span>
          <select value={activeTargetObjectId} onChange={(event) => setTargetObjectId(event.target.value)}>
            {objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}
          </select>
        </label>
        <label className="field-stack">
          <span>Trigger</span>
          <select
            data-testid="prototype-trigger-select"
            value={trigger}
            onChange={(event) => setTrigger(event.target.value as PrototypeTrigger)}
          >
            {TRIGGERS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="field-stack">
          <span>Action</span>
          <select
            data-testid="prototype-action-select"
            value={action}
            onChange={(event) => setAction(event.target.value as PrototypeActionKind)}
          >
            {ACTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="prototype-grid">
        <label className="field-stack">
          <span>Variable</span>
          <select
            data-testid="prototype-variable-select"
            value={variableId}
            onChange={(event) => setVariableId(event.target.value)}
          >
            <option value="">none</option>
            {variables.map((variable) => <option key={variable.id} value={variable.id}>{variable.name}</option>)}
          </select>
        </label>
        <label className="field-stack">
          <span>Key</span>
          <input value={key} onChange={(event) => setKey(event.target.value)} />
        </label>
        <label className="field-stack">
          <span>Delay ms</span>
          <input
            min={1}
            type="number"
            value={delayMs}
            onChange={(event) => setDelayMs(Number(event.target.value))}
          />
        </label>
        <label className="field-stack">
          <span>State value</span>
          <select value={state} onChange={(event) => setState(event.target.value as ComponentStateRule["state"])}>
            {STATES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <button
        className="quality-button"
        type="button"
        disabled={!activeSourceObjectId}
        onClick={() => onAddInteraction({
          sourceObjectId: activeSourceObjectId,
          trigger,
          action,
          ...(requiresTarget(action) ? { targetObjectId: activeTargetObjectId } : {}),
          ...(trigger === "keyboard" ? { key } : {}),
          ...(trigger === "timed" ? { delayMs } : {}),
          ...(requiresVariable(action) && variableId ? { variableId } : {}),
          ...(action === "setVariable" ? { value: defaultValueForKind(variables.find((variable) => variable.id === variableId)?.kind ?? "boolean") } : {}),
          ...(action === "setComponentState" ? { targetObjectId: activeTargetObjectId, value: state } : {})
        })}
      >
        Add interaction
      </button>

      <div className="prototype-grid">
        <label className="field-stack">
          <span>Component</span>
          <select value={activeComponent?.id ?? ""} onChange={(event) => setComponentId(event.target.value)}>
            {components.length === 0 ? <option value="">none</option> : null}
            {components.map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}
          </select>
        </label>
        <label className="field-stack">
          <span>Variant</span>
          <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
            <option value="">base</option>
            {activeComponent?.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
          </select>
        </label>
      </div>
      <button
        className="quality-button"
        type="button"
        disabled={!activeComponent}
        onClick={() => activeComponent && onAddStateRule({
          componentId: activeComponent.id,
          ...(variantId ? { variantId } : {}),
          state,
          variableBindings: variableId ? { [variableId]: defaultValueForKind(variables.find((variable) => variable.id === variableId)?.kind ?? "boolean") } : {}
        })}
      >
        Add state rule
      </button>

      <div className="prototype-interaction-list" data-testid="prototype-interaction-list">
        <strong>Interactions</strong>
        {interactions.length === 0 ? <span>아직 없음</span> : interactions.map((interaction) => (
          <span key={interaction.id}>
            {interaction.trigger} · {interaction.action} · {graph.objects[interaction.sourceObjectId]?.name ?? interaction.sourceObjectId}
          </span>
        ))}
      </div>
    </section>
  );
}

function defaultValueForKind(kind: PrototypeVariable["kind"]): unknown {
  if (kind === "number") {
    return 1;
  }
  if (kind === "string" || kind === "mode") {
    return "default";
  }
  return false;
}

function requiresTarget(action: PrototypeActionKind): boolean {
  return action === "navigateTo" || action === "openOverlay" || action === "setComponentState";
}

function requiresVariable(action: PrototypeActionKind): boolean {
  return action === "setVariable" || action === "toggleVariable";
}
