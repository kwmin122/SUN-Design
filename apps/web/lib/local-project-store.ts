"use client";

import type { ProjectBundle } from "@kdesign/editor-core";
import { parseProjectBundleJson, serializeProjectBundle } from "@kdesign/editor-core";

export const LOCAL_PROJECT_STORAGE_KEY = "kdesign.phase01.project.v1";
export const LOCAL_PROJECT_LOAD_ERROR_KEY = "kdesign.phase01.project.v1.loadError";

export type LocalProjectLoadResult =
  | { status: "missing" }
  | { status: "loaded"; bundle: ProjectBundle }
  | { status: "invalid"; raw: string; error: string };

export function saveLocalProjectBundle(bundle: ProjectBundle): void {
  window.localStorage.setItem(LOCAL_PROJECT_STORAGE_KEY, serializeProjectBundle(bundle));
}

export function loadLocalProjectBundle(): LocalProjectLoadResult {
  const json = window.localStorage.getItem(LOCAL_PROJECT_STORAGE_KEY);
  if (!json) {
    return { status: "missing" };
  }

  try {
    return { status: "loaded", bundle: parseProjectBundleJson(json) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    window.localStorage.setItem(LOCAL_PROJECT_LOAD_ERROR_KEY, message);
    return { status: "invalid", raw: json, error: message };
  }
}

export function clearLocalProjectBundle(): void {
  window.localStorage.removeItem(LOCAL_PROJECT_STORAGE_KEY);
  window.localStorage.removeItem(LOCAL_PROJECT_LOAD_ERROR_KEY);
}
