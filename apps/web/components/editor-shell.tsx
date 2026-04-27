"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  ChevronDown,
  Download,
  Edit3,
  Home,
  Import,
  MessageSquare,
  Mic,
  Paperclip,
  Pencil,
  Plus,
  Presentation,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Share2,
  Sparkles,
  ZoomIn
} from "lucide-react";
import type { PreviewError, ProjectBundle } from "@kdesign/editor-core";
import { BASIC_LANDING_FIXTURE_HTML, normalizeHtml } from "@kdesign/editor-core";
import { createPreviewNonce } from "@kdesign/preview-runtime";

import { DiagnosticsPanel } from "./diagnostics-panel";
import { PreviewFrame } from "./preview-frame";
import {
  clearLocalProjectBundle,
  loadLocalProjectBundle,
  saveLocalProjectBundle
} from "../lib/local-project-store";

type FixtureTweaks = {
  feedColumns: 2 | 3 | 4;
  density: "compact" | "comfortable";
  pointColor: "coral" | "teal" | "blue";
};

const DEFAULT_TWEAKS: FixtureTweaks = {
  feedColumns: 3,
  density: "comfortable",
  pointColor: "coral"
};

const POINT_COLORS: Record<FixtureTweaks["pointColor"], string> = {
  coral: "#c98265",
  teal: "#2f9f8f",
  blue: "#647da8"
};

function createFixtureBundle(tweaks: FixtureTweaks = DEFAULT_TWEAKS): ProjectBundle {
  return normalizeHtml({
    id: "phase-01-fixture",
    title: "Phase 01 Fixture",
    html: applyFixtureTweaks(BASIC_LANDING_FIXTURE_HTML, tweaks)
  });
}

function applyFixtureTweaks(html: string, tweaks: FixtureTweaks): string {
  const heroPadding = tweaks.density === "compact" ? "clamp(24px, 5vw, 40px)" : "clamp(28px, 7vw, 54px)";
  const gridGap = tweaks.density === "compact" ? "12px" : "18px";
  const cardPadding = tweaks.density === "compact" ? "16px" : "22px";
  const pointColor = POINT_COLORS[tweaks.pointColor];

  return html
    .replace("padding: clamp(28px, 7vw, 54px);", `padding: ${heroPadding};`)
    .replaceAll("#2f9f8f", pointColor)
    .replace(
      "grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px;",
      `grid-template-columns: repeat(${tweaks.feedColumns}, minmax(0, 1fr)); gap: ${gridGap};`
    )
    .replaceAll("padding: 22px;", `padding: ${cardPadding};`);
}

