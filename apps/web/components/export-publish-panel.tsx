"use client";

import type { AgentRuntime, ExportKind, ProjectBundle } from "@kdesign/editor-core";

type ExportPublishPanelProps = {
  bundle: ProjectBundle;
  onCreateExport: (kind: ExportKind, diagnostics?: string[]) => void;
  onCreatePublishPreview: () => void;
  onCreateCodeRoundtrip: (runtime: AgentRuntime) => void;
  onImportRoundtripConflict: () => void;
  onLoadWorkerFixture: () => void;
};

export function ExportPublishPanel({
  bundle,
  onCreateExport,
  onCreatePublishPreview,
  onCreateCodeRoundtrip,
  onImportRoundtripConflict,
  onLoadWorkerFixture
}: ExportPublishPanelProps) {
  return (
    <section className="tweak-card phase-10-export" data-testid="phase-10-export-publish-panel">
      <div className="inspector-heading">
        <div>
          <h2>Export & Publish</h2>
          <p>Stored-state artifacts, static preview, and code-agent roundtrip.</p>
        </div>
        <span>{bundle.exportArtifacts.length} artifacts</span>
      </div>

      <div className="phase-10-actions">
        <button data-testid="phase-10-export-html" type="button" onClick={() => onCreateExport("html")}>HTML</button>
        <button data-testid="phase-10-export-zip" type="button" onClick={() => onCreateExport("zip")}>ZIP</button>
        <button data-testid="phase-10-export-png" type="button" onClick={() => onCreateExport("png")}>PNG</button>
        <button data-testid="phase-10-export-pdf" type="button" onClick={() => onCreateExport("pdf")}>PDF</button>
        <button data-testid="phase-10-export-pptx-raster" type="button" onClick={() => onCreateExport("pptx", ["web-local-record", "pptx-mode:rasterized"])}>PPTX raster</button>
        <button data-testid="phase-10-export-pptx-editable" type="button" onClick={() => onCreateExport("pptx", ["web-local-record", "pptx-mode:editableSubset"])}>PPTX editable</button>
        <button data-testid="phase-10-export-gif" type="button" onClick={() => onCreateExport("gif")}>GIF</button>
        <button data-testid="phase-10-export-mp4" type="button" onClick={() => onCreateExport("mp4")}>MP4</button>
      </div>

      <div className="phase-10-actions">
        <button data-testid="phase-10-create-publish-preview" type="button" onClick={onCreatePublishPreview}>Publish preview</button>
        <button data-testid="phase-10-create-code-roundtrip" type="button" onClick={() => onCreateCodeRoundtrip("codex")}>Codex package</button>
        <button data-testid="phase-10-import-roundtrip-conflict" type="button" onClick={onImportRoundtripConflict}>Conflict import</button>
        <button data-testid="phase-10-load-worker-export-fixture" type="button" onClick={onLoadWorkerFixture}>Load worker proof</button>
      </div>

      <div className="phase-10-record-list" data-testid="phase-10-export-artifacts">
        {bundle.exportArtifacts.length === 0 ? <span>No export artifacts</span> : bundle.exportArtifacts.slice(0, 12).map((artifact) => (
          <article className="export-artifact-row" key={artifact.id}>
            <strong>{artifact.filename}</strong>
            <span>{artifact.kind} · {artifact.viewport} · {artifact.bytes} bytes</span>
            <small>{artifact.sha256} · {artifact.diagnostics.join(", ")}</small>
          </article>
        ))}
      </div>

      <div className="phase-10-record-list" data-testid="phase-10-export-verifications">
        {bundle.exportVerifications.length === 0 ? <span>No verifications</span> : bundle.exportVerifications.slice(0, 12).map((verification) => (
          <span className={`verification-pill state-${verification.status}`} key={verification.id}>
            {verification.kind} · {verification.status} · {verification.diagnostics.join(", ")}
          </span>
        ))}
      </div>

      <div className="phase-10-record-list" data-testid="phase-10-publish-previews">
        {bundle.publishPreviews.length === 0 ? <span>No publish preview</span> : bundle.publishPreviews.slice(0, 4).map((preview) => (
          <article className="publish-preview-row" key={preview.id}>
            <strong>{preview.url}</strong>
            <span>{preview.status} · {preview.artifactIds.length} artifacts</span>
          </article>
        ))}
      </div>

      <div className="phase-10-record-list" data-testid="phase-10-code-roundtrip-results">
        {[...bundle.codeRoundtripPackages, ...bundle.codeRoundtripImports].length === 0 ? <span>No roundtrip records</span> : (
          <>
            {bundle.codeRoundtripPackages.slice(0, 4).map((item) => (
              <article className="roundtrip-result-row" key={item.id}>
                <strong>{item.runtime} package</strong>
                <span>{item.artifactIds.length} artifacts · {item.sourceRevision}</span>
                <small>{item.manifestJson}</small>
              </article>
            ))}
            {bundle.codeRoundtripImports.slice(0, 4).map((item) => (
              <article className={`roundtrip-result-row state-${item.status}`} key={item.id}>
                <strong>{item.status}</strong>
                <span>{item.runtime} · {item.sourceRevision}</span>
                <small>{item.diagnostics.join(", ")}</small>
              </article>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
