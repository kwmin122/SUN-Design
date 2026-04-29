import { stableHash } from "./ids.js";
import { ProjectBundleSchema, SyncEnvelopeSchema, type ProjectBundle, type SyncEnvelope } from "./schemas.js";

export function createSyncEnvelope(input: {
  bundle: ProjectBundle;
  remoteDocumentId?: string;
  accountHint?: string;
  cursor?: string;
  createdAt?: string;
}): SyncEnvelope {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return SyncEnvelopeSchema.parse({
    id: `sync_${stableHash(`${input.bundle.id}:${input.bundle.baseRevision}:${input.remoteDocumentId ?? "local"}`)}`,
    status: "localOnly",
    remoteDocumentId: input.remoteDocumentId ?? `remote_${stableHash(input.bundle.id)}`,
    accountHint: input.accountHint,
    localRevision: input.bundle.baseRevision,
    remoteRevision: input.bundle.baseRevision,
    cursor: input.cursor ?? `cursor_${stableHash(`${input.bundle.id}:${createdAt}`)}`,
    lastSyncedAt: createdAt,
    diagnostics: ["DATA-01 foundation only: hosted account sync is not complete."]
  });
}

export function validateSyncEnvelope(bundle: ProjectBundle, envelope: SyncEnvelope): string[] {
  const diagnostics: string[] = [];
  if (envelope.localRevision !== bundle.baseRevision) {
    diagnostics.push("stale-local-revision");
  }
  if (envelope.status === "synced" && !envelope.remoteDocumentId) {
    diagnostics.push("synced-missing-remote-document-id");
  }
  if (envelope.status === "rejected" && envelope.diagnostics.length === 0) {
    diagnostics.push("rejected-sync-envelope-needs-diagnostics");
  }
  return diagnostics;
}

export function markSyncDiverged(
  bundle: ProjectBundle,
  reason: string,
  createdAt = new Date().toISOString()
): ProjectBundle {
  const previous = bundle.syncEnvelope ?? createSyncEnvelope({ bundle, createdAt });
  return ProjectBundleSchema.parse({
    ...bundle,
    syncEnvelope: {
      ...previous,
      status: "diverged",
      localRevision: bundle.baseRevision,
      diagnostics: [...previous.diagnostics, reason],
      lastSyncedAt: createdAt
    }
  });
}
