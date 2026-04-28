import { stableHash } from "./ids.js";
import { normalizeHtml } from "./normalize.js";
import { ProjectBundleSchema, type AssetRef, type ContextAttachment, type CreationMode, type FidelityTarget, type KoreanPreset, type ProjectBundle } from "./schemas.js";

export type CreateGeneratedBundleInput = {
  id: string;
  prompt: string;
  mode: CreationMode;
  fidelity: FidelityTarget;
  preset: KoreanPreset;
  contextAttachments: ContextAttachment[];
};

export const KOREAN_PRESETS: Array<{
  id: KoreanPreset;
  title: string;
  mode: CreationMode;
  prompt: string;
}> = [
  {
    id: "saasLanding",
    title: "SaaS/Product Landing",
    mode: "prototype",
    prompt: "한국어 SaaS 제품 랜딩 페이지"
  },
  {
    id: "pitchDeck",
    title: "Pitch/Explainer Deck",
    mode: "slideDeck",
    prompt: "투자자에게 보여줄 제품 설명 슬라이드"
  },
  {
    id: "mobileApp",
    title: "Mobile App Screen",
    mode: "prototype",
    prompt: "한국어 모바일 앱 온보딩 화면"
  }
];

export function createGeneratedProjectBundle(input: CreateGeneratedBundleInput): ProjectBundle {
  const html = renderGeneratedHtml(input);
  const title = titleForPreset(input.preset);
  const bundle = normalizeHtml({
    id: input.id,
    title,
    html
  });
  const assets = [...bundle.assets, ...contextAttachmentsToAssets(input.contextAttachments)];

  return ProjectBundleSchema.parse({
    ...bundle,
    title,
    source: {
      kind: "generated",
      prompt: input.prompt,
      mode: input.mode,
      fidelity: input.fidelity,
      preset: input.preset,
      contextAttachments: input.contextAttachments
    },
    assets
  });
}

export function createMockContextAttachment(kind: ContextAttachment["kind"], name: string): ContextAttachment {
  const id = `ctx_${stableHash(`${kind}:${name}`)}`;
  return {
    id,
    kind,
    name,
    status: kind === "webCapture" ? "placeholder" : "cached",
    mimeType: mimeTypeForKind(kind),
    note: kind === "webCapture" ? "브라우저 캡처는 Phase 03에서 placeholder로만 기록됩니다." : "로컬 컨텍스트 메타데이터로 저장됨"
  };
}

export function contextAttachmentsToAssets(attachments: ContextAttachment[]): AssetRef[] {
  return attachments.map((attachment) => ({
    id: `asset_${stableHash(attachment.id)}`,
    kind: assetKindForAttachment(attachment.kind),
    sourceUrl: attachment.sourceUrl,
    status: attachment.status,
    mimeType: attachment.mimeType,
    license: "user-provided-context"
  }));
}

function renderGeneratedHtml(input: CreateGeneratedBundleInput): string {
  const prompt = escapeHtml(input.prompt.trim() || "새 한국어 디자인");
  const modeLabel = labelForMode(input.mode);
  const fidelityLabel = input.fidelity === "wireframe" ? "Wireframe" : "High fidelity";

  switch (input.preset) {
    case "pitchDeck":
      return deckHtml(prompt, modeLabel, fidelityLabel, input.contextAttachments.length);
    case "mobileApp":
      return mobileHtml(prompt, modeLabel, fidelityLabel, input.contextAttachments.length);
    case "saasLanding":
      return landingHtml(prompt, modeLabel, fidelityLabel, input.contextAttachments.length);
  }
}

