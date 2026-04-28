"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type {
  BundleVersion,
  CanvasComment,
  ContextAttachment,
  CreationMode,
  EditPatch,
  ExportKind,
  FidelityTarget,
  KoreanPreset,
  PreviewDevice,
  PreviewError,
  PreviewNodeRect,
  ProjectBundle
} from "@kdesign/editor-core";
import {
  BASIC_LANDING_FIXTURE_HTML,
  ProjectBundleSchema,
  applyEditPatchToBundle,
  applyEditPatchesToBundle,
  createGeneratedProjectBundle,
  createMockContextAttachment,
  createExportJob,
  createAgentHandoff,
  createCanvaHandoff,
  createShareLink,
  learnDesignSystem,
  runKoreanQualityAudit,
  findNodeIdsByClass,
  normalizeHtml
} from "@kdesign/editor-core";
import { createPreviewNonce } from "@kdesign/preview-runtime";

import { DiagnosticsPanel } from "./diagnostics-panel";
import { PreviewFrame } from "./preview-frame";
import {
  clearLocalProjectBundle,
  loadLocalProjectBundle,
  saveLocalProjectBundle
} from "../lib/local-project-store";

type ArtifactTweaks = {
  feedColumns: 2 | 3 | 4;
  density: "compact" | "comfortable";
  pointColor: "coral" | "teal" | "blue";
};

type TweakProfileId = "fixture" | "saasLanding" | "pitchDeck" | "mobileApp" | "generic";

type TweakOption = {
  label: string;
  value: ArtifactTweaks[keyof ArtifactTweaks];
};

type TweakGroup = {
  key: keyof ArtifactTweaks;
  label: string;
  options: TweakOption[];
};

type TweakProfile = {
  id: TweakProfileId;
  title: string;
  description: string;
  groups: TweakGroup[];
};

const DEFAULT_TWEAKS: ArtifactTweaks = {
  feedColumns: 3,
  density: "comfortable",
  pointColor: "coral"
};

const POINT_COLORS: Record<ArtifactTweaks["pointColor"], string> = {
  coral: "#c98265",
  teal: "#2f9f8f",
  blue: "#647da8"
};

const ACCENT_BACKGROUNDS: Record<ArtifactTweaks["pointColor"], string> = {
  coral: "#f4efe7",
  teal: "#edf7f5",
  blue: "#eef4ff"
};

const TWEAK_PROFILES: Record<TweakProfileId, TweakProfile> = {
  fixture: {
    id: "fixture",
    title: "Fixture Tweaks",
    description: "샘플 HTML의 피드, 밀도, 포인트 컬러를 조정합니다.",
    groups: [
      { key: "feedColumns", label: "피드 레이아웃", options: [{ label: "2열", value: 2 }, { label: "3열", value: 3 }, { label: "4열", value: 4 }] },
      { key: "density", label: "콘텐츠 밀도", options: [{ label: "컴팩트", value: "compact" }, { label: "여유", value: "comfortable" }] },
      { key: "pointColor", label: "포인트 컬러", options: [{ label: "코랄", value: "coral" }, { label: "틸", value: "teal" }, { label: "블루", value: "blue" }] }
    ]
  },
  saasLanding: {
    id: "saasLanding",
    title: "Landing Tweaks",
    description: "랜딩 페이지의 히어로 균형, 섹션 리듬, 브랜드 톤을 조정합니다.",
    groups: [
      { key: "feedColumns", label: "히어로 구성", options: [{ label: "집중형", value: 2 }, { label: "균형형", value: 3 }, { label: "확장형", value: 4 }] },
      { key: "density", label: "섹션 리듬", options: [{ label: "타이트", value: "compact" }, { label: "넉넉", value: "comfortable" }] },
      { key: "pointColor", label: "브랜드 톤", options: [{ label: "코랄", value: "coral" }, { label: "틸", value: "teal" }, { label: "블루", value: "blue" }] }
    ]
  },
  pitchDeck: {
    id: "pitchDeck",
    title: "Pitch Deck Tweaks",
    description: "슬라이드의 구조, 발표 밀도, 강조 톤을 조정합니다.",
    groups: [
      { key: "feedColumns", label: "슬라이드 레이아웃", options: [{ label: "단일 슬라이드", value: 2 }, { label: "스플릿", value: 3 }, { label: "목차형", value: 4 }] },
      { key: "density", label: "발표 밀도", options: [{ label: "압축", value: "compact" }, { label: "여백", value: "comfortable" }] },
      { key: "pointColor", label: "강조 톤", options: [{ label: "코랄", value: "coral" }, { label: "틸", value: "teal" }, { label: "블루", value: "blue" }] }
    ]
  },
  mobileApp: {
    id: "mobileApp",
    title: "Mobile App Tweaks",
    description: "앱 화면 폭, 터치 밀도, 액션 컬러를 조정합니다.",
    groups: [
      { key: "feedColumns", label: "모바일 화면 폭", options: [{ label: "좁게", value: 2 }, { label: "표준", value: 3 }, { label: "넓게", value: 4 }] },
      { key: "density", label: "터치 밀도", options: [{ label: "컴팩트", value: "compact" }, { label: "편안", value: "comfortable" }] },
      { key: "pointColor", label: "액션 컬러", options: [{ label: "코랄", value: "coral" }, { label: "틸", value: "teal" }, { label: "블루", value: "blue" }] }
    ]
  },
  generic: {
    id: "generic",
    title: "Artifact Tweaks",
    description: "현재 HTML 구조에서 안전하게 찾을 수 있는 전역 스타일만 조정합니다.",
    groups: [
      { key: "feedColumns", label: "구조 강도", options: [{ label: "단순", value: 2 }, { label: "균형", value: 3 }, { label: "풍부", value: 4 }] },
      { key: "density", label: "전체 밀도", options: [{ label: "컴팩트", value: "compact" }, { label: "여유", value: "comfortable" }] },
      { key: "pointColor", label: "포인트 톤", options: [{ label: "코랄", value: "coral" }, { label: "틸", value: "teal" }, { label: "블루", value: "blue" }] }
    ]
  }
};

