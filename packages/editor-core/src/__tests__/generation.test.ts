import { describe, expect, it } from "vitest";

import {
  KOREAN_PRESETS,
  createGeneratedProjectBundle,
  createMockContextAttachment
} from "../generation.js";

describe("deterministic prompt generation", () => {
  it("creates a generated bundle with source metadata and editable nodes", () => {
    const attachment = createMockContextAttachment("image", "제품 스크린샷.png");
    const bundle = createGeneratedProjectBundle({
      id: "generated-1",
      prompt: "AI 회의록 제품 랜딩",
      mode: "prototype",
      fidelity: "highFidelity",
      preset: "saasLanding",
      contextAttachments: [attachment]
    });

    expect(bundle.source.kind).toBe("generated");
    expect(bundle.source.prompt).toBe("AI 회의록 제품 랜딩");
    expect(bundle.source.mode).toBe("prototype");
    expect(bundle.source.fidelity).toBe("highFidelity");
    expect(bundle.source.preset).toBe("saasLanding");
    expect(bundle.assets.some((asset) => asset.status === "cached")).toBe(true);
    expect(Object.keys(bundle.editGraph.nodes).length).toBeGreaterThan(0);
    expect(bundle.html.normalized).toContain("AI 회의록 제품 랜딩");
    expect(bundle.html.normalized).toContain("Pretendard");
  });

  it("provides the three required Korean presets", () => {
    expect(KOREAN_PRESETS.map((preset) => preset.id).sort()).toEqual([
      "mobileApp",
      "pitchDeck",
      "saasLanding"
    ]);
  });

  it("marks web captures as placeholder context", () => {
    const attachment = createMockContextAttachment("webCapture", "https://example.com");
    const bundle = createGeneratedProjectBundle({
      id: "generated-web",
      prompt: "웹사이트 리디자인",
      mode: "template",
      fidelity: "wireframe",
      preset: "pitchDeck",
      contextAttachments: [attachment]
    });

    expect(bundle.source.contextAttachments?.[0]?.status).toBe("placeholder");
    expect(bundle.assets[0]?.status).toBe("placeholder");
    expect(bundle.html.normalized).toContain("Wireframe");
  });
});
