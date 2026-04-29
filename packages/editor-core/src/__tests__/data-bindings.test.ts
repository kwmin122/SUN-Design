import { describe, expect, it } from "vitest";

import { ensureCanvasGraph } from "../canvas-graph.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import {
  applyDataBindingToBundle,
  createDataBinding,
  createDataSource,
  parseCsvDataSource,
  previewDataBinding
} from "../data-bindings.js";

const TEST_TIME = "2026-04-29T00:00:00.000Z";

function createBundle() {
  return ensureCanvasGraph(normalizeHtml({
    id: "phase-09-data",
    title: "Phase 09 Data",
    html: BASIC_LANDING_FIXTURE_HTML
  }));
}

describe("data binding foundation", () => {
  it("parses CSV fixture data and previews mapped Korean rows", () => {
    const bundle = createBundle();
    const target = Object.values(bundle.canvasGraph?.objects ?? {}).find((object) => object.nodeId);
    if (!target) {
      throw new Error("Expected fixture canvas object.");
    }

    const source = parseCsvDataSource({
      name: "팀 데이터.csv",
      sourceId: "source_csv",
      csv: "name,role\n민지,PM\n유진,Designer\n서연,Engineer",
      createdAt: TEST_TIME
    });
    const binding = createDataBinding({
      dataSourceId: source.id,
      targetObjectId: target.id,
      ...(target.nodeId ? { targetNodeId: target.nodeId } : {}),
      fieldMap: { title: "name", subtitle: "role" },
      rowLimit: 3,
      sourceRevision: bundle.baseRevision,
      createdAt: TEST_TIME
    });
    const preview = previewDataBinding(source, binding);

    expect(preview.state).toBe("ready");
    expect(preview.rows.map((row) => row.title)).toEqual(["민지", "유진", "서연"]);

    const next = applyDataBindingToBundle(bundle, source, binding);
    expect(next.dataSources).toHaveLength(1);
    expect(next.dataBindings).toHaveLength(1);
  });

  it("returns empty state for empty data sources", () => {
    const source = createDataSource({
      kind: "staticJson",
      name: "empty.json",
      sourceId: "source_json",
      fields: ["name"],
      rows: [],
      createdAt: TEST_TIME
    });
    const binding = createDataBinding({
      dataSourceId: source.id,
      targetObjectId: "obj",
      fieldMap: { title: "name" },
      sourceRevision: "rev",
      createdAt: TEST_TIME
    });

    expect(previewDataBinding(source, binding).state).toBe("empty");
  });

  it("rejects field maps referencing missing source fields", () => {
    const source = createDataSource({
      kind: "apiFixture",
      name: "api.json",
      sourceId: "source_api",
      fields: ["name"],
      rows: [{ name: "민지" }],
      createdAt: TEST_TIME
    });
    const binding = createDataBinding({
      dataSourceId: source.id,
      targetObjectId: "obj",
      fieldMap: { title: "missing" },
      sourceRevision: "rev",
      createdAt: TEST_TIME
    });

    const preview = previewDataBinding(source, binding);
    expect(preview.state).toBe("error");
    expect(preview.diagnostics).toContain("missing-source-field:missing");
  });

  it("rejects applying a binding to a different data source id", () => {
    const bundle = createBundle();
    const source = createDataSource({
      kind: "csv",
      name: "team.csv",
      sourceId: "source_csv",
      fields: ["name"],
      rows: [{ name: "민지" }],
      createdAt: TEST_TIME
    });
    const target = Object.values(bundle.canvasGraph?.objects ?? {}).find((object) => object.nodeId);
    if (!target) {
      throw new Error("Expected fixture canvas object.");
    }
    const binding = createDataBinding({
      dataSourceId: "data_other",
      targetObjectId: target.id,
      fieldMap: { title: "name" },
      sourceRevision: bundle.baseRevision,
      createdAt: TEST_TIME
    });

    expect(() => applyDataBindingToBundle(bundle, source, binding)).toThrow("Data binding source mismatch");
  });
});