export function EditorShell() {
  const [projectBundle, setProjectBundle] = useState<ProjectBundle | null>(null);
  const [nonce, setNonce] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<PreviewError[]>([]);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [chatTab, setChatTab] = useState<"chat" | "comments">("chat");
  const [tweaksEnabled, setTweaksEnabled] = useState(true);
  const [toolMode, setToolMode] = useState<"comment" | "edit" | "draw">("edit");
  const [tweaks, setTweaks] = useState<FixtureTweaks>(DEFAULT_TWEAKS);
  const [prompt, setPrompt] = useState("Describe what you want to create...");

  const resetRuntime = useCallback(() => {
    setNonce(createPreviewNonce());
    setDiagnostics([]);
    setIsPreviewReady(false);
  }, []);

  const commitBundle = useCallback((bundle: ProjectBundle) => {
    saveLocalProjectBundle(bundle);
    setProjectBundle(bundle);
    resetRuntime();
  }, [resetRuntime]);

  const loadOrCreateBundle = useCallback(() => {
    const saved = loadLocalProjectBundle();
    if (saved) {
      setProjectBundle(saved);
      resetRuntime();
      return;
    }

    commitBundle(createFixtureBundle(tweaks));
  }, [commitBundle, resetRuntime, tweaks]);

  useEffect(() => {
    loadOrCreateBundle();
  }, [loadOrCreateBundle]);

  const rebuildWithTweaks = useCallback((nextTweaks: FixtureTweaks) => {
    setTweaks(nextTweaks);
    commitBundle(createFixtureBundle(nextTweaks));
  }, [commitBundle]);

  const reloadSample = useCallback(() => {
    commitBundle(createFixtureBundle(tweaks));
  }, [commitBundle, tweaks]);

  const clearSavedState = useCallback(() => {
    clearLocalProjectBundle();
    commitBundle(createFixtureBundle(tweaks));
  }, [commitBundle, tweaks]);

  const appendDiagnostic = useCallback((error: PreviewError) => {
    setDiagnostics((current) => [error, ...current].slice(0, 30));
  }, []);

  const setFeedColumns = (feedColumns: FixtureTweaks["feedColumns"]) => {
    rebuildWithTweaks({ ...tweaks, feedColumns });
  };

  const setDensity = (density: FixtureTweaks["density"]) => {
    rebuildWithTweaks({ ...tweaks, density });
  };

  const setPointColor = (pointColor: FixtureTweaks["pointColor"]) => {
    rebuildWithTweaks({ ...tweaks, pointColor });
  };

  if (!projectBundle || !nonce) {
    return (
      <main className="studio-editor">
        <aside className="chat-rail">
          <div className="chat-tabs">
            <button className="active" type="button">Chat</button>
            <button type="button">Comments</button>
          </div>
        </aside>
      </main>
    );
  }

  return (
    <main className="studio-editor">
      <aside className="chat-rail" aria-label="Agent chat and comments">
        <div className="chat-tabs">
          <button className={chatTab === "chat" ? "active" : ""} type="button" onClick={() => setChatTab("chat")}>
            Chat
          </button>
          <button className={chatTab === "comments" ? "active" : ""} type="button" onClick={() => setChatTab("comments")}>
            Comments
          </button>
          <button className="new-chat" type="button" aria-label="New thread">
            <Plus size={15} />
          </button>
        </div>

        <section className="product-card" aria-label="K-Design Studio project launcher">
          <div className="product-mark">
            <span>K</span>
            <div>
              <strong>K-Design Studio</strong>
              <small>Codex, Claude Code, Cursor 어디서든 이어지는 디자인 작업대</small>
            </div>
          </div>
          <div className="creation-tabs" aria-label="Creation modes">
            <button className="active" type="button">Prototype</button>
            <button type="button"><Presentation size={14} /> Slide deck</button>
            <button type="button">From template</button>
            <button type="button">Other</button>
          </div>
          <div className="fidelity-grid" aria-label="Fidelity target">
            <button type="button">
              <span>Wireframe</span>
              <small>빠른 구조와 흐름</small>
            </button>
            <button className="active" type="button">
              <span>High fidelity</span>
              <small>실제 자산과 완성도</small>
            </button>
          </div>
        </section>

        <section className="assistant-thread">
          <div className="thread-label"><Bot size={15} /> Design Agent</div>
          <article className="agent-card searching">
            <div className="agent-card-title"><Sparkles size={14} /> Searching</div>
            <p>Claude Design은 품질 벤치마크로 삼고, 실행은 Codex/Claude Code/Cursor 어디서든 이어지는 agent-agnostic 계약으로 고정했습니다.</p>
          </article>
          <article className="agent-card done">
            <div className="agent-card-title"><Edit3 size={14} /> Editing, Done</div>
            <p>왼쪽 채팅, 중앙 캔버스, 상단 툴바, 오른쪽 Tweaks 패널을 갖춘 작업 화면으로 재구성했습니다.</p>
          </article>
          <article className="agent-card">
            <div className="agent-card-title"><MessageSquare size={14} /> Fork verifier agent</div>
            <p>Phase 01은 안전한 HTML foundation만 실행하지만, 제품 셸은 특정 에이전트에 묶이지 않는 디자인 작업 표면을 보여줍니다.</p>
          </article>
          <div className="thread-label you">You</div>
          <article className="agent-card user-intent">
            <p>Apply direct edits and tune the design through the canvas controls.</p>
          </article>
        </section>

        <section className="library-card" aria-label="Design library">
          <div className="library-tabs">
            <button className="active" type="button">Recent</button>
            <button type="button">Your designs</button>
            <button type="button">Examples</button>
            <button type="button">Design systems</button>
          </div>
          <div className="search-box">
            <Search size={14} />
            <span>Search...</span>
          </div>
        </section>

        <section className="prompt-composer" aria-label="Design prompt composer">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            aria-label="Prompt"
          />
          <div className="composer-actions">
            <button type="button" aria-label="Attach asset"><Paperclip size={15} /></button>
            <button type="button" aria-label="Voice prompt"><Mic size={15} /></button>
            <button type="button"><Import size={15} /> Import</button>
            <button className="send-button" type="button"><Send size={15} /> Send</button>
          </div>
        </section>
      </aside>

      <section className="design-workspace">
        <header className="file-bar">
          <nav className="file-tabs" aria-label="Design files">
            <button type="button"><Home size={16} /></button>
            <button type="button">Design Files</button>
            <button type="button">SNS Wireframes.html</button>
            <button className="active" type="button">Phase 01 Fixture.html ×</button>
          </nav>
          <div className="publish-actions">
            <button type="button"><Share2 size={15} /> Share</button>
            <button className="export-button" type="button"><Download size={15} /> Export</button>
            <span className="avatar">KD</span>
          </div>
        </header>

        <div className="studio-toolbar" aria-label="Canvas tools">
          <div className="history-tools">
            <button type="button" onClick={reloadSample}><RefreshCw size={15} /></button>
            <button type="button" onClick={clearSavedState}><RotateCcw size={15} /></button>
          </div>
          <div className="tool-spacer" />
          <label className="toggle-control">
            Tweaks
            <input
              checked={tweaksEnabled}
              onChange={(event) => setTweaksEnabled(event.target.checked)}
              type="checkbox"
            />
            <span />
          </label>
          <div className="mode-tools">
            <button className={toolMode === "comment" ? "active" : ""} type="button" onClick={() => setToolMode("comment")}>
              <MessageSquare size={15} /> Comment
            </button>
            <button className={toolMode === "edit" ? "active" : ""} type="button" onClick={() => setToolMode("edit")}>
              <Edit3 size={15} /> Edit
            </button>
            <button className={toolMode === "draw" ? "active" : ""} type="button" onClick={() => setToolMode("draw")}>
              <Pencil size={15} /> Draw
            </button>
            <button type="button"><ZoomIn size={15} /> 100%</button>
            <button type="button">Present <ChevronDown size={15} /></button>
          </div>
        </div>

        <section className={tweaksEnabled ? "canvas-grid tweaks-open" : "canvas-grid"}>
          <div className="canvas-surface">
            <div className="canvas-meta">
              <div>
                <span>Phase 01 Foundation</span>
                <h1>{projectBundle.title}</h1>
              </div>
              <span className={isPreviewReady ? "stage-status ready" : "stage-status"}>
                {isPreviewReady ? "ready" : "booting"}
              </span>
            </div>
            <PreviewFrame
              bundle={projectBundle}
              nonce={nonce}
              onReady={() => setIsPreviewReady(true)}
              onRuntimeError={appendDiagnostic}
              onConsoleError={appendDiagnostic}
              onBridgeFailure={appendDiagnostic}
            />
          </div>

          {tweaksEnabled ? (
            <aside className="tweaks-rail" aria-label="Tweaks">
              <section className="tweak-card">
                <h2>Tweaks</h2>
                <TweakSegment
                  label="피드 레이아웃"
                  options={[
                    { label: "2열", active: tweaks.feedColumns === 2, onClick: () => setFeedColumns(2) },
                    { label: "3열", active: tweaks.feedColumns === 3, onClick: () => setFeedColumns(3) },
                    { label: "4열", active: tweaks.feedColumns === 4, onClick: () => setFeedColumns(4) }
                  ]}
                />
                <TweakSegment
                  label="콘텐츠 밀도"
                  options={[
                    { label: "컴팩트", active: tweaks.density === "compact", onClick: () => setDensity("compact") },
                    { label: "여유", active: tweaks.density === "comfortable", onClick: () => setDensity("comfortable") }
                  ]}
                />
                <TweakSegment
                  label="포인트 컬러"
                  options={[
                    { label: "코랄", active: tweaks.pointColor === "coral", onClick: () => setPointColor("coral") },
                    { label: "틸", active: tweaks.pointColor === "teal", onClick: () => setPointColor("teal") },
                    { label: "블루", active: tweaks.pointColor === "blue", onClick: () => setPointColor("blue") }
                  ]}
                />
              </section>
              <DiagnosticsPanel
                bundle={projectBundle}
                diagnostics={diagnostics}
                isPreviewReady={isPreviewReady}
              />
            </aside>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function TweakSegment({
  label,
  options
}: {
  label: string;
  options: Array<{ label: string; active: boolean; onClick(): void }>;
}) {
  return (
    <div className="tweak-group">
      <h3>{label}</h3>
      <div className="segmented-control">
        {options.map((option) => (
          <button
            className={option.active ? "active" : ""}
            key={option.label}
            type="button"
            onClick={option.onClick}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