function landingHtml(prompt: string, modeLabel: string, fidelityLabel: string, contextCount: number): string {
  return String.raw`<main class="generated generated-landing" style="min-height: 100vh; padding: clamp(28px, 6vw, 60px); background: #f4efe7; color: #171717; font-family: Inter, Pretendard, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif; line-height: 1.6; word-break: keep-all;">
  <section class="generated-hero" style="display: flex; flex-wrap: wrap; gap: 30px; align-items: center; min-height: 560px; border: 4px solid #171717; border-radius: 30px; background: #fffdf7; padding: clamp(28px, 6vw, 56px); box-shadow: 16px 18px 0 rgba(23, 23, 23, 0.12);">
    <div style="flex: 1 1 420px; min-width: min(100%, 280px);">
      <p style="margin: 0 0 14px; color: #2f9f8f; font-size: 15px; font-weight: 900;">${modeLabel} · ${fidelityLabel}</p>
      <h1 style="margin: 0; max-width: 760px; font-size: clamp(34px, 8vw, 68px); line-height: 1.06; letter-spacing: 0;">${prompt}</h1>
      <p style="margin: 24px 0 0; max-width: 720px; color: #3f4654; font-size: clamp(17px, 3vw, 23px);">실제 제품 맥락과 한국어 문장 리듬을 먼저 잡고, 바로 선택해서 고칠 수 있는 실행형 디자인입니다.</p>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px;">
        <a href="#start" style="display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 22px; border: 3px solid #171717; border-radius: 14px; background: #171717; color: #ffffff; font-weight: 900; text-decoration: none;">바로 다듬기</a>
        <span style="display: inline-flex; align-items: center; min-height: 52px; padding: 0 18px; border: 3px solid #171717; border-radius: 14px; background: #f5c84b; font-weight: 900;">컨텍스트 ${contextCount}개 반영</span>
      </div>
    </div>
    <section class="generated-card-stack" style="flex: 1 1 320px; min-width: min(100%, 260px); display: grid; gap: 14px;">
      <article style="min-height: 120px; border: 3px solid #171717; border-radius: 22px; background: #eaf6f3; padding: 22px; box-shadow: 8px 8px 0 rgba(23,23,23,.1);">
        <h2 style="margin: 0; font-size: 24px;">제품 화면 중심</h2>
        <p style="margin: 10px 0 0; color: #56606c;">추상 장식 대신 사용자가 판단할 수 있는 정보 위계를 먼저 보여줍니다.</p>
      </article>
      <article style="min-height: 120px; border: 3px solid #171717; border-radius: 22px; background: #fff8df; padding: 22px; box-shadow: 8px 8px 0 rgba(23,23,23,.1);">
        <h2 style="margin: 0; font-size: 24px;">편집 가능한 블록</h2>
        <p style="margin: 10px 0 0; color: #56606c;">텍스트, CTA, 카드, 섹션이 안정적인 ID로 추적됩니다.</p>
      </article>
    </section>
  </section>
</main>`;
}

function deckHtml(prompt: string, modeLabel: string, fidelityLabel: string, contextCount: number): string {
  return String.raw`<main class="generated generated-deck" style="min-height: 100vh; background: #f2f5f4; color: #171717; font-family: Inter, Pretendard, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif; padding: clamp(24px, 5vw, 52px); line-height: 1.55; word-break: keep-all;">
  <section class="generated-deck-grid" style="display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr); gap: 22px; align-items: stretch;">
    <article class="generated-deck-cover" style="min-height: 620px; border: 4px solid #171717; border-radius: 28px; background: #fffdf7; padding: clamp(28px, 6vw, 56px); box-shadow: 14px 16px 0 rgba(23, 23, 23, .12);">
      <p style="margin: 0 0 16px; color: #c98265; font-size: 15px; font-weight: 900;">${modeLabel} · ${fidelityLabel}</p>
      <h1 style="margin: 0; max-width: 760px; font-size: clamp(34px, 7vw, 62px); line-height: 1.08;">${prompt}</h1>
      <p style="margin: 26px 0 0; color: #3f4654; font-size: 22px;">문제, 해결책, 시장, 실행 계획이 한 장면씩 이어지는 발표 리듬으로 구성했습니다.</p>
      <div style="display: flex; gap: 12px; margin-top: 34px; flex-wrap: wrap;">
        <span style="border: 3px solid #171717; border-radius: 999px; background: #2f9f8f; color: #fff; padding: 10px 16px; font-weight: 900;">컨텍스트 ${contextCount}</span>
        <span style="border: 3px solid #171717; border-radius: 999px; background: #f5c84b; padding: 10px 16px; font-weight: 900;">한국어 발표용</span>
      </div>
    </article>
    <aside class="generated-deck-outline" style="display: grid; gap: 16px;">
      <article style="border: 3px solid #171717; border-radius: 22px; background: #ffffff; padding: 22px;"><h2 style="margin:0;">01 문제</h2><p style="color:#56606c;">지금 사용자의 막힘을 한 문장으로 정리합니다.</p></article>
      <article style="border: 3px solid #171717; border-radius: 22px; background: #fff8df; padding: 22px;"><h2 style="margin:0;">02 해결</h2><p style="color:#56606c;">제품이 바꾸는 행동을 화면 중심으로 보여줍니다.</p></article>
      <article style="border: 3px solid #171717; border-radius: 22px; background: #eaf6f3; padding: 22px;"><h2 style="margin:0;">03 실행</h2><p style="color:#56606c;">다음 액션과 검증 기준을 분명히 둡니다.</p></article>
    </aside>
  </section>
</main>`;
}

