import { mkdir } from "node:fs/promises";
import path from "node:path";

import { createStandaloneHtml, type ProjectBundle } from "@kdesign/editor-core";
import { chromium } from "@playwright/test";

export type RenderedBundlePreview = {
  html: string;
  png: Uint8Array;
  pdf: Uint8Array;
  animationFrames: Uint8Array[];
  diagnostics: string[];
};

const PREVIEW_VIEWPORT = { width: 960, height: 540 };
const ANIMATION_PROGRESS = [0, 0.5, 1];

export async function renderBundlePreview(
  bundle: ProjectBundle,
  workDir: string
): Promise<RenderedBundlePreview> {
  await mkdir(workDir, { recursive: true });
  const html = createStandaloneHtml(bundle);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: PREVIEW_VIEWPORT });
    await page.setContent(html, { waitUntil: "load" });
    await page.addStyleTag({
      content: `
        html, body { width: ${PREVIEW_VIEWPORT.width}px; min-height: ${PREVIEW_VIEWPORT.height}px; }
        body { margin: 0; background: #ffffff; overflow: hidden; }
        body > * { transform-origin: 50% 28%; will-change: transform, opacity; }
      `
    });
    const png = await page.screenshot({
      type: "png",
      fullPage: false
    });
    const pdf = await page.pdf({
      printBackground: true,
      width: `${PREVIEW_VIEWPORT.width}px`,
      height: `${PREVIEW_VIEWPORT.height}px`,
      pageRanges: "1"
    });

    const animationFrames: Uint8Array[] = [];
    for (const progress of ANIMATION_PROGRESS) {
      await page.evaluate((value) => {
        const root = document.body.firstElementChild as HTMLElement | null;
        if (!root) {
          return;
        }
        const y = Math.round((1 - value) * 28);
        const scale = 0.985 + value * 0.015;
        root.style.transform = `translateY(${y}px) scale(${scale})`;
        root.style.opacity = String(0.84 + value * 0.16);
      }, progress);
      animationFrames.push(await page.screenshot({
        type: "png",
        fullPage: false,
        path: path.join(workDir, `frame-${String(animationFrames.length).padStart(3, "0")}.png`)
      }));
    }

    await page.close();
    return {
      html,
      png,
      pdf,
      animationFrames,
      diagnostics: [
        `playwright-render:${PREVIEW_VIEWPORT.width}x${PREVIEW_VIEWPORT.height}`,
        `animation-frames:${animationFrames.length}`
      ]
    };
  } finally {
    await browser.close();
  }
}
