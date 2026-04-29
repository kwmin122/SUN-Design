import type { ProjectBundle } from "./schemas.js";
import { ProjectBundleSchema } from "./schemas.js";
import { ensureCanvasGraph } from "./canvas-graph.js";
import { migrateContextAttachmentsToSourceRecords } from "./context-ingestion.js";
import { assertProjectBundleIntegrity } from "./integrity.js";

export const PROJECT_BUNDLE_STORAGE_VERSION = 1;

export function serializeProjectBundle(bundle: ProjectBundle): string {
  const parsed = ProjectBundleSchema.parse(bundle);
  if (parsed.canvasGraph) {
    assertProjectBundleIntegrity(parsed);
  }
  return JSON.stringify(parsed);
}

export function parseProjectBundleJson(json: string): ProjectBundle {
  const parsed = ProjectBundleSchema.parse(JSON.parse(json));
  const bundle = ensureCanvasGraph(migrateContextAttachmentsToSourceRecords(parsed));
  assertProjectBundleIntegrity(bundle);
  return bundle;
}

export interface ProjectRepository {
  save(bundle: ProjectBundle): Promise<void>;
  load(id: string): Promise<ProjectBundle | null>;
  list(): Promise<ProjectBundle[]>;
  delete(id: string): Promise<void>;
}

export function createMemoryProjectRepository(seed: ProjectBundle[] = []): ProjectRepository {
  const records = new Map<string, string>();

  for (const bundle of seed) {
    records.set(bundle.id, serializeProjectBundle(bundle));
  }

  return {
    async save(bundle: ProjectBundle): Promise<void> {
      records.set(bundle.id, serializeProjectBundle(bundle));
    },
    async load(id: string): Promise<ProjectBundle | null> {
      const json = records.get(id);
      return json ? parseProjectBundleJson(json) : null;
    },
    async list(): Promise<ProjectBundle[]> {
      return Array.from(records.values()).map((json) => parseProjectBundleJson(json));
    },
    async delete(id: string): Promise<void> {
      records.delete(id);
    }
  };
}
