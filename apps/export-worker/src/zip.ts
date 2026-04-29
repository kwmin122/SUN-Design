import { createHash } from "node:crypto";
import path from "node:path";

import { strToU8, zipSync } from "fflate";

export type ZipInput = Record<string, string | Uint8Array>;
export type ZipFileInput = { path: string; data: Uint8Array | string };

export function createZipArchive(files: ZipInput): Uint8Array {
  return writeDeterministicZip(
    Object.entries(files).map(([entryPath, data]) => ({ path: entryPath, data }))
  );
}

export function writeDeterministicZip(files: ZipFileInput[]): Uint8Array {
  return zipSync(
    Object.fromEntries(
      files
        .map((file) => ({ ...file, path: assertSafeZipEntryPath(file.path) }))
        .sort((left, right) => left.path.localeCompare(right.path))
        .map((file) => [
          file.path,
          typeof file.data === "string" ? strToU8(file.data) : file.data
        ])
    ),
    { level: 9, mtime: new Date("2026-04-29T00:00:00.000Z") }
  );
}

export function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(typeof data === "string" ? strToU8(data) : data).digest("hex");
}

function assertSafeZipEntryPath(entryPath: string): string {
  if (!entryPath || entryPath.includes("\\") || entryPath.startsWith("/") || /^[A-Za-z]:/.test(entryPath)) {
    throw new Error(`Unsafe zip entry path: ${entryPath}`);
  }
  const normalized = path.posix.normalize(entryPath);
  if (
    normalized !== entryPath ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    entryPath.split("/").some((segment) => segment === "" || segment === "..")
  ) {
    throw new Error(`Unsafe zip entry path: ${entryPath}`);
  }
  return entryPath;
}
