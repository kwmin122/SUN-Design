"use client";

import type { PreviewError, ProjectBundle } from "@kdesign/editor-core";

type DiagnosticsPanelProps = {
  bundle: ProjectBundle;
  diagnostics: PreviewError[];
  isPreviewReady: boolean;
};

export function DiagnosticsPanel({ bundle, diagnostics, isPreviewReady }: DiagnosticsPanelProps) {
  const bridgeDiagnostics = diagnostics.filter((diagnostic) => diagnostic.source === "bridge");
  const runtimeDiagnostics = diagnostics.filter((diagnostic) => diagnostic.source === "runtime");
  const consoleDiagnostics = diagnostics.filter((diagnostic) => diagnostic.source === "console");

  return (
    <aside className="diagnostics-panel" aria-label="Preview diagnostics">
      <h2>Preview diagnostics</h2>
      <section className="diagnostic-card" data-testid="diagnostics-readiness">
        <h3>
          Preview readiness
          <span className="diagnostic-count">{isPreviewReady ? "ready" : "pending"}</span>
        </h3>
        <p className={isPreviewReady ? "status-ready" : "status-pending"}>
          {isPreviewReady ? "ready" : "pending"}
        </p>
      </section>

      <section className="diagnostic-card" data-testid="diagnostics-sanitizer">
        <h3>
          Sanitizer changes
          <span className="diagnostic-count">{bundle.sanitizerReport.changes.length}</span>
        </h3>
        {bundle.sanitizerReport.changes.slice(0, 6).map((change) => (
          <div className="diagnostic-row" key={`${change.kind}-${change.path}-${change.target}`}>
            <code>{change.kind}</code>
            <span>{change.path} / {change.target}</span>
          </div>
        ))}
      </section>

      <DiagnosticGroup
        testId="diagnostics-bridge"
        title="Bridge validation failures"
        diagnostics={bridgeDiagnostics}
      />
      <DiagnosticGroup
        testId="diagnostics-runtime"
        title="Runtime errors"
        diagnostics={runtimeDiagnostics}
      />
      <DiagnosticGroup
        testId="diagnostics-console"
        title="Console errors"
        diagnostics={consoleDiagnostics}
      />
    </aside>
  );
}

function DiagnosticGroup({
  testId,
  title,
  diagnostics
}: {
  testId: string;
  title: string;
  diagnostics: PreviewError[];
}) {
  return (
    <section className="diagnostic-card" data-testid={testId}>
      <h3>
        {title}
        <span className="diagnostic-count">{diagnostics.length}</span>
      </h3>
      {diagnostics.map((diagnostic) => (
        <div className="diagnostic-row" key={diagnostic.id}>
          <code>{diagnostic.code}</code>
          <span>{diagnostic.message}</span>
        </div>
      ))}
    </section>
  );
}