function createFixtureBundle(tweaks: ArtifactTweaks = DEFAULT_TWEAKS): ProjectBundle {
  const bundle = normalizeHtml({
    id: "phase-01-fixture",
    title: "Phase 01 Fixture",
    html: applyFixtureTweaks(BASIC_LANDING_FIXTURE_HTML, tweaks)
  });
  return ProjectBundleSchema.parse({
    ...bundle,
    tweakValues: { ...tweaks, profileId: "fixture" }
  });
}

function applyFixtureTweaks(html: string, tweaks: ArtifactTweaks): string {
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
  const projectBundleRef = useRef<ProjectBundle | null>(null);
  const hasLoadedInitialBundleRef = useRef(false);
  const [nonce, setNonce] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<PreviewError[]>([]);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [chatTab, setChatTab] = useState<"chat" | "comments">("chat");
  const [tweaksEnabled, setTweaksEnabled] = useState(true);
  const [toolMode, setToolMode] = useState<"comment" | "edit" | "draw">("edit");
  const [tweaks, setTweaks] = useState<ArtifactTweaks>(DEFAULT_TWEAKS);
  const [prompt, setPrompt] = useState("한국어 SaaS 제품 랜딩 페이지를 high fidelity로 만들어줘");
  const [creationMode, setCreationMode] = useState<CreationMode>("prototype");
  const [fidelityTarget, setFidelityTarget] = useState<FidelityTarget>("highFidelity");
  const [activePreset, setActivePreset] = useState<KoreanPreset>("saasLanding");
  const [contextAttachments, setContextAttachments] = useState<ContextAttachment[]>([]);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [previewZoom, setPreviewZoom] = useState<100 | 90 | 75>(100);
  const [presentMode, setPresentMode] = useState(false);
  const [nodeRects, setNodeRects] = useState<Record<string, PreviewNodeRect>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [undoStack, setUndoStack] = useState<ProjectBundle[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectBundle[]>([]);

  useEffect(() => {
    projectBundleRef.current = projectBundle;
  }, [projectBundle]);

  const resetRuntime = useCallback(() => {
    setNonce(createPreviewNonce());
    setDiagnostics([]);
    setIsPreviewReady(false);
  }, []);

  const commitBundle = useCallback((bundle: ProjectBundle, options: { trackUndo?: boolean } = {}) => {
    const current = projectBundleRef.current;
    if (options.trackUndo && current) {
      setUndoStack((stack) => [...stack, current].slice(-30));
      setRedoStack([]);
    }
    saveLocalProjectBundle(bundle);
    projectBundleRef.current = bundle;
    setProjectBundle(bundle);
    resetRuntime();
  }, [resetRuntime]);

  const loadOrCreateBundle = useCallback(() => {
    const saved = loadLocalProjectBundle();
    if (saved) {
      setTweaks(readArtifactTweaks(saved.tweakValues));
      setProjectBundle(saved);
      projectBundleRef.current = saved;
      resetRuntime();
      return;
    }

    commitBundle(createFixtureBundle(tweaks));
  }, [commitBundle, resetRuntime, tweaks]);

  useEffect(() => {
    if (hasLoadedInitialBundleRef.current) {
      return;
    }
    hasLoadedInitialBundleRef.current = true;
    loadOrCreateBundle();
  }, [loadOrCreateBundle]);

  const rebuildWithTweaks = useCallback((nextTweaks: ArtifactTweaks) => {
    setTweaks(nextTweaks);
    const current = projectBundleRef.current;
    if (!current) {
      commitBundle(createFixtureBundle(nextTweaks));
      return;
    }

    const profile = getTweakProfile(current);
    const bundleWithTweaks = ProjectBundleSchema.parse({
      ...current,
      tweakValues: { ...nextTweaks, profileId: profile.id },
      updatedAt: new Date().toISOString()
    });
    const patches = createTweakPatches(current, tweaks, nextTweaks, profile.id);
    const nextBundle = patches.length > 0
      ? applyEditPatchesToBundle(bundleWithTweaks, patches)
      : bundleWithTweaks;
    commitBundle(nextBundle, { trackUndo: true });
  }, [commitBundle, tweaks]);

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

  const selectedNode = selectedNodeId && projectBundle ? projectBundle.editGraph.nodes[selectedNodeId] : undefined;
  const selectedRect = selectedNodeId ? nodeRects[selectedNodeId] : undefined;
  const hoveredRect = hoveredNodeId ? nodeRects[hoveredNodeId] : undefined;

  useEffect(() => {
    setTextDraft(selectedNode?.textPreview ?? "");
  }, [selectedNode?.id, selectedNode?.textPreview]);

  const handleNodeRegistry = useCallback((nodes: PreviewNodeRect[]) => {
    setNodeRects(Object.fromEntries(nodes.map((node) => [node.nodeId, node])));
  }, []);

  const handleNodeSelected = useCallback((node: PreviewNodeRect) => {
    setNodeRects((current) => ({ ...current, [node.nodeId]: node }));
    setSelectedNodeId(node.nodeId);
    setHoveredNodeId(null);
  }, []);

  const handleNodeHovered = useCallback((node: PreviewNodeRect) => {
    setNodeRects((current) => ({ ...current, [node.nodeId]: node }));
    setHoveredNodeId(node.nodeId);
  }, []);

  const applyPatch = useCallback((
    nodeId: string,
    op: EditPatch["op"],
    value: unknown,
    source: EditPatch["source"] = "canvas"
  ) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }

    const patch: EditPatch = {
      id: createLocalId("patch"),
      nodeId,
      op,
      value,
      source,
      baseRevision: current.baseRevision,
      createdAt: new Date().toISOString()
    };

    try {
      const nextBundle = applyEditPatchToBundle(current, patch);
      commitBundle(nextBundle, { trackUndo: true });
      setSelectedNodeId(nodeId);
    } catch (error) {
      appendDiagnostic({
        id: createLocalId("patch_error"),
        source: "bridge",
        severity: "warning",
        code: "patch_rejected",
        message: error instanceof Error ? error.message : "Patch was rejected.",
        createdAt: new Date().toISOString()
      });
    }
  }, [appendDiagnostic, commitBundle]);

  const addComment = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current || !selectedNodeId || !commentDraft.trim()) {
      return;
    }

    const comment: CanvasComment = {
      id: createLocalId("comment"),
      nodeId: selectedNodeId,
      body: commentDraft.trim(),
      author: "You",
      createdAt: new Date().toISOString()
    };
    const rect = nodeRects[selectedNodeId];
    if (rect) {
      comment.rect = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    }

    const nextBundle = ProjectBundleSchema.parse({
      ...current,
      comments: [comment, ...current.comments],
      updatedAt: comment.createdAt
    });
    setCommentDraft("");
    commitBundle(nextBundle, { trackUndo: true });
  }, [commentDraft, commitBundle, nodeRects, selectedNodeId]);

  const saveVersion = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }

    const createdAt = new Date().toISOString();
    const version: BundleVersion = {
      id: createLocalId("version"),
      label: `Direction ${current.versions.length + 1}`,
      html: current.html.normalized,
      patchCount: current.patches.length,
      createdAt
    };

    commitBundle(ProjectBundleSchema.parse({
      ...current,
      versions: [version, ...current.versions],
      updatedAt: createdAt
    }), { trackUndo: true });
  }, [commitBundle]);

  const undo = useCallback(() => {
    const current = projectBundleRef.current;
    const previous = undoStack.at(-1);
    if (!current || !previous) {
      return;
    }
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [current, ...stack].slice(0, 30));
    saveLocalProjectBundle(previous);
    projectBundleRef.current = previous;
    setProjectBundle(previous);
    resetRuntime();
  }, [resetRuntime, undoStack]);

  const redo = useCallback(() => {
    const current = projectBundleRef.current;
    const next = redoStack[0];
    if (!current || !next) {
      return;
    }
    setRedoStack((stack) => stack.slice(1));
    setUndoStack((stack) => [...stack, current].slice(-30));
    saveLocalProjectBundle(next);
    projectBundleRef.current = next;
    setProjectBundle(next);
    resetRuntime();
  }, [redoStack, resetRuntime]);

  const addContextAttachment = useCallback((kind: ContextAttachment["kind"], name: string) => {
    setContextAttachments((current) => {
      const attachment = createMockContextAttachment(kind, name);
      if (current.some((item) => item.id === attachment.id)) {
        return current;
      }
      return [...current, attachment];
    });
  }, []);

  const createFromPrompt = useCallback((presetOverride?: KoreanPreset) => {
    const preset = presetOverride ?? activePreset;
    const mode = preset === "pitchDeck" ? "slideDeck" : creationMode;
    const bundle = createGeneratedProjectBundle({
      id: `generated-${preset}`,
      prompt,
      mode,
      fidelity: fidelityTarget,
      preset,
      contextAttachments
    });
    const initialTweaks = DEFAULT_TWEAKS;
    const bundleWithTweaks = ProjectBundleSchema.parse({
      ...bundle,
      tweakValues: { ...initialTweaks, profileId: preset }
    });
    setActivePreset(preset);
    setCreationMode(mode);
    setTweaks(initialTweaks);
    commitBundle(bundleWithTweaks, { trackUndo: true });
    setSelectedNodeId(null);
  }, [activePreset, commitBundle, contextAttachments, creationMode, fidelityTarget, prompt]);

  const runQualityCheck = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }

    const issues = runKoreanQualityAudit(current);
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      qualityIssues: issues,
      updatedAt: new Date().toISOString()
    }), { trackUndo: true });
  }, [commitBundle]);

  const createExport = useCallback((kind: ExportKind) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }

    const job = createExportJob({
      bundle: current,
      kind,
      viewport: previewDevice
    });
    const issues = current.qualityIssues.length > 0 ? current.qualityIssues : runKoreanQualityAudit(current);
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      exportJobs: [job, ...current.exportJobs],
      qualityIssues: issues,
      updatedAt: job.createdAt
    }), { trackUndo: true });
  }, [commitBundle, previewDevice]);

  const applyDesignSystem = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }

    const designSystem = learnDesignSystem(current);
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      designSystem,
      updatedAt: designSystem.createdAt
    }), { trackUndo: true });
  }, [commitBundle]);

  const addShareLink = useCallback((access: "view" | "comment" | "edit") => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }

    const shareLink = createShareLink({ bundle: current, access });
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      shareLinks: [shareLink, ...current.shareLinks],
      updatedAt: shareLink.createdAt
    }), { trackUndo: true });
  }, [commitBundle]);

  const addCanvaHandoff = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }

    const handoff = createCanvaHandoff({ bundle: current });
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      handoffPackages: [handoff, ...current.handoffPackages],
      updatedAt: handoff.createdAt
    }), { trackUndo: true });
  }, [commitBundle]);

  const addAgentHandoff = useCallback((target: "codex" | "claudeCode" | "cursor" | "localAgent" | "webAgent") => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }

    const handoff = createAgentHandoff({ bundle: current, target });
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      handoffPackages: [handoff, ...current.handoffPackages],
      updatedAt: handoff.createdAt
    }), { trackUndo: true });
  }, [commitBundle]);

  const createTopShareLink = useCallback(() => {
    addShareLink("view");
    setTweaksEnabled(true);
  }, [addShareLink]);

  const createTopExport = useCallback(() => {
    createExport("html");
    setTweaksEnabled(true);
  }, [createExport]);

  const cyclePreviewZoom = useCallback(() => {
    setPreviewZoom((current) => current === 100 ? 90 : current === 90 ? 75 : 100);
  }, []);

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

  const tweakProfile = getTweakProfile(projectBundle);

  return (
    <main className={presentMode ? "studio-editor present-mode" : "studio-editor"}>
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
            <button
              className={creationMode === "prototype" ? "active" : ""}
              type="button"
              onClick={() => setCreationMode("prototype")}
            >
              Prototype
            </button>
            <button
              className={creationMode === "slideDeck" ? "active" : ""}
              type="button"
              onClick={() => setCreationMode("slideDeck")}
            >
              <Presentation size={14} /> Slide deck
            </button>
            <button
              className={creationMode === "template" ? "active" : ""}
              type="button"
              onClick={() => setCreationMode("template")}
            >
              From template
            </button>
            <button
              className={creationMode === "other" ? "active" : ""}
              type="button"
              onClick={() => setCreationMode("other")}
            >
              Other
            </button>
          </div>
          <div className="fidelity-grid" aria-label="Fidelity target">
            <button
              className={fidelityTarget === "wireframe" ? "active" : ""}
              type="button"
              onClick={() => setFidelityTarget("wireframe")}
            >
              <span>Wireframe</span>
              <small>빠른 구조와 흐름</small>
            </button>
            <button
              className={fidelityTarget === "highFidelity" ? "active" : ""}
              type="button"
              onClick={() => setFidelityTarget("highFidelity")}
            >
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
          <div className="preset-grid" aria-label="Korean presets">
            <button
              className={activePreset === "saasLanding" ? "active" : ""}
              type="button"
              onClick={() => createFromPrompt("saasLanding")}
            >
              SaaS 랜딩
            </button>
            <button
              className={activePreset === "pitchDeck" ? "active" : ""}
              type="button"
              onClick={() => createFromPrompt("pitchDeck")}
            >
              피치덱
            </button>
            <button
              className={activePreset === "mobileApp" ? "active" : ""}
              type="button"
              onClick={() => createFromPrompt("mobileApp")}
            >
              모바일 앱
            </button>
          </div>
        </section>

        <section className="prompt-composer" aria-label="Design prompt composer">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            aria-label="Prompt"
          />
          <div className="composer-actions">
            <button
              type="button"
              aria-label="Attach image context"
              onClick={() => addContextAttachment("image", "제품 스크린샷.png")}
            >
              <Paperclip size={15} /> Image
            </button>
            <button type="button" aria-label="Voice prompt"><Mic size={15} /></button>
            <button type="button" onClick={() => addContextAttachment("slideDeck", "기존 발표자료.pptx")}><Import size={15} /> PPTX</button>
            <button type="button" onClick={() => addContextAttachment("document", "제품 요구사항.docx")}>DOCX</button>
            <button type="button" onClick={() => addContextAttachment("spreadsheet", "시장 데이터.xlsx")}>XLSX</button>
            <button type="button" onClick={() => addContextAttachment("webCapture", "https://example.com")}>Web</button>
            <button className="send-button" type="button" onClick={() => createFromPrompt()}><Send size={15} /> Send</button>
          </div>
          <div className="context-chips" data-testid="context-attachments">
            {contextAttachments.length === 0 ? (
              <span>첨부 컨텍스트 없음</span>
            ) : contextAttachments.map((attachment) => (
              <span key={attachment.id}>{attachment.name} · {attachment.status}</span>
            ))}
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
            <button type="button" onClick={createTopShareLink}><Share2 size={15} /> Share</button>
            <button className="export-button" type="button" onClick={createTopExport}><Download size={15} /> Export</button>
            <span className="avatar">KD</span>
          </div>
        </header>

        <div className="studio-toolbar" aria-label="Canvas tools">
          <div className="history-tools">
            <button type="button" onClick={reloadSample}><RefreshCw size={15} /></button>
            <button type="button" onClick={clearSavedState}><RotateCcw size={15} /></button>
          </div>
          <div className="tool-spacer" />
          <div className="device-tools" aria-label="Preview devices">
            <button
              className={previewDevice === "desktop" ? "active" : ""}
              type="button"
              onClick={() => setPreviewDevice("desktop")}
            >
              Desktop
            </button>
            <button
              className={previewDevice === "tablet" ? "active" : ""}
              type="button"
              onClick={() => setPreviewDevice("tablet")}
            >
              Tablet
            </button>
            <button
              className={previewDevice === "mobile" ? "active" : ""}
              type="button"
              onClick={() => setPreviewDevice("mobile")}
            >
              Mobile
            </button>
          </div>
          <label className="toggle-control" data-testid="tweaks-toggle">
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
            <button className={previewZoom === 100 ? "" : "active"} type="button" onClick={cyclePreviewZoom}>
              <ZoomIn size={15} /> {previewZoom}%
            </button>
            <button className={presentMode ? "active" : ""} type="button" onClick={() => setPresentMode((current) => !current)}>
              {presentMode ? "Exit present" : "Present"} <ChevronDown size={15} />
            </button>
          </div>
        </div>

        <section className={tweaksEnabled ? "canvas-grid tweaks-open" : "canvas-grid"}>
          <div className="canvas-surface">
            <div className="canvas-meta">
              <div>
                <span>Phase 02 Direct Canvas</span>
                <h1>{projectBundle.title}</h1>
              </div>
              <span className={isPreviewReady ? "stage-status ready" : "stage-status"}>
                {isPreviewReady ? selectedNode ? `selected ${selectedNode.kind}` : "ready" : "booting"}
              </span>
            </div>
            <PreviewFrame
              bundle={projectBundle}
              nonce={nonce}
              onReady={() => setIsPreviewReady(true)}
              onRuntimeError={appendDiagnostic}
              onConsoleError={appendDiagnostic}
              onBridgeFailure={appendDiagnostic}
              onNodeRegistry={handleNodeRegistry}
              onNodeSelected={handleNodeSelected}
              onNodeHovered={handleNodeHovered}
              selectedNode={selectedRect}
              hoveredNode={hoveredRect}
              device={previewDevice}
              zoom={previewZoom}
            />
          </div>

          {tweaksEnabled ? (
            <aside className="tweaks-rail" aria-label="Tweaks panel">
              <section className="tweak-card inspector-card" data-testid="selection-inspector">
                <div className="inspector-heading">
                  <div>
                    <h2>Inspector</h2>
                    <p>{selectedNode ? `${selectedNode.kind} · ${selectedNode.tagName}` : "캔버스 요소를 선택하세요"}</p>
                  </div>
                  <span>{projectBundle.patches.length} patches</span>
                </div>

                {selectedNode && selectedNodeId ? (
                  <>
                    <label className="field-stack">
                      <span>선택 텍스트</span>
                      <textarea
                        data-testid="selected-text-input"
                        value={textDraft}
                        onChange={(event) => setTextDraft(event.target.value)}
                      />
                    </label>
                    <div className="control-grid">
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "setText", textDraft)}>
                        텍스트 적용
                      </button>
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "setStyle", { color: "#2f9f8f" })}>
                        텍스트 틸
                      </button>
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "setStyle", { backgroundColor: "#fff8df" })}>
                        배경 옐로
                      </button>
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "setStyle", { borderRadius: "28px" })}>
                        라운드 크게
                      </button>
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "move", { x: 18, y: 0 })}>
                        오른쪽 이동
                      </button>
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "resize", { width: Math.max(180, (selectedRect?.width ?? 220) + 40) })}>
                        넓게
                      </button>
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "align", "center")}>
                        가운데 정렬
                      </button>
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "reorder", { order: -1 })}>
                        앞으로 정렬
                      </button>
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "setVisibility", false)}>
                        숨기기
                      </button>
                      <button type="button" onClick={() => applyPatch(selectedNodeId, "setVisibility", true)}>
                        보이기
                      </button>
                    </div>

                    <label className="field-stack">
                      <span>코멘트</span>
                      <textarea
                        data-testid="comment-input"
                        value={commentDraft}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        placeholder="이 영역에 원하는 변경을 남기기"
                      />
                    </label>
                    <div className="control-grid">
                      <button type="button" onClick={addComment}>코멘트 추가</button>
                      <button type="button" onClick={saveVersion}>버전 저장</button>
                      <button type="button" disabled={undoStack.length === 0} onClick={undo}>Undo</button>
                      <button type="button" disabled={redoStack.length === 0} onClick={redo}>Redo</button>
                    </div>
                  </>
                ) : (
                  <p className="empty-inspector">iframe 안의 제목, 버튼, 이미지, 카드, 섹션을 클릭하면 여기서 바로 수정할 수 있습니다.</p>
                )}

                <div className="mini-list" data-testid="comments-list">
                  <strong>Comments</strong>
                  {projectBundle.comments.length === 0 ? <span>아직 없음</span> : projectBundle.comments.slice(0, 3).map((comment) => (
                    <span key={comment.id}>{comment.body}</span>
                  ))}
                </div>
                <div className="mini-list" data-testid="versions-list">
                  <strong>Versions</strong>
                  {projectBundle.versions.length === 0 ? <span>아직 없음</span> : projectBundle.versions.slice(0, 3).map((version) => (
                    <span key={version.id}>{version.label} · {version.patchCount} patches</span>
                  ))}
                </div>
              </section>
              <section className="tweak-card" data-testid="tweak-profile">
                <h2>{tweakProfile.title}</h2>
                <p className="tweak-description">{tweakProfile.description}</p>
                {tweakProfile.groups.map((group) => (
                  <TweakSegment
                    key={group.key}
                    label={group.label}
                    options={group.options.map((option) => ({
                      label: option.label,
                      active: tweaks[group.key] === option.value,
                      onClick: () => rebuildWithTweaks(writeTweakValue(tweaks, group.key, option.value))
                    }))}
                  />
                ))}
              </section>
              <section className="tweak-card asset-card" data-testid="asset-manifest">
                <h2>Context & Assets</h2>
                <div className="source-meta">
                  <span>{projectBundle.source.kind}</span>
                  {projectBundle.source.mode ? <span>{projectBundle.source.mode}</span> : null}
                  {projectBundle.source.fidelity ? <span>{projectBundle.source.fidelity}</span> : null}
                  {projectBundle.source.preset ? <span>{projectBundle.source.preset}</span> : null}
                </div>
                <div className="mini-list">
                  <strong>Attached context</strong>
                  {(projectBundle.source.contextAttachments ?? []).length === 0 ? <span>아직 없음</span> : projectBundle.source.contextAttachments?.map((attachment) => (
                    <span key={attachment.id}>{attachment.name} · {attachment.status}</span>
                  ))}
                </div>
                <div className="mini-list">
                  <strong>Asset manifest</strong>
                  {projectBundle.assets.length === 0 ? <span>비어 있음</span> : projectBundle.assets.slice(0, 5).map((asset) => (
                    <span key={asset.id}>{asset.kind} · {asset.status}</span>
                  ))}
                </div>
              </section>
              <section className="tweak-card export-card" data-testid="export-panel">
                <h2>Export</h2>
                <div className="export-actions">
                  <button type="button" onClick={() => createExport("html")}>HTML</button>
                  <button type="button" onClick={() => createExport("png")}>PNG</button>
                  <button type="button" onClick={() => createExport("pdf")}>PDF</button>
                  <button type="button" onClick={() => createExport("zip")}>ZIP</button>
                  <button type="button" onClick={() => createExport("pptx")}>PPTX</button>
                </div>
                <button className="quality-button" type="button" onClick={runQualityCheck}>
                  디자인 리뷰
                </button>
                <div className="mini-list" data-testid="export-jobs">
                  <strong>Jobs</strong>
                  {projectBundle.exportJobs.length === 0 ? <span>아직 없음</span> : projectBundle.exportJobs.slice(0, 5).map((job) => (
                    <span key={job.id}>{job.kind.toUpperCase()} · {job.viewport} · {job.status}</span>
                  ))}
                </div>
                <div className="mini-list" data-testid="quality-issues">
                  <strong>Quality</strong>
                  {projectBundle.qualityIssues.length === 0 ? <span>검사 전</span> : projectBundle.qualityIssues.slice(0, 5).map((issue) => (
                    <span key={issue.id}>{issue.code} · {issue.message}</span>
                  ))}
                </div>
              </section>
              <section className="tweak-card handoff-card" data-testid="handoff-panel">
                <h2>Design System & Handoff</h2>
                <button className="quality-button" type="button" onClick={applyDesignSystem}>
                  디자인 시스템 학습
                </button>
                <div className="mini-list" data-testid="design-system-state">
                  <strong>Design system</strong>
                  {projectBundle.designSystem ? (
                    <>
                      <span>{projectBundle.designSystem.name}</span>
                      <span>{Object.values(projectBundle.designSystem.colors).slice(0, 3).join(" · ")}</span>
                    </>
                  ) : <span>아직 없음</span>}
                </div>
                <div className="handoff-actions">
                  <button type="button" onClick={() => addShareLink("view")}>View link</button>
                  <button type="button" onClick={() => addShareLink("comment")}>Comment link</button>
                  <button type="button" onClick={() => addShareLink("edit")}>Edit link</button>
                  <button type="button" onClick={addCanvaHandoff}>Canva</button>
                  <button type="button" onClick={() => addAgentHandoff("codex")}>Codex</button>
                  <button type="button" onClick={() => addAgentHandoff("claudeCode")}>Claude Code</button>
                  <button type="button" onClick={() => addAgentHandoff("cursor")}>Cursor</button>
                  <button type="button" onClick={() => addAgentHandoff("localAgent")}>Local agent</button>
                  <button type="button" onClick={() => addAgentHandoff("webAgent")}>Web agent</button>
                </div>
                <div className="mini-list" data-testid="share-links">
                  <strong>Share</strong>
                  {projectBundle.shareLinks.length === 0 ? <span>아직 없음</span> : projectBundle.shareLinks.slice(0, 3).map((link) => (
                    <span key={link.id}>{link.access} · {link.url}</span>
                  ))}
                </div>
                <div className="mini-list" data-testid="handoff-packages">
                  <strong>Handoff</strong>
                  {projectBundle.handoffPackages.length === 0 ? <span>아직 없음</span> : projectBundle.handoffPackages.slice(0, 8).map((handoff) => (
                    <span key={handoff.id}>{handoff.target} · {handoff.instructionsPath}</span>
                  ))}
                </div>
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

