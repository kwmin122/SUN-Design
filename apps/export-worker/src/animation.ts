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
  return encodeGifFrames(frames, { width, height, delayMs: 180 });
}

export function exportAnimationGif(
  frames: Uint8Array[],
  input: { width: number; height: number; delayMs: number }
): Uint8Array {
  if (frames.length === 0) {
    throw new Error("GIF export requires rendered frames.");
  }
  const decodedFrames = frames.map((frame) => PNG.sync.read(Buffer.from(frame)));
  return encodeGifFrames(decodedFrames, input);
}

function encodeGifFrames(
  frames: PNG[],
  input: { width: number; height: number; delayMs: number }
): Uint8Array {
  const { GIFEncoder, applyPalette, quantize } = require("gifenc") as GifencModule;
  const gif = GIFEncoder();
  for (const frame of frames) {
    if (frame.width !== input.width || frame.height !== input.height) {
      throw new Error("GIF export frames must have the same size.");
    }
    const rgba = new Uint8Array(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength);
    const palette = quantize(rgba, 256);
    const indexed = applyPalette(rgba, palette);
    gif.writeFrame(indexed, input.width, input.height, {
      palette,
      delay: input.delayMs,
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
  const framesDir = path.join(workDir, "mp4-frames");
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });
  for (let index = 0; index < framePngs.length; index += 1) {
    await writeFile(path.join(framesDir, `frame-${String(index).padStart(3, "0")}.png`), framePngs[index]!);
  }
  const outputPath = path.join(workDir, "animation.mp4");
  await rm(outputPath, { force: true });
  await exportAnimationMp4(
    Array.from({ length: framePngs.length }, (_, index) => path.join(framesDir, `frame-${String(index).padStart(3, "0")}.png`)),
    { outputPath, fps: 6 }
  );
  return new Uint8Array(await readFile(outputPath));
}

export async function exportAnimationMp4(
  framePaths: string[],
  input: { outputPath: string; fps: number }
): Promise<void> {
  if (framePaths.length === 0) {
    throw new Error("mp4-export-failed: no frames");
  }
  const framePattern = path.join(path.dirname(framePaths[0]!), "frame-%03d.png");
  try {
    const ffmpegPath = resolveFfmpegPath();
    await execFileAsync(ffmpegPath, [
      "-y",
      "-framerate",
      String(input.fps),
      "-i",
      framePattern,
      "-vf",
      "format=yuv420p",
      "-movflags",
      "+faststart",
      input.outputPath
    ], { timeout: 30_000 });
  } catch (error) {
    const detail = error && typeof error === "object" && "stderr" in error
      ? String((error as { stderr?: unknown }).stderr ?? "")
      : error instanceof Error
        ? error.message
        : "unknown";
    throw new Error(`mp4-export-failed: ${detail}`);
  }
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
