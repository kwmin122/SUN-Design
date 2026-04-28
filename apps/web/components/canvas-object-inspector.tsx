"use client";

import { useEffect, useState } from "react";
import type { CanvasConstraints, CanvasObject } from "@kdesign/editor-core";

type CanvasObjectInspectorProps = {
  object: CanvasObject | undefined;
  nodeKind: string | undefined;
  nodeTagName: string | undefined;
  onSetName(name: string): void;
  onSetLayoutConstraints(constraints: CanvasConstraints): void;
  onSetHidden(hidden: boolean): void;
  onSetLocked(locked: boolean): void;
};

export function CanvasObjectInspector({
  object,
  nodeKind,
  nodeTagName,
  onSetName,
  onSetLayoutConstraints,
  onSetHidden,
  onSetLocked
}: CanvasObjectInspectorProps) {
  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [gap, setGap] = useState("");
  const [padding, setPadding] = useState("");
  const [columns, setColumns] = useState("");
  const [breakpoint, setBreakpoint] = useState("");

  useEffect(() => {
    setName(object?.name ?? "");
  }, [object?.id, object?.name]);

  useEffect(() => {
    setWidth(object?.constraints?.width ? String(object.constraints.width) : "");
    setGap(object?.constraints?.layout?.gap ?? "");
    setPadding(object?.constraints?.layout?.padding ?? "");
    setColumns(readGridColumns(object?.constraints?.layout?.gridTemplateColumns));
    setBreakpoint(object?.constraints?.layout?.breakpoint ?? "");
  }, [object?.id]);

  if (!object) {
    return (
      <section className="tweak-card object-inspector" data-testid="canvas-object-inspector">
        <h2>Canvas Object</h2>
        <p className="empty-inspector">오브젝트를 선택하세요</p>
      </section>
    );
  }

  return (
    <section className="tweak-card object-inspector" data-testid="canvas-object-inspector">
      <div className="inspector-heading">
        <div>
          <h2>Canvas Object</h2>
          <p>{object.kind} / {object.name}</p>
        </div>
        <span>{nodeKind ?? object.kind}{nodeTagName ? ` · ${nodeTagName}` : ""}</span>
      </div>

      <label className="field-stack">
        <span>Object name</span>
        <input
          data-testid="object-name-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) {
              onSetName(name.trim());
            }
          }}
        />
      </label>
      <button className="quality-button" type="button" onClick={() => name.trim() && onSetName(name.trim())}>
        Rename object
      </button>

      <div className="object-state-row">
        <button type="button" onClick={() => onSetHidden(!object.hidden)}>
          {object.hidden ? "Show object" : "Hide object"}
        </button>
        <button type="button" onClick={() => onSetLocked(!object.locked)}>
          {object.locked ? "Unlock object" : "Lock object"}
        </button>
      </div>

      <div className="segmented-control object-layout-modes" aria-label="Layout mode">
        <button type="button" onClick={() => onSetLayoutConstraints({ layout: { display: "block" } })}>
          Layout block
        </button>
        <button type="button" onClick={() => onSetLayoutConstraints({ layout: { display: "flex" } })}>
          Layout flex
        </button>
        <button
          type="button"
          onClick={() => onSetLayoutConstraints({ layout: { display: "grid", ...(toGridColumns(columns) ? { gridTemplateColumns: toGridColumns(columns) } : {}) } })}
        >
          Layout grid
        </button>
      </div>

      <div className="layout-input-grid">
        <label className="field-stack">
          <span>Gap</span>
          <input
            data-testid="layout-gap-input"
            placeholder="16px"
            value={gap}
            onChange={(event) => setGap(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Padding</span>
          <input
            data-testid="layout-padding-input"
            placeholder="24px"
            value={padding}
            onChange={(event) => setPadding(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Grid columns</span>
          <input
            data-testid="layout-columns-input"
            inputMode="numeric"
            placeholder="3"
            value={columns}
            onChange={(event) => setColumns(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Breakpoint</span>
          <input
            data-testid="layout-breakpoint-input"
            placeholder="768px"
            value={breakpoint}
            onChange={(event) => setBreakpoint(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Width</span>
          <input
            data-testid="layout-width-input"
            inputMode="numeric"
            placeholder="640"
            value={width}
            onChange={(event) => setWidth(event.target.value)}
          />
        </label>
      </div>

      <div className="control-grid">
        <button type="button" onClick={() => gap.trim() && onSetLayoutConstraints({ layout: { gap: gap.trim() } })}>
          Apply gap
        </button>
        <button type="button" onClick={() => padding.trim() && onSetLayoutConstraints({ layout: { padding: padding.trim() } })}>
          Apply padding
        </button>
        <button type="button" onClick={() => {
          const gridTemplateColumns = toGridColumns(columns);
          if (gridTemplateColumns) {
            onSetLayoutConstraints({ layout: { display: "grid", gridTemplateColumns } });
          }
        }}>
          Apply grid columns
        </button>
        <button type="button" onClick={() => breakpoint.trim() && onSetLayoutConstraints({ layout: { breakpoint: breakpoint.trim() } })}>
          Apply breakpoint
        </button>
        <button type="button" onClick={() => {
          const parsedWidth = Number(width);
          if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
            onSetLayoutConstraints({ width: parsedWidth });
          }
        }}>
          Apply width
        </button>
        <button type="button" onClick={() => onSetLayoutConstraints({ layout: { alignItems: "center", justifyContent: "center" } })}>
          Align center
        </button>
        <button type="button" onClick={() => onSetLayoutConstraints({ pinned: { top: true, left: true, right: false, bottom: false } })}>
          Pin top left
        </button>
      </div>
    </section>
  );
}

function readGridColumns(value: string | undefined): string {
  const match = value?.match(/^repeat\((\d+),/);
  return match?.[1] ?? "";
}

function toGridColumns(value: string): string | undefined {
  const count = Number(value);
  if (!Number.isInteger(count) || count <= 0 || count > 12) {
    return undefined;
  }
  return `repeat(${count}, minmax(0, 1fr))`;
}