function getTweakProfile(bundle: ProjectBundle): TweakProfile {
  if (bundle.source.preset) {
    return TWEAK_PROFILES[bundle.source.preset];
  }
  if (bundle.source.kind === "fixture") {
    return TWEAK_PROFILES.fixture;
  }
  return TWEAK_PROFILES.generic;
}

function writeTweakValue(
  current: ArtifactTweaks,
  key: keyof ArtifactTweaks,
  value: ArtifactTweaks[keyof ArtifactTweaks]
): ArtifactTweaks {
  if (key === "feedColumns" && (value === 2 || value === 3 || value === 4)) {
    return { ...current, feedColumns: value };
  }
  if (key === "density" && (value === "compact" || value === "comfortable")) {
    return { ...current, density: value };
  }
  if (key === "pointColor" && (value === "coral" || value === "teal" || value === "blue")) {
    return { ...current, pointColor: value };
  }
  return current;
}

function readArtifactTweaks(value: Record<string, unknown>): ArtifactTweaks {
  return {
    feedColumns: value.feedColumns === 2 || value.feedColumns === 3 || value.feedColumns === 4
      ? value.feedColumns
      : DEFAULT_TWEAKS.feedColumns,
    density: value.density === "compact" || value.density === "comfortable"
      ? value.density
      : DEFAULT_TWEAKS.density,
    pointColor: value.pointColor === "coral" || value.pointColor === "teal" || value.pointColor === "blue"
      ? value.pointColor
      : DEFAULT_TWEAKS.pointColor
  };
}

