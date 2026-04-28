"use client";

import { useMemo, useState } from "react";
import type { CodeComponentReference, ProjectBundle } from "@kdesign/editor-core";

type CodeReferenceInput = {
  name: string;
  framework: string;
  importPath: string;
  exportName: string;
  sourcePath?: string;
  sourceUrl?: string;
  docsUrl?: string;
  storybookUrl?: string;
};

type DesignSystemPanelProps = {
  bundle: ProjectBundle;
  onExtractCandidates(): void;
  onApproveItems(itemIds: string[]): void;
  onRejectItems(itemIds: string[]): void;
  onMapToken(tokenId: string, mapping: { cssVariable?: string; tailwindClass?: string; codeReferenceId?: string }): void;
  onAddCodeReference(input: CodeReferenceInput): void;
  onPublish(label: string): void;
  onRemix(name: string): void;
  onRollback(versionId: string): void;
};

export function DesignSystemPanel({
  bundle,
  onExtractCandidates,
  onApproveItems,
  onRejectItems,
  onMapToken,
  onAddCodeReference,
  onPublish,
  onRemix,
  onRollback
}: DesignSystemPanelProps) {
  const system = bundle.designSystem;
  const tokens = system?.tokens ?? [];
  const patterns = system?.componentPatterns ?? [];
  const codeReferences = system?.codeReferences ?? [];
  const versions = system?.versions ?? [];
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [cssVariable, setCssVariable] = useState("");
  const [tailwindClass, setTailwindClass] = useState("");
  const [codeRefName, setCodeRefName] = useState("");
  const [framework, setFramework] = useState("react");
  const [importPath, setImportPath] = useState("");
  const [exportName, setExportName] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [storybookUrl, setStorybookUrl] = useState("");
  const [publishLabel, setPublishLabel] = useState("");
  const [remixName, setRemixName] = useState("");

  const activeTokenId = useMemo(() => {
    if (selectedTokenId && tokens.some((token) => token.id === selectedTokenId)) {
      return selectedTokenId;
    }
    return tokens[0]?.id ?? "";
  }, [selectedTokenId, tokens]);

  const firstVersionId = versions[0]?.id ?? "";
  const firstCodeReference = codeReferences[0] as CodeComponentReference | undefined;
  const canMapToken = Boolean(activeTokenId && (cssVariable.trim() || tailwindClass.trim() || firstCodeReference));
  const canAddCodeReference = Boolean(
    codeRefName.trim() && framework.trim() && importPath.trim() && exportName.trim()
  );
  const canPublish = Boolean(system && publishLabel.trim());
  const canRemix = Boolean(system && remixName.trim());

  return (
    <section className="tweak-card design-system-panel" data-testid="design-system-panel">
      <div className="inspector-heading">
        <div>
          <h2>Design System</h2>
          <p>{tokens.length} tokens · {patterns.length} patterns · {versions.length} versions</p>
        </div>
        <span>{system?.publishState ?? "empty"}</span>
      </div>

      <div className="system-action-bar">
        <button type="button" onClick={onExtractCandidates}>Extract candidates</button>
        <button type="button" disabled={!activeTokenId} onClick={() => activeTokenId && onApproveItems([activeTokenId])}>
          Approve selected token
        </button>
        <button type="button" disabled={!activeTokenId} onClick={() => activeTokenId && onRejectItems([activeTokenId])}>
          Reject selected token
        </button>
      </div>

      <div className="design-token-list" data-testid="design-token-list">
        <strong>Tokens</strong>
        {tokens.length === 0 ? (
          <span>후보를 추출하세요.</span>
        ) : tokens.slice(0, 16).map((token) => (
          <button
            className={token.id === activeTokenId ? "token-row selected" : "token-row"}
            key={token.id}
            type="button"
            onClick={() => setSelectedTokenId(token.id)}
          >
            <span>{token.name}</span>
            <span>{token.value}</span>
            <span>{token.status}</span>
          </button>
        ))}
      </div>

      <div className="code-ref-grid">
        <label className="field-stack">
          <span>CSS variable</span>
          <input
            data-testid="token-css-variable-input"
            placeholder="--brand-primary"
            value={cssVariable}
            onChange={(event) => setCssVariable(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Tailwind class</span>
          <input
            data-testid="token-tailwind-class-input"
            placeholder="text-brand-primary"
            value={tailwindClass}
            onChange={(event) => setTailwindClass(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!canMapToken}
          onClick={() => activeTokenId && onMapToken(activeTokenId, {
            cssVariable,
            tailwindClass,
            ...(firstCodeReference ? { codeReferenceId: firstCodeReference.id } : {})
          })}
        >
          Map token
        </button>
      </div>

      <div className="code-ref-grid">
        <label className="field-stack">
          <span>Name</span>
          <input
            data-testid="code-ref-name-input"
            placeholder="MarketingCard"
            value={codeRefName}
            onChange={(event) => setCodeRefName(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Framework</span>
          <input data-testid="code-ref-framework-input" value={framework} onChange={(event) => setFramework(event.target.value)} />
        </label>
        <label className="field-stack">
          <span>Import</span>
          <input
            data-testid="code-ref-import-input"
            placeholder="@/components/marketing-card"
            value={importPath}
            onChange={(event) => setImportPath(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Export</span>
          <input
            data-testid="code-ref-export-input"
            placeholder="MarketingCard"
            value={exportName}
            onChange={(event) => setExportName(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Source</span>
          <input
            data-testid="code-ref-source-input"
            placeholder="apps/web/components/marketing-card.tsx"
            value={sourcePath}
            onChange={(event) => setSourcePath(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Docs</span>
          <input
            data-testid="code-ref-docs-input"
            placeholder="https://..."
            value={docsUrl}
            onChange={(event) => setDocsUrl(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Storybook</span>
          <input
            data-testid="code-ref-storybook-input"
            placeholder="https://..."
            value={storybookUrl}
            onChange={(event) => setStorybookUrl(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!canAddCodeReference}
          onClick={() => onAddCodeReference({
            name: codeRefName,
            framework,
            importPath,
            exportName,
            sourcePath,
            docsUrl,
            storybookUrl
          })}
        >
          Add code reference
        </button>
      </div>

      <div className="component-pattern-list" data-testid="component-pattern-list">
        <strong>Component patterns</strong>
        {patterns.length === 0 ? <span>아직 없음</span> : patterns.slice(0, 6).map((pattern) => (
          <span key={pattern.id}>{pattern.name} · {pattern.status}</span>
        ))}
      </div>

      <div className="code-reference-list" data-testid="code-reference-list">
        <strong>Code references</strong>
        {codeReferences.length === 0 ? <span>아직 없음</span> : codeReferences.slice(0, 6).map((reference) => (
          <span key={reference.id}>{reference.name} · {reference.framework} · {reference.importPath}</span>
        ))}
      </div>

      <div className="code-ref-grid">
        <label className="field-stack">
          <span>Publish label</span>
          <input
            data-testid="publish-label-input"
            placeholder="System v1"
            value={publishLabel}
            onChange={(event) => setPublishLabel(event.target.value)}
          />
        </label>
        <label className="field-stack">
          <span>Remix name</span>
          <input
            data-testid="remix-name-input"
            placeholder="System remix"
            value={remixName}
            onChange={(event) => setRemixName(event.target.value)}
          />
        </label>
        <button type="button" disabled={!canPublish} onClick={() => onPublish(publishLabel)}>Publish system</button>
        <button type="button" disabled={!canRemix} onClick={() => onRemix(remixName)}>Remix system</button>
        <button type="button" disabled={!firstVersionId} onClick={() => firstVersionId && onRollback(firstVersionId)}>Rollback system</button>
      </div>

      <div className="design-system-version-list" data-testid="design-system-version-list">
        <strong>Versions</strong>
        {versions.length === 0 ? <span>아직 없음</span> : versions.slice(0, 5).map((version) => (
          <span className="version-row" key={version.id}>
            {version.label} · {version.tokenCount} tokens · {version.snapshotHash}
          </span>
        ))}
      </div>
    </section>
  );
}
