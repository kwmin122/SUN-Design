"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { CanvasGraph, CanvasObject } from "@kdesign/editor-core";

type CanvasLayerTreeProps = {
  graph: CanvasGraph;
  selectedObjectId: string | null;
  onSelectObject(objectId: string): void;
  onRenameObject(objectId: string, name: string): void;
  onSetHidden(objectId: string, hidden: boolean): void;
  onSetLocked(objectId: string, locked: boolean): void;
  onReorderObject(objectId: string, parentId: string, index: number): void;
  onGroupSelection(objectIds: string[]): void;
  onUngroupObject(objectId: string): void;
};

export function CanvasLayerTree({
  graph,
  selectedObjectId,
  onSelectObject,
  onRenameObject,
  onSetHidden,
  onSetLocked,
  onReorderObject,
  onGroupSelection,
  onUngroupObject
}: CanvasLayerTreeProps) {
  const [renameObjectId, setRenameObjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [groupSelection, setGroupSelection] = useState<string[]>([]);

  const selectableObjects = useMemo(
    () => Object.values(graph.objects).filter((object) => object.parentId),
    [graph.objects]
  );

  const startRename = (object: CanvasObject) => {
    setRenameObjectId(object.id);
    setRenameValue(object.name);
  };

  const commitRename = () => {
    if (!renameObjectId || !renameValue.trim()) {
      setRenameObjectId(null);
      return;
    }
    onRenameObject(renameObjectId, renameValue.trim());
    setRenameObjectId(null);
  };

  const toggleGroupSelection = (objectId: string) => {
    setGroupSelection((current) =>
      current.includes(objectId)
        ? current.filter((id) => id !== objectId)
        : [...current, objectId]
    );
  };

  return (
    <section className="layers-panel" data-testid="canvas-layer-tree" aria-label="Canvas layer tree">
      <div className="panel-heading">
        <div>
          <h2>Layers</h2>
          <p>{selectableObjects.length} canvas objects</p>
        </div>
        <button
          type="button"
          onClick={() => onGroupSelection(groupSelection)}
          disabled={groupSelection.length < 2}
        >
          Group selected
        </button>
      </div>
      <div className="layer-tree">
        {graph.rootObjectIds.map((rootId) => (
          <LayerRow
            key={rootId}
            graph={graph}
            objectId={rootId}
            depth={0}
            selectedObjectId={selectedObjectId}
            renameObjectId={renameObjectId}
            renameValue={renameValue}
            groupSelection={groupSelection}
            onRenameValue={setRenameValue}
            onCommitRename={commitRename}
            onStartRename={startRename}
            onSelectObject={onSelectObject}
            onSetHidden={onSetHidden}
            onSetLocked={onSetLocked}
            onReorderObject={onReorderObject}
            onUngroupObject={onUngroupObject}
            onToggleGroupSelection={toggleGroupSelection}
          />
        ))}
      </div>
    </section>
  );
}

type LayerRowProps = {
  graph: CanvasGraph;
  objectId: string;
  depth: number;
  selectedObjectId: string | null;
  renameObjectId: string | null;
  renameValue: string;
  groupSelection: string[];
  onRenameValue(value: string): void;
  onCommitRename(): void;
  onStartRename(object: CanvasObject): void;
  onSelectObject(objectId: string): void;
  onSetHidden(objectId: string, hidden: boolean): void;
  onSetLocked(objectId: string, locked: boolean): void;
  onReorderObject(objectId: string, parentId: string, index: number): void;
  onUngroupObject(objectId: string): void;
  onToggleGroupSelection(objectId: string): void;
};

function LayerRow({
  graph,
  objectId,
  depth,
  selectedObjectId,
  renameObjectId,
  renameValue,
  groupSelection,
  onRenameValue,
  onCommitRename,
  onStartRename,
  onSelectObject,
  onSetHidden,
  onSetLocked,
  onReorderObject,
  onUngroupObject,
  onToggleGroupSelection
}: LayerRowProps) {
  const object = graph.objects[objectId];
  if (!object) {
    return null;
  }

  const parent = object.parentId ? graph.objects[object.parentId] : undefined;
  const siblingIndex = parent ? parent.childIds.indexOf(object.id) : -1;
  const isSelected = selectedObjectId === object.id;
  const canReorder = Boolean(parent);
  const canGroup = Boolean(object.parentId);

  return (
    <div className="layer-node">
      <div
        className={isSelected ? "layer-row selected" : "layer-row"}
        data-testid={`layer-row-${object.id}`}
        style={{ "--layer-depth": depth } as CSSProperties}
      >
        {canGroup ? (
          <input
            aria-label={`Select ${object.name} for group`}
            checked={groupSelection.includes(object.id)}
            onChange={() => onToggleGroupSelection(object.id)}
            type="checkbox"
          />
        ) : <span className="layer-check-spacer" />}
        <button className="layer-main" type="button" onClick={() => onSelectObject(object.id)}>
          <span className="layer-kind">{object.kind}</span>
          {renameObjectId === object.id ? (
            <input
              autoFocus
              data-testid="layer-rename-input"
              value={renameValue}
              onChange={(event) => onRenameValue(event.target.value)}
              onBlur={onCommitRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onCommitRename();
                }
              }}
            />
          ) : (
            <span>{object.name}</span>
          )}
        </button>
        <div className="layer-actions">
          <button type="button" aria-label="Rename layer" onClick={() => onStartRename(object)}>
            Edit
          </button>
          <button type="button" aria-label={object.hidden ? "Show layer" : "Hide layer"} onClick={() => onSetHidden(object.id, !object.hidden)}>
            {object.hidden ? "Show" : "Hide"}
          </button>
          <button type="button" aria-label={object.locked ? "Unlock layer" : "Lock layer"} onClick={() => onSetLocked(object.id, !object.locked)}>
            {object.locked ? "Unlock" : "Lock"}
          </button>
          <button
            type="button"
            aria-label="Move layer up"
            disabled={!canReorder || siblingIndex <= 0}
            onClick={() => parent && onReorderObject(object.id, parent.id, siblingIndex - 1)}
          >
            Up
          </button>
          <button
            type="button"
            aria-label="Move layer down"
            disabled={!canReorder || !parent || siblingIndex >= parent.childIds.length - 1}
            onClick={() => parent && onReorderObject(object.id, parent.id, siblingIndex + 1)}
          >
            Down
          </button>
          <button
            type="button"
            aria-label="Ungroup layer"
            disabled={!object.id.startsWith("obj_group_") || object.kind !== "frame" || object.childIds.length === 0}
            onClick={() => onUngroupObject(object.id)}
          >
            Ungroup
          </button>
        </div>
      </div>
      {object.childIds.length > 0 ? (
        <div className="layer-children">
          {object.childIds.map((childId) => (
            <LayerRow
              key={childId}
              graph={graph}
              objectId={childId}
              depth={depth + 1}
              selectedObjectId={selectedObjectId}
              renameObjectId={renameObjectId}
              renameValue={renameValue}
              groupSelection={groupSelection}
              onRenameValue={onRenameValue}
              onCommitRename={onCommitRename}
              onStartRename={onStartRename}
              onSelectObject={onSelectObject}
              onSetHidden={onSetHidden}
              onSetLocked={onSetLocked}
              onReorderObject={onReorderObject}
              onUngroupObject={onUngroupObject}
              onToggleGroupSelection={onToggleGroupSelection}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