function createTweakPatches(
  current: ProjectBundle,
  previous: ArtifactTweaks,
  next: ArtifactTweaks,
  profileId: TweakProfileId
): EditPatch[] {
  const createdAt = new Date().toISOString();
  const patches: EditPatch[] = [];

  if (profileId !== "fixture") {
    patches.push(...createGeneratedTweakPatches(current, previous, next, profileId, createdAt));
    return patches;
  }

  const featureGridId = findNodeIdsByClass(current, "feature-grid")[0];
  const heroId = findNodeIdsByClass(current, "hero")[0];

  if (featureGridId && previous.feedColumns !== next.feedColumns) {
    patches.push(createPatch(current, featureGridId, "setStyle", {
      gridTemplateColumns: `repeat(${next.feedColumns}, minmax(0, 1fr))`
    }, createdAt));
  }

  if (featureGridId && previous.density !== next.density) {
    patches.push(createPatch(current, featureGridId, "setStyle", {
      gap: next.density === "compact" ? "12px" : "18px"
    }, createdAt));
  }

  if (heroId && previous.density !== next.density) {
    patches.push(createPatch(current, heroId, "setStyle", {
      padding: next.density === "compact" ? "clamp(24px, 5vw, 40px)" : "clamp(28px, 7vw, 54px)"
    }, createdAt));
  }

  if (previous.pointColor !== next.pointColor) {
    for (const node of Object.values(current.editGraph.nodes)) {
      if (node.kind === "text" && ["01", "02", "03", "K-Design Studio"].includes(node.textPreview ?? "")) {
        patches.push(createPatch(current, node.id, "setStyle", { color: POINT_COLORS[next.pointColor] }, createdAt));
      }
    }
  }

  return patches;
}

