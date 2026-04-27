import type { ProjectBundle } from "./schemas.js";
import { ProjectBundleSchema } from "./schemas.js";

export const PROJECT_BUNDLE_STORAGE_VERSION = 1;

export function serializeProjectBundle(bundle: ProjectBundle): string {
  return JSON.stringify(ProjectBundleSchema.parse(bundle));
}

export function parseProjectBundleJson(json: string): ProjectBundle {
  return ProjectBundleSchema.parse(JSON.parse(json));
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
