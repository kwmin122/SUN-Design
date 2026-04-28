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

  useEffect(() => {
    setName(object?.name ?? "");
  }, [object?.id, object?.name]);

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
          onClick={() => onSetLayoutConstraints({ layout: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } })}
        >
          Layout grid
        </button>
      </div>

      <div className="control-grid">
        <button type="button" onClick={() => onSetLayoutConstraints({ layout: { gap: "16px" } })}>
          Gap 16
        </button>
        <button type="button" onClick={() => onSetLayoutConstraints({ layout: { padding: "24px" } })}>
          Padding 24
        </button>
        <button type="button" onClick={() => onSetLayoutConstraints({ layout: { alignItems: "center", justifyContent: "center" } })}>
          Align center
        </button>
        <button
          type="button"
          onClick={() => onSetLayoutConstraints({ layout: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } })}
        >
          Grid 3 columns
        </button>
        <button type="button" onClick={() => onSetLayoutConstraints({ pinned: { top: true, left: true, right: false, bottom: false } })}>
          Pin top left
        </button>
        <button type="button" onClick={() => onSetLayoutConstraints({ width: 640 })}>
          Fixed width 640
        </button>
      </div>
    </section>
  );
}
