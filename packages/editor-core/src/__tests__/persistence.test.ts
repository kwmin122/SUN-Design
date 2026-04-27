import { describe, expect, it } from "vitest";

import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import {
  createMemoryProjectRepository,
  parseProjectBundleJson,
  serializeProjectBundle
} from "../persistence.js";

function createBundle() {
  return normalizeHtml({
    id: "phase-01-fixture",
    title: "Phase 01 Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  });
}

describe("project bundle persistence", () => {
  it("serializes and parses a normalized bundle", () => {
    const bundle = createBundle();
    const parsed = parseProjectBundleJson(serializeProjectBundle(bundle));

    expect(parsed.id).toBe(bundle.id);
    expect(parsed.baseRevision).toBe(bundle.baseRevision);
    expect(parsed.html.normalized).toBe(bundle.html.normalized);
    expect(Object.keys(parsed.editGraph.nodes).sort()).toEqual(Object.keys(bundle.editGraph.nodes).sort());
  });

  it("saves and reloads equivalent bundles from the memory repository", async () => {
    const bundle = createBundle();
    const repository = createMemoryProjectRepository();

    await repository.save(bundle);
    const loaded = await repository.load(bundle.id);

    expect(loaded?.id).toBe(bundle.id);
    expect(loaded?.html.normalized).toBe(bundle.html.normalized);
  });

  it("stores cloned JSON values rather than object references", async () => {
    const bundle = createBundle();
    const repository = createMemoryProjectRepository();

    await repository.save(bundle);
    bundle.title = "Mutated after save";

    const loaded = await repository.load(bundle.id);
    expect(loaded?.title).toBe("Phase 01 Fixture");
  });

  it("throws for malformed JSON", () => {
    expect(() => parseProjectBundleJson("{not-json")).toThrow();
  });

  it("throws when schemaVersion is omitted", () => {
    const bundle = createBundle();
    const parsed = JSON.parse(serializeProjectBundle(bundle)) as Record<string, unknown>;
    delete parsed.schemaVersion;

    expect(() => parseProjectBundleJson(JSON.stringify(parsed))).toThrow();
  });
});