function createGeneratedTweakPatches(
  current: ProjectBundle,
  previous: ArtifactTweaks,
  next: ArtifactTweaks,
  profileId: TweakProfileId,
  createdAt: string
): EditPatch[] {
  const patches: EditPatch[] = [];
  const rootClass = profileId === "pitchDeck"
    ? "generated-deck"
    : profileId === "mobileApp"
      ? "generated-mobile"
      : profileId === "saasLanding"
        ? "generated-landing"
        : "";
  const rootId = rootClass ? findNodeIdsByClass(current, rootClass)[0] : current.editGraph.rootNodeIds[0];

  if (rootId && previous.pointColor !== next.pointColor) {
    patches.push(createPatch(current, rootId, "setStyle", {
      background: ACCENT_BACKGROUNDS[next.pointColor]
    }, createdAt));
  }

  if (profileId === "saasLanding") {
    addLandingTweakPatches(current, previous, next, patches, createdAt);
  } else if (profileId === "pitchDeck") {
    addDeckTweakPatches(current, previous, next, patches, createdAt);
  } else if (profileId === "mobileApp") {
    addMobileTweakPatches(current, previous, next, patches, createdAt);
  } else if (rootId && previous.density !== next.density) {
    patches.push(createPatch(current, rootId, "setStyle", {
      padding: next.density === "compact" ? "24px" : "clamp(28px, 6vw, 60px)"
    }, createdAt));
  }

  if (previous.pointColor !== next.pointColor) {
    for (const node of Object.values(current.editGraph.nodes)) {
      const text = node.textPreview ?? "";
      if (node.kind === "text" && (text.includes("·") || text === "01" || text === "02" || text === "03")) {
        patches.push(createPatch(current, node.id, "setStyle", { color: POINT_COLORS[next.pointColor] }, createdAt));
      }
    }
  }

  return patches;
}

