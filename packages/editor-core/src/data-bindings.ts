import { stableHash } from "./ids.js";
import {
  DataBindingSchema,
  DataSourceSchema,
  ProjectBundleSchema,
  type DataBinding,
  type DataBindingState,
  type DataSource,
  type DataSourceKind,
  type ProjectBundle
} from "./schemas.js";

type StringRecord = Record<string, string>;

export function createDataSource(input: {
  id?: string;
  kind: DataSourceKind;
  name: string;
  sourceId: string;
  fields: string[];
  rows: StringRecord[];
  createdAt?: string;
}): DataSource {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const fields = unique(input.fields.map((field) => field.trim()).filter(Boolean));
  return DataSourceSchema.parse({
    id: input.id ?? `data_${stableHash(`${input.sourceId}:${input.name}:${fields.join(",")}`)}`,
    kind: input.kind,
    name: input.name,
    sourceId: input.sourceId,
    fields,
    rows: input.rows.map((row) => normalizeRow(row, fields)),
    status: input.rows.length > 0 ? "ready" : "empty",
    createdAt,
    updatedAt: createdAt
  });
}

export function parseCsvDataSource(input: {
  name: string;
  sourceId: string;
  csv: string;
  createdAt?: string;
}): DataSource {
  const lines = input.csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fields = lines[0]?.split(",").map((field) => field.trim()).filter(Boolean) ?? [];
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    return Object.fromEntries(fields.map((field, index) => [field, values[index] ?? ""]));
  });
  return createDataSource({
    kind: "csv",
    name: input.name,
    sourceId: input.sourceId,
    fields,
    rows,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
}

export function createDataBinding(input: {
  dataSourceId: string;
  targetObjectId: string;
  targetNodeId?: string;
  fieldMap: Record<string, string>;
  rowLimit?: number;
  sourceRevision: string;
  createdAt?: string;
}): DataBinding {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return DataBindingSchema.parse({
    id: `binding_${stableHash(`${input.dataSourceId}:${input.targetObjectId}:${JSON.stringify(input.fieldMap)}`)}`,
    dataSourceId: input.dataSourceId,
    targetObjectId: input.targetObjectId,
    ...(input.targetNodeId ? { targetNodeId: input.targetNodeId } : {}),
    fieldMap: input.fieldMap,
    ...(input.rowLimit ? { rowLimit: input.rowLimit } : {}),
    state: "ready",
    sourceRevision: input.sourceRevision,
    createdAt,
    updatedAt: createdAt
  });
}

export function previewDataBinding(
  source: DataSource,
  binding: DataBinding
): { state: DataBindingState; rows: StringRecord[]; diagnostics: string[] } {
  const diagnostics = validateFieldMap(source, binding);
  if (diagnostics.length > 0) {
    return { state: "error", rows: [], diagnostics };
  }
  if (source.rows.length === 0) {
    return { state: "empty", rows: [], diagnostics: [] };
  }
  const limit = binding.rowLimit ?? source.rows.length;
  const rows = source.rows.slice(0, limit).map((row) => {
    const projected: StringRecord = {};
    for (const [targetField, sourceField] of Object.entries(binding.fieldMap)) {
      projected[targetField] = row[sourceField] ?? "";
    }
    return projected;
  });
  return { state: "ready", rows, diagnostics: [] };
}

export function applyDataBindingToBundle(
  bundle: ProjectBundle,
  source: DataSource,
  binding: DataBinding
): ProjectBundle {
  if (binding.dataSourceId !== source.id) {
    throw new Error(`Data binding source mismatch: ${binding.dataSourceId}`);
  }
  const preview = previewDataBinding(source, binding);
  if (preview.state === "error") {
    throw new Error(`Data binding has invalid fields: ${preview.diagnostics.join(", ")}`);
  }
  return ProjectBundleSchema.parse({
    ...bundle,
    dataSources: [...bundle.dataSources.filter((item) => item.id !== source.id), source],
    dataBindings: [...bundle.dataBindings.filter((item) => item.id !== binding.id), {
      ...binding,
      state: preview.state
    }]
  });
}

function validateFieldMap(source: DataSource, binding: DataBinding): string[] {
  const fields = new Set(source.fields);
  return Object.values(binding.fieldMap)
    .filter((sourceField) => !fields.has(sourceField))
    .map((sourceField) => `missing-source-field:${sourceField}`);
}

function normalizeRow(row: StringRecord, fields: string[]): StringRecord {
  return Object.fromEntries(fields.map((field) => [field, row[field] ?? ""]));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
