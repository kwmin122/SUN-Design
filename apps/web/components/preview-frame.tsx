"use client";

import { useEffect, useMemo, useRef } from "react";
import type { PreviewError, ProjectBundle } from "@kdesign/editor-core";
import { buildPreviewDocument } from "@kdesign/preview-runtime";

import { handlePreviewMessage } from "../lib/preview-message-handler";

type PreviewFrameProps = {
  bundle: ProjectBundle;
  nonce: string;
  onReady(): void;
  onRuntimeError(error: PreviewError): void;
  onConsoleError(error: PreviewError): void;
  onBridgeFailure(error: PreviewError): void;
};

export function PreviewFrame({
  bundle,
  nonce,
  onReady,
  onRuntimeError,
  onConsoleError,
  onBridgeFailure
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
  }, [nonce, onReady, onBridgeFailure, onRuntimeError, onConsoleError]);

  return (
    <div className="preview-frame-wrap">
      <iframe
        ref={iframeRef}
        title="Sandboxed design preview"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        srcDoc={srcDoc}
      />
    </div>
  );
}