function addLandingTweakPatches(
  current: ProjectBundle,
  previous: ArtifactTweaks,
  next: ArtifactTweaks,
  patches: EditPatch[],
  createdAt: string
): void {
  const heroId = findNodeIdsByClass(current, "generated-hero")[0];
  const cardStackId = findNodeIdsByClass(current, "generated-card-stack")[0];
  if (heroId && previous.feedColumns !== next.feedColumns) {
    patches.push(createPatch(current, heroId, "setStyle", {
      gap: next.feedColumns === 2 ? "22px" : next.feedColumns === 3 ? "30px" : "42px",
      "align-items": next.feedColumns === 4 ? "flex-start" : "center"
    }, createdAt));
  }
  if (heroId && previous.density !== next.density) {
    patches.push(createPatch(current, heroId, "setStyle", {
      padding: next.density === "compact" ? "clamp(24px, 5vw, 42px)" : "clamp(28px, 6vw, 56px)"
    }, createdAt));
  }
  if (cardStackId && (previous.feedColumns !== next.feedColumns || previous.density !== next.density)) {
    patches.push(createPatch(current, cardStackId, "setStyle", {
      gap: next.density === "compact" ? "10px" : next.feedColumns === 4 ? "18px" : "14px"
    }, createdAt));
  }
}