function mobileHtml(prompt: string, modeLabel: string, fidelityLabel: string, contextCount: number): string {
  return String.raw`<main class="generated generated-mobile" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f4efe7; color: #171717; font-family: Inter, Pretendard, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif; padding: 34px; line-height: 1.55; word-break: keep-all;">
  <section class="generated-phone-frame" style="width: min(100%, 430px); min-height: 760px; border: 5px solid #171717; border-radius: 42px; background: #fffdf7; padding: 22px; box-shadow: 16px 18px 0 rgba(23,23,23,.12);">
    <div style="height: 34px; display: flex; justify-content: center;"><span style="width: 112px; height: 8px; border-radius: 999px; background: #171717;"></span></div>
    <article class="generated-mobile-hero" style="margin-top: 28px; border: 3px solid #171717; border-radius: 28px; background: #eaf6f3; padding: 26px; min-height: 300px;">
      <p style="margin: 0 0 12px; color: #2f9f8f; font-size: 14px; font-weight: 900;">${modeLabel} · ${fidelityLabel}</p>
      <h1 style="margin: 0; font-size: 36px; line-height: 1.12;">${prompt}</h1>
      <p style="margin: 18px 0 0; color: #56606c; font-size: 17px;">한국어 앱 화면에서 읽히는 줄 길이와 버튼 크기를 우선했습니다.</p>
    </article>
    <div class="generated-mobile-actions" style="display: grid; gap: 12px; margin-top: 20px;">
      <button style="min-height: 58px; border: 3px solid #171717; border-radius: 18px; background: #171717; color: #fff; font-size: 18px; font-weight: 900;">시작하기</button>
      <button style="min-height: 58px; border: 3px solid #171717; border-radius: 18px; background: #f5c84b; color: #171717; font-size: 18px; font-weight: 900;">컨텍스트 ${contextCount}개 보기</button>
    </div>
  </section>
</main>`;
}

function titleForPreset(preset: KoreanPreset): string {
  switch (preset) {
    case "pitchDeck":
      return "Generated Pitch Deck";
    case "mobileApp":
      return "Generated Mobile App";
    case "saasLanding":
      return "Generated SaaS Landing";
  }
}

function labelForMode(mode: CreationMode): string {
  switch (mode) {
    case "prototype":
      return "Prototype";
    case "slideDeck":
      return "Slide deck";
    case "template":
      return "Template";
    case "other":
      return "Other";
  }
}

function mimeTypeForKind(kind: ContextAttachment["kind"]): string {
  switch (kind) {
    case "image":
      return "image/png";
    case "document":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "slideDeck":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "spreadsheet":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "webCapture":
      return "text/uri-list";
    case "designFile":
      return "application/octet-stream";
    case "codebase":
      return "text/plain";
  }
}

function assetKindForAttachment(kind: ContextAttachment["kind"]): AssetRef["kind"] {
  return kind === "image" || kind === "webCapture" || kind === "designFile" ? "image" : "other";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
