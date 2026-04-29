import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import { createSyncEnvelope, markSyncDiverged, validateSyncEnvelope } from "../sync.js";

const TEST_TIME = "2026-04-29T00:00:00.000Z";

function createBundle() {
  return normalizeHtml({
    id: "phase-09-sync",
    title: "Phase 09 Sync",
    html: BASIC_LANDING_FIXTURE_HTML
  });
}

describe("sync foundation", () => {
  it("creates a DATA-01 foundation-only sync envelope", () => {
    const bundle = createBundle();
    const envelope = createSyncEnvelope({
      bundle,
      accountHint: "local-mock-account",
      createdAt: TEST_TIME
    });

    expect(envelope.status).toBe("localOnly");
    expect(envelope.remoteDocumentId).toMatch(/^remote_/);
    expect(envelope.diagnostics.join(" ")).toContain("DATA-01 foundation only");
    expect(validateSyncEnvelope(bundle, envelope)).toEqual([]);
  });

  it("reports stale revision diagnostics", () => {
    const bundle = createBundle();
    const envelope = {
      ...createSyncEnvelope({ bundle, createdAt: TEST_TIME }),
      localRevision: "rev_stale"
    };

    expect(validateSyncEnvelope(bundle, envelope)).toContain("stale-local-revision");
  });

  it("requires remote ids for synced envelopes", () => {
    const bundle = createBundle();
    const envelope = {
      ...createSyncEnvelope({ bundle, createdAt: TEST_TIME }),
      status: "synced" as const,
      remoteDocumentId: undefined
    };

    expect(validateSyncEnvelope(bundle, envelope)).toContain("synced-missing-remote-document-id");
  });

  it("marks sync as diverged with diagnostics", () => {
    const bundle = createBundle();
    const next = markSyncDiverged(bundle, "remote revision changed", TEST_TIME);

    expect(next.syncEnvelope?.status).toBe("diverged");
    expect(next.syncEnvelope?.diagnostics).toContain("remote revision changed");
  });
});