function addDeckTweakPatches(
  current: ProjectBundle,
  previous: ArtifactTweaks,
  next: ArtifactTweaks,
  patches: EditPatch[],
  createdAt: string
): void {
  const gridId = findNodeIdsByClass(current, "generated-deck-grid")[0];
  const coverId = findNodeIdsByClass(current, "generated-deck-cover")[0];
  const outlineId = findNodeIdsByClass(current, "generated-deck-outline")[0];
  if (gridId && previous.feedColumns !== next.feedColumns) {
    patches.push(createPatch(current, gridId, "setStyle", {
      "grid-template-columns": next.feedColumns === 2 ? "minmax(0, 1fr)" : next.feedColumns === 3 ? "minmax(0, 1.15fr) minmax(280px, .85fr)" : "minmax(0, .9fr) minmax(260px, 1.1fr)"
    }, createdAt));
  }
  if (gridId && previous.density !== next.density) {
    patches.push(createPatch(current, gridId, "setStyle", {
      gap: next.density === "compact" ? "14px" : "22px"
    }, createdAt));
  }
  if (coverId && previous.density !== next.density) {
    patches.push(createPatch(current, coverId, "setStyle", {
      padding: next.density === "compact" ? "clamp(24px, 5vw, 42px)" : "clamp(28px, 6vw, 56px)"
    }, createdAt));
  }
  if (outlineId && previous.density !== next.density) {
    patches.push(createPatch(current, outlineId, "setStyle", {
      gap: next.density === "compact" ? "10px" : "16px"
    }, createdAt));
  }
}

