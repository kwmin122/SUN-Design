"use client";

import type { ProjectBundle } from "@kdesign/editor-core";
import { parseProjectBundleJson, serializeProjectBundle } from "@kdesign/editor-core";

export const LOCAL_PROJECT_STORAGE_KEY = "kdesign.phase01.project.v1";

export function saveLocalProjectBundle(bundle: ProjectBundle): void {
  window.localStorage.setItem(LOCAL_PROJECT_STORAGE_KEY, serializeProjectBundle(bundle));
}

export function loadLocalProjectBundle(): ProjectBundle | null {
  const json = window.localStorage.getItem(LOCAL_PROJECT_STORAGE_KEY);
  if (!json) {
    return null;
  }

  try {
    return parseProjectBundleJson(json);
  } catch {
    clearLocalProjectBundle();
    return null;
  }
}

export function clearLocalProjectBundle(): void {
  window.localStorage.removeItem(LOCAL_PROJECT_STORAGE_KEY);
}
