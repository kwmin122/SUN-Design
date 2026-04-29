import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";

import { PNG } from "pngjs";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);

type FfmpegPackage = { path?: string };
type GifPalette = number[][];
type GifEncoder = {
  writeFrame(
    index: Uint8Array,
    width: number,
    height: number,
    options?: { palette?: GifPalette; delay?: number; repeat?: number }
  ): void;
  finish(): void;
  bytes(): Uint8Array;
};
type GifencModule = {
  GIFEncoder(): GifEncoder;
  quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number): GifPalette;
  applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: GifPalette): Uint8Array;
};

export function createGifBytes(framePngs: Uint8Array[]): Uint8Array {
  if (framePngs.length === 0) {
    throw new Error("GIF export requires rendered frames.");
  }

  const frames = framePngs.map((frame) => PNG.sync.read(Buffer.from(frame)));
  const width = frames[0]!.width;
  const height = frames[0]!.height;
  const { GIFEncoder, applyPalette, quantize } = require("gifenc") as GifencModule;
  const gif = GIFEncoder();
  for (const frame of frames) {
    if (frame.width !== width || frame.height !== height) {
      throw new Error("GIF export frames must have the same size.");
    }
    const rgba = new Uint8Array(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength);
    const palette = quantize(rgba, 256);
    const indexed = applyPalette(rgba, palette);
    gif.writeFrame(indexed, width, height, {
      palette,
      delay: 180,
      repeat: 0
    });
  }
  gif.finish();
  return gif.bytes();
}

export async function createMp4Bytes(framePngs: Uint8Array[], workDir: string): Promise<Uint8Array> {
  if (framePngs.length === 0) {
    throw new Error("MP4 export requires rendered frames.");
  }
  const ffmpegPath = resolveFfmpegPath();
  const framesDir = path.join(workDir, "mp4-frames");
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });
  for (let index = 0; index < framePngs.length; index += 1) {
    await writeFile(path.join(framesDir, `frame-${String(index).padStart(3, "0")}.png`), framePngs[index]!);
  }
  const outputPath = path.join(workDir, "animation.mp4");
  await rm(outputPath, { force: true });
  await execFileAsync(ffmpegPath, [
    "-y",
    "-framerate",
    "6",
    "-i",
    path.join(framesDir, "frame-%03d.png"),
    "-vf",
    "format=yuv420p",
    "-movflags",
    "+faststart",
    outputPath
  ]);
  return new Uint8Array(await readFile(outputPath));
}

export function ffmpegDiagnostic(): string {
  try {
    return `ffmpeg-bundled:${resolveFfmpegPath()}`;
  } catch {
    return "ffmpeg-bundled:unresolved";
  }
}

function resolveFfmpegPath(): string {
  const ffmpeg = require("@ffmpeg-installer/ffmpeg") as FfmpegPackage;
  if (!ffmpeg.path) {
    throw new Error("Unable to resolve bundled ffmpeg path.");
  }
  return ffmpeg.path;
}