function addMobileTweakPatches(
  current: ProjectBundle,
  previous: ArtifactTweaks,
  next: ArtifactTweaks,
  patches: EditPatch[],
  createdAt: string
): void {
  const phoneId = findNodeIdsByClass(current, "generated-phone-frame")[0];
  const heroId = findNodeIdsByClass(current, "generated-mobile-hero")[0];
  const actionsId = findNodeIdsByClass(current, "generated-mobile-actions")[0];
  if (phoneId && previous.feedColumns !== next.feedColumns) {
    patches.push(createPatch(current, phoneId, "setStyle", {
      width: next.feedColumns === 2 ? "min(100%, 390px)" : next.feedColumns === 3 ? "min(100%, 430px)" : "min(100%, 460px)"
    }, createdAt));
  }
  if (phoneId && previous.density !== next.density) {
    patches.push(createPatch(current, phoneId, "setStyle", {
      padding: next.density === "compact" ? "18px" : "22px"
    }, createdAt));
  }
  if (heroId && previous.density !== next.density) {
    patches.push(createPatch(current, heroId, "setStyle", {
      padding: next.density === "compact" ? "20px" : "26px"
    }, createdAt));
  }
  if (actionsId && previous.density !== next.density) {
    patches.push(createPatch(current, actionsId, "setStyle", {
      gap: next.density === "compact" ? "8px" : "12px"
    }, createdAt));
  }
}

function createPatch(
  bundle: ProjectBundle,
  nodeId: string,
  op: EditPatch["op"],
  value: unknown,
  createdAt: string
): EditPatch {
  return {
    id: createLocalId("patch"),
    nodeId,
    op,
    value,
    source: "tweaks",
    baseRevision: bundle.baseRevision,
    createdAt
  };
}

function createLocalId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}`;
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
