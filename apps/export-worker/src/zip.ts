import { strToU8, zipSync } from "fflate";

export type ZipInput = Record<string, string | Uint8Array>;

export function createZipArchive(files: ZipInput): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([filename, value]) => [
        filename,
        typeof value === "string" ? strToU8(value) : value
      ])
    ),
    { level: 9, mtime: new Date("2026-04-29T00:00:00.000Z") }
  );
}
