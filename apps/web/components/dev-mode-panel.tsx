"use client";

import { useState } from "react";
import type { CanvasObject, DevCodeSnippetKind, ProjectBundle } from "@kdesign/editor-core";

type DevModePanelProps = {
  bundle: ProjectBundle;
  selectedObject: CanvasObject | undefined;
  onCreateInspectReport: (objectId: string) => void;
  onCreateCodeSnippet: (objectId: string, kind: DevCodeSnippetKind) => void;
  onMarkReady: (objectId: string) => void;
  onCreateVersionDiff: (objectId: string) => void;
  onCreateAssetDownload: (assetId: string) => void;
};

const SNIPPET_KINDS: DevCodeSnippetKind[] = ["css", "tailwind", "reactProps", "tokenReference"];

export function DevModePanel({
  bundle,
  selectedObject,
  onCreateInspectReport,
  onCreateCodeSnippet,
  onMarkReady,
  onCreateVersionDiff,
  onCreateAssetDownload
}: DevModePanelProps) {
  const [snippetKind, setSnippetKind] = useState<DevCodeSnippetKind>("css");
  const latestReport = selectedObject
    ? bundle.devModeReports.find((report) => report.objectId === selectedObject.id)
    : bundle.devModeReports[0];
  const latestMarker = selectedObject
    ? bundle.readyForDevMarkers.find((marker) => marker.objectId === selectedObject.id)
    : bundle.readyForDevMarkers[0];
  const assetId = latestReport?.assetIds[0] ?? bundle.assets[0]?.id ?? "asset_phase10_download";

  return (
    <section className="tweak-card phase-10-dev-mode" data-testid="phase-10-dev-mode-panel">
      <div className="inspector-heading">
        <div>
          <h2>Dev Mode</h2>
          <p>{selectedObject ? `${selectedObject.kind} · ${selectedObject.name}` : "Select a canvas object"}</p>
        </div>
        <span>{bundle.devModeReports.length} reports</span>
      </div>

      <div className="phase-10-actions">
        <button
          data-testid="phase-10-create-inspect-report"
          disabled={!selectedObject}
          type="button"
          onClick={() => selectedObject && onCreateInspectReport(selectedObject.id)}
        >
          Inspect
        </button>
        <button
          data-testid="phase-10-mark-ready"
          disabled={!selectedObject}
          type="button"
          onClick={() => selectedObject && onMarkReady(selectedObject.id)}
        >
          Ready
        </button>
        <button
          data-testid="phase-10-create-version-diff"
          disabled={!selectedObject}
          type="button"
          onClick={() => selectedObject && onCreateVersionDiff(selectedObject.id)}
        >
          Diff
        </button>
        <button
          data-testid="phase-10-create-asset-download"
          disabled={!assetId}
          type="button"
          onClick={() => assetId && onCreateAssetDownload(assetId)}
        >
          Asset
        </button>
      </div>

      <div className="phase-10-snippet-bar">
        <select
          data-testid="phase-10-code-snippet-kind"
          value={snippetKind}
          onChange={(event) => setSnippetKind(event.target.value as DevCodeSnippetKind)}
        >
          {SNIPPET_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
        </select>
        <button
          data-testid="phase-10-create-code-snippet"
          disabled={!selectedObject}
          type="button"
          onClick={() => selectedObject && onCreateCodeSnippet(selectedObject.id, snippetKind)}
        >
          Copy code
        </button>
      </div>

      <div className="dev-mode-grid">
        <article data-testid="phase-10-inspect-measurements">
          <strong>Measurements</strong>
          <span>{latestReport ? `${latestReport.measurement.bounds.width} x ${latestReport.measurement.bounds.height}` : "No report"}</span>
          <small>{latestReport ? Object.entries(latestReport.measurement.layout).map(([key, value]) => `${key}:${value}`).join(" · ") : "Run inspect"}</small>
        </article>
        <article data-testid="phase-10-token-references">
          <strong>Tokens</strong>
          <span>{latestReport?.tokenReferences.slice(0, 4).map((token) => token.name).join(" · ") || "No tokens"}</span>
        </article>
        <article data-testid="phase-10-accessibility-notes">
          <strong>Accessibility</strong>
          <span>{latestReport?.accessibilityNotes.map((note) => note.code).join(" · ") || "No notes"}</span>
        </article>
        <article data-testid="phase-10-component-metadata">
          <strong>Component</strong>
          <span>{latestReport?.componentMetadata.componentName ?? "No component"}</span>
          <small>{latestReport?.componentMetadata.overrideCount ? `${latestReport.componentMetadata.overrideCount} overrides` : ""}</small>
        </article>
        <article data-testid="phase-10-prototype-metadata">
          <strong>Prototype</strong>
          <span>{latestReport?.prototypeMetadata.interactionIds ?? "No interactions"}</span>
        </article>
        <article data-testid="phase-10-ready-state">
          <strong>Ready</strong>
          <span>{latestMarker ? `${latestMarker.status} · ${latestMarker.label}` : "Not marked"}</span>
        </article>
      </div>

      <div className="mini-list" data-testid="phase-10-code-snippets">
        <strong>Snippets</strong>
        {bundle.devCodeSnippets.length === 0 ? <span>No snippets</span> : bundle.devCodeSnippets.slice(0, 4).map((snippet) => (
          <pre className="dev-code-block" key={snippet.id}>{snippet.kind}: {snippet.code}</pre>
        ))}
      </div>
      <div className="mini-list" data-testid="phase-10-version-diff">
        <strong>Version diffs</strong>
        {bundle.versionDiffs.length === 0 ? <span>No diffs</span> : bundle.versionDiffs.slice(0, 3).map((diff) => (
          <span key={diff.id}>{diff.fromRevision} → {diff.toRevision} · {diff.changes.length} changes</span>
        ))}
      </div>
      <div className="mini-list" data-testid="phase-10-asset-downloads">
        <strong>Assets</strong>
        {bundle.assetDownloads.length === 0 ? <span>No downloads</span> : bundle.assetDownloads.slice(0, 3).map((download) => (
          <span key={download.id}>{download.filename} · {download.url}</span>
        ))}
      </div>
    </section>
  );
}
