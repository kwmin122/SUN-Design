"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { PreviewDevice, PreviewError, PreviewNodeRect, ProjectBundle } from "@kdesign/editor-core";
import { buildPreviewDocument } from "@kdesign/preview-runtime";

import { handlePreviewMessage } from "../lib/preview-message-handler";

type PreviewFrameProps = {
  bundle: ProjectBundle;
  nonce: string;
  onReady(): void;
  onRuntimeError(error: PreviewError): void;
  onConsoleError(error: PreviewError): void;
  onBridgeFailure(error: PreviewError): void;
  onNodeRegistry(nodes: PreviewNodeRect[]): void;
  onNodeSelected(node: PreviewNodeRect): void;
  onNodeHovered(node: PreviewNodeRect): void;
  selectedNode: PreviewNodeRect | undefined;
  hoveredNode: PreviewNodeRect | undefined;
  device: PreviewDevice;
  zoom: number;
};

export function PreviewFrame({
  bundle,
  nonce,
  onReady,
  onRuntimeError,
  onConsoleError,
  onBridgeFailure,
  onNodeRegistry,
  onNodeSelected,
  onNodeHovered,
  selectedNode,
  hoveredNode,
  device,
  zoom
}: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => buildPreviewDocument({ bundle, nonce }), [bundle, nonce]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const result = handlePreviewMessage(event, {
        source: iframeRef.current?.contentWindow ?? null,
        nonce
      });

      if (result.kind === "ready") {
        onReady();
        return;
      }

      if (result.kind === "nodes") {
        onNodeRegistry(result.nodes);
        return;
      }

      if (result.kind === "select") {
        onNodeSelected(result.node);
        return;
      }

      if (result.kind === "hover") {
        onNodeHovered(result.node);
        return;
      }

      if (result.kind === "diagnostic") {
        if (result.error.source === "bridge") {
          onBridgeFailure(result.error);
        } else if (result.error.source === "runtime") {
          onRuntimeError(result.error);
        } else if (result.error.source === "console") {
          onConsoleError(result.error);
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [
    nonce,
    onReady,
    onBridgeFailure,
    onRuntimeError,
    onConsoleError,
    onNodeRegistry,
    onNodeSelected,
    onNodeHovered
  ]);

  return (
    <div
      className={`preview-frame-wrap preview-${device}`}
      data-testid="preview-frame-wrap"
      style={{ "--preview-zoom": `${zoom / 100}` } as CSSProperties}
    >
      <iframe
        ref={iframeRef}
        title="Sandboxed design preview"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        srcDoc={srcDoc}
      />
      {hoveredNode && hoveredNode.nodeId !== selectedNode?.nodeId ? (
        <SelectionOverlay node={hoveredNode} variant="hover" />
      ) : null}
      {selectedNode ? <SelectionOverlay node={selectedNode} variant="selected" /> : null}
    </div>
  );
}

function SelectionOverlay({ node, variant }: { node: PreviewNodeRect; variant: "hover" | "selected" }) {
  return (
    <div
      aria-hidden="true"
      className={variant === "selected" ? "selection-overlay selected" : "selection-overlay hover"}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        height: `${node.height}px`
      }}
    >
      {variant === "selected" ? (
        <>
          <span className="selection-handle top-left" />
          <span className="selection-handle top-right" />
          <span className="selection-handle bottom-left" />
          <span className="selection-handle bottom-right" />
        </>
      ) : null}
    </div>
  );
}
