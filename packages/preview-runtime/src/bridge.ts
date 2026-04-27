import type { ProjectBundle } from "@kdesign/editor-core";

export function createPreviewNonce(): string {
  const crypto = globalThis.crypto;

  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  if (crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return `nonce_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  throw new Error("Web Crypto API is required to create preview nonces.");
}

export function createPreviewBridgeScript(input: {
  nonce: string;
  documentId: string;
  nodeCount: number;
}): string {
  const nonce = JSON.stringify(input.nonce);
  const documentId = JSON.stringify(input.documentId);
  const nodeCount = JSON.stringify(input.nodeCount);

  return `(() => {
  const nonce = ${nonce};
  const documentId = ${documentId};
  const nodeCount = ${nodeCount};

  const post = (payload) => {
    parent.postMessage(payload, "*");
  };

  post({ type: "preview.ready", nonce, documentId, nodeCount });

  const stringifyArgs = (args) => args.map((arg) => {
    if (typeof arg === "string") return arg;
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  });

  const wrapConsole = (level) => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      post({ type: "preview.console", nonce, level, args: stringifyArgs(args) });
    };
  };

  wrapConsole("warn");
  wrapConsole("error");

  window.addEventListener("error", (event) => {
    post({
      type: "preview.runtime-error",
      nonce,
      message: event.message || "Unknown runtime error",
      stack: event.error && event.error.stack ? String(event.error.stack) : undefined
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    post({
      type: "preview.runtime-error",
      nonce,
      message: reason && reason.message ? String(reason.message) : String(reason),
      stack: reason && reason.stack ? String(reason.stack) : undefined
    });
  });
})();`;
}

export function buildPreviewDocument(input: { bundle: ProjectBundle; nonce: string }): string {
  const nodeCount = Object.keys(input.bundle.editGraph.nodes).length;
  const bridgeScript = createPreviewBridgeScript({
    nonce: input.nonce,
    documentId: input.bundle.id,
    nodeCount
  });

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob: https:; font-src data: https:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.bundle.title)}</title>
</head>
<body>
${input.bundle.html.normalized}
<script>${bridgeScript}</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
