"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  AgentRuntime,
  BundleVersion,
  CanvasComment,
  CanvasConstraints,
  CanvasObject,
  CanvasOperation,
  ComponentStateRule,
  ContextAttachment,
  CreationMode,
  DevCodeSnippetKind,
  EditPatch,
  ExportKind,
  FidelityTarget,
  KoreanPreset,
  PresentationState,
  PreviewDevice,
  PreviewError,
  PreviewNodeRect,
  ParsedContextArtifact,
  ProjectAssetUrl,
  PrototypeActionKind,
  PrototypeInteraction,
  PrototypeTrigger,
  PrototypeVariable,
  ProjectBundle,
  SlideDeck,
  SlideFeedback,
  AssetRef,
  DataBinding,
  GeneratedNote,
  SourceRecord
} from "@kdesign/editor-core";
import {
  BASIC_LANDING_FIXTURE_HTML,
  ProjectBundleSchema,
  addCodeComponentReference,
  addComponentStateRule,
  applyDataBindingToBundle,
  addPrototypeInteraction,
  addPrototypeVariable,
  addSlide,
  addSlideBlock,
  addSlideFeedback,
  approveDesignSystemItems,
  applyCanvasOperationToBundle,
  applyEditPatchToBundle,
  applyEditPatchesToBundle,
  buildEditGraph,
  createPresentationState,
  createSelectedRegionRemix,
  createSlideDeck,
  createGeneratedProjectBundle,
  createMockContextAttachment,
  createExportJob,
  createExportArtifactRecord,
  createExportVerification,
  createStandaloneHtml,
  appendExportArtifact,
  createPublishPreview,
  appendPublishPreview,
  createCodeRoundtripPackage,
  appendCodeRoundtripPackage,
  validateCodeRoundtripImport,
  appendCodeRoundtripImport,
  createDevModeInspectReport,
  appendDevModeReport,
  createDevCodeSnippet,
  appendDevCodeSnippet,
  markReadyForDev,
  markReadyForDevChanged,
  createVersionDiffRecord,
  appendVersionDiffRecord,
  createAssetDownloadRecord,
  appendAssetDownloadRecord,
  createGeneratedDesignContext,
  createGeneratedSourceNotes,
  createComponentPlaygroundState,
  createDataBinding,
  createIngestionJob,
  createProjectAssetUrl,
  createSourceRecord,
  createSyncEnvelope,
  createWebSnapshot,
  createAgentContextPackage,
  createAgentHandoff,
  createCanvaHandoff,
  createShareLink,
  deriveCanvasGraph,
  ensureCanvasGraph,
  exportAgentRecipe,
  extractDesignSystemCandidates,
  findCanvasObjectByNodeId,
  learnDesignSystem,
  listCanvasObjects,
  mapTokenToCode,
  markSyncDiverged,
  playPrototypeInteraction,
  parseCodebaseFolderManifest,
  parseCsvDataSource,
  parseDocumentSource,
  parseFigmaExportSource,
  parseSlideDeckSource,
  parseSpreadsheetSource,
  previewDataBinding,
  publishDesignSystem,
  promoteVariationDirection,
  rejectUnsupportedSource,
  relinkAssetSource,
  replaceAssetReference,
  rebaseRevisionReferences,
  rejectDesignSystemItems,
  remixDesignSystem,
  rollbackDesignSystem,
  runKoreanQualityAudit,
  setSlideDeckView,
  setSlideNotes,
  findNodeIdsByClass,
  ingestAgentOutput,
  normalizeHtml,
  parseAgentOutputJson,
  stableHash,
  validatePublicSourceUrl,
  validateSyncEnvelope
} from "@kdesign/editor-core";
import { createPreviewNonce } from "@kdesign/preview-runtime";
import workerExportBundle from "../tests/fixtures/phase-10-worker-export-bundle.json";

import { DiagnosticsPanel } from "./diagnostics-panel";
import { PreviewFrame } from "./preview-frame";
import { CanvasLayerTree } from "./canvas-layer-tree";
import { CanvasObjectInspector } from "./canvas-object-inspector";
import { ComponentInstancePanel } from "./component-instance-panel";
import { ComponentPlaygroundPanel, type ComponentPlaygroundState } from "./component-playground-panel";
import { DesignSystemPanel } from "./design-system-panel";
import { DevModePanel } from "./dev-mode-panel";
import { ExportPublishPanel } from "./export-publish-panel";
import { PresentationMode } from "./presentation-mode";
import { PrototypePanel } from "./prototype-panel";
import { SlideDeckPanel } from "./slide-deck-panel";
import { VariationComparePanel } from "./variation-compare-panel";
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

const DESIGN_AGENT_STEPS = [
  { number: "01", title: "Ask", detail: "로고, 제품샷, UI, 색상, 폰트, 가이드 확인" },
  { number: "02", title: "Search", detail: "공식 브랜드 페이지와 제품 자료 우선" },
  { number: "03", title: "Verify", detail: "기억으로 색을 찍지 않고 실제 파일에서 추출" },
  { number: "04", title: "3 Directions", detail: "요구가 흐릿하면 세 가지 디자인 방향 제안" },
  { number: "05", title: "Iterate", detail: "초안, 변형, 조정값을 차례로 보여주며 개선" }
];

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
  const preserveInvalidLocalProjectRef = useRef(false);
  const [nonce, setNonce] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<PreviewError[]>([]);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [chatTab, setChatTab] = useState<"chat" | "comments">("chat");
  const [tweaksEnabled, setTweaksEnabled] = useState(true);
  const [toolMode, setToolMode] = useState<"comment" | "edit" | "draw">("edit");
  const [devModeOpen, setDevModeOpen] = useState(false);
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
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [undoStack, setUndoStack] = useState<ProjectBundle[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectBundle[]>([]);
  const [playgroundState, setPlaygroundState] = useState<ComponentPlaygroundState | null>(null);
  const [presentationState, setPresentationState] = useState<PresentationState | null>(null);
  const [webSnapshotUrl, setWebSnapshotUrl] = useState("https://example.com/product");

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
    const ensuredBundle = ensureCanvasGraph(bundle);
    if (options.trackUndo && current) {
      setUndoStack((stack) => [...stack, current].slice(-30));
      setRedoStack([]);
    }
    if (!preserveInvalidLocalProjectRef.current) {
      saveLocalProjectBundle(ensuredBundle);
    }
    projectBundleRef.current = ensuredBundle;
    setProjectBundle(ensuredBundle);
    resetRuntime();
  }, [resetRuntime]);

  const loadOrCreateBundle = useCallback(() => {
    const saved = loadLocalProjectBundle();
    if (saved.status === "loaded") {
      const ensuredSaved = ensureCanvasGraph(saved.bundle);
      preserveInvalidLocalProjectRef.current = false;
      setTweaks(readArtifactTweaks(saved.bundle.tweakValues));
      saveLocalProjectBundle(ensuredSaved);
      setProjectBundle(ensuredSaved);
      projectBundleRef.current = ensuredSaved;
      resetRuntime();
      return;
    }
    if (saved.status === "invalid") {
      preserveInvalidLocalProjectRef.current = true;
      const fallback = ensureCanvasGraph(createFixtureBundle(tweaks));
      setProjectBundle(fallback);
      projectBundleRef.current = fallback;
      resetRuntime();
      const loadError: PreviewError = {
        id: createLocalId("local_load_error"),
        source: "bridge",
        severity: "error",
        code: "local-project-load-rejected",
        message: `Saved project was preserved but could not load: ${saved.error}`,
        createdAt: new Date().toISOString()
      };
      setDiagnostics((current) => [loadError, ...current].slice(0, 30));
      return;
    }

    preserveInvalidLocalProjectRef.current = false;
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
    setSelectedNodeId(null);
    setSelectedObjectId(null);
  }, [commitBundle, tweaks]);

  const clearSavedState = useCallback(() => {
    clearLocalProjectBundle();
    preserveInvalidLocalProjectRef.current = false;
    commitBundle(createFixtureBundle(tweaks));
    setSelectedNodeId(null);
    setSelectedObjectId(null);
  }, [commitBundle, tweaks]);

  const appendDiagnostic = useCallback((error: PreviewError) => {
    setDiagnostics((current) => [error, ...current].slice(0, 30));
  }, []);

  const reportWorkflowError = useCallback((code: string, error: unknown) => {
    appendDiagnostic({
      id: createLocalId("workflow_error"),
      source: "bridge",
      severity: "warning",
      code,
      message: error instanceof Error ? error.message : "Workflow update rejected.",
      createdAt: new Date().toISOString()
    });
  }, [appendDiagnostic]);

  const canvasGraph = useMemo(
    () => projectBundle ? projectBundle.canvasGraph ?? deriveCanvasGraph(projectBundle) : undefined,
    [projectBundle]
  );
  const canvasObjects = useMemo(() => canvasGraph ? listCanvasObjects(canvasGraph) : [], [canvasGraph]);
  const selectedObject = selectedObjectId && canvasGraph ? canvasGraph.objects[selectedObjectId] : undefined;
  const resolvedSelectedNodeId = selectedObject?.nodeId ?? selectedNodeId;
  const selectedNode = resolvedSelectedNodeId && projectBundle ? projectBundle.editGraph.nodes[resolvedSelectedNodeId] : undefined;
  const selectedRect = resolvedSelectedNodeId ? nodeRects[resolvedSelectedNodeId] : undefined;
  const hoveredRect = hoveredNodeId ? nodeRects[hoveredNodeId] : undefined;
  const dataBindingPreview = useMemo(() => {
    const binding = projectBundle?.dataBindings[0];
    const source = binding ? projectBundle?.dataSources.find((item) => item.id === binding.dataSourceId) : undefined;
    return binding && source ? previewDataBinding(source, binding) : undefined;
  }, [projectBundle]);
  const syncDiagnostics = useMemo(() => (
    projectBundle?.syncEnvelope ? validateSyncEnvelope(projectBundle, projectBundle.syncEnvelope) : []
  ), [projectBundle]);

  useEffect(() => {
    setTextDraft(selectedNode?.textPreview ?? "");
  }, [selectedNode?.id, selectedNode?.textPreview]);

  const handleNodeRegistry = useCallback((nodes: PreviewNodeRect[]) => {
    setNodeRects(Object.fromEntries(nodes.map((node) => [node.nodeId, node])));
  }, []);

  const selectCanvasObject = useCallback((objectId: string) => {
    const object = canvasGraph?.objects[objectId];
    if (!object) {
      return;
    }
    setSelectedObjectId(object.id);
    setSelectedNodeId(object.nodeId ?? null);
    setHoveredNodeId(null);
  }, [canvasGraph]);

  const handleNodeSelected = useCallback((node: PreviewNodeRect) => {
    setNodeRects((current) => ({ ...current, [node.nodeId]: node }));
    const object = canvasGraph ? findCanvasObjectByNodeId(canvasGraph, node.nodeId) : undefined;
    setSelectedObjectId(object?.id ?? null);
    setSelectedNodeId(node.nodeId);
    setHoveredNodeId(null);
  }, [canvasGraph]);

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
    const canvasObject = current.canvasGraph ? findCanvasObjectByNodeId(current.canvasGraph, nodeId) : undefined;
    if (canvasObject?.locked) {
      appendDiagnostic({
        id: createLocalId("patch_error"),
        source: "bridge",
        severity: "warning",
        code: "patch_rejected",
        message: `Canvas object is locked: ${canvasObject.id}`,
        createdAt: new Date().toISOString()
      });
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
      const object = nextBundle.canvasGraph ? findCanvasObjectByNodeId(nextBundle.canvasGraph, nodeId) : undefined;
      setSelectedObjectId(object?.id ?? null);
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

  const commitCanvasOperation = useCallback((
    op: CanvasOperation["op"],
    value: unknown,
    objectId = selectedObjectId
  ) => {
    const current = projectBundleRef.current;
    if (!current || !objectId) {
      appendDiagnostic({
        id: createLocalId("canvas_op_error"),
        source: "bridge",
        severity: "warning",
        code: "patch_rejected",
        message: "Canvas operation requires a selected object.",
        createdAt: new Date().toISOString()
      });
      return;
    }

    const operation: CanvasOperation = {
      id: createLocalId("canvas_op"),
      objectId,
      op,
      value,
      source: "canvas",
      baseRevision: current.baseRevision,
      createdAt: new Date().toISOString()
    };

    try {
      const nextBundle = applyCanvasOperationToBundle(current, operation);
      commitBundle(nextBundle, { trackUndo: true });
      setSelectedObjectId(objectId);
      const nextObject = nextBundle.canvasGraph?.objects[objectId];
      setSelectedNodeId(nextObject?.nodeId ?? selectedNodeId);
    } catch (error) {
      appendDiagnostic({
        id: createLocalId("canvas_op_error"),
        source: "bridge",
        severity: "warning",
        code: "patch_rejected",
        message: error instanceof Error ? error.message : "Canvas operation was rejected.",
        createdAt: new Date().toISOString()
      });
    }
  }, [appendDiagnostic, commitBundle, selectedNodeId, selectedObjectId]);

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
    setSelectedObjectId(null);
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

  const createExport = useCallback((kind: ExportKind, diagnostics?: string[]) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }

    const cleanHtml = createStandaloneHtml(current);
    const materializedBytes = new TextEncoder().encode(cleanHtml).byteLength;
    const exportDiagnostics = diagnostics ?? (kind === "html"
      ? ["browser-materialized", "html-standalone"]
      : ["worker-required", "browser-export-request"]);
    const job = createExportJob({
      bundle: current,
      kind,
      viewport: previewDevice
    });
    const materializedJob = kind === "html"
      ? { ...job, bytes: materializedBytes, cleanHtml }
      : job;
    const issues = current.qualityIssues.length > 0 ? current.qualityIssues : runKoreanQualityAudit(current);
    const bundleWithJob = ProjectBundleSchema.parse({
      ...current,
      exportJobs: [materializedJob, ...current.exportJobs],
      qualityIssues: issues,
      updatedAt: materializedJob.createdAt
    });
    const shaInput = kind === "html"
      ? cleanHtml
      : `${bundleWithJob.id}:${materializedJob.id}:${materializedJob.kind}:${materializedJob.viewport}:worker-required`;
    const sha256 = stableHash(shaInput);
    const artifact = createExportArtifactRecord(bundleWithJob, {
      jobId: materializedJob.id,
      kind,
      filename: materializedJob.filename,
      bytes: materializedJob.bytes,
      sha256,
      viewport: materializedJob.viewport,
      filePath: kind === "html" ? `browser-materialized/${materializedJob.filename}` : `worker-required/${materializedJob.filename}`,
      diagnostics: exportDiagnostics,
      createdAt: materializedJob.createdAt
    });
    const signature = createExportVerification({
      artifactId: artifact.id,
      kind: "signature",
      status: kind === "html" ? "passed" : "degraded",
      expectedHash: sha256,
      actualHash: sha256,
      diagnostics: kind === "html" ? ["browser-materialized-signature"] : ["worker-required-signature"],
      createdAt: materializedJob.createdAt
    });
    const manifest = createExportVerification({
      artifactId: artifact.id,
      kind: "manifest",
      status: kind === "html" ? "passed" : "degraded",
      diagnostics: kind === "html" ? ["browser-materialized-manifest"] : ["worker-required-manifest"],
      createdAt: materializedJob.createdAt
    });
    const visualDiff = createExportVerification({
      artifactId: artifact.id,
      kind: "visual-diff",
      status: kind === "html" ? "passed" : "degraded",
      expectedHash: sha256,
      actualHash: sha256,
      diagnostics: kind === "html" ? ["browser-materialized-visual-diff"] : ["worker-required-visual-diff"],
      createdAt: materializedJob.createdAt
    });
    const withArtifact = appendExportArtifact(bundleWithJob, artifact, signature);
    commitBundle(ProjectBundleSchema.parse({
      ...withArtifact,
      exportVerifications: [manifest, visualDiff, ...withArtifact.exportVerifications]
    }), { trackUndo: true });
  }, [commitBundle, previewDevice]);

  const createPhase10InspectReport = useCallback((objectId: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      const rect = selectedRect
        ? { x: selectedRect.x, y: selectedRect.y, width: selectedRect.width, height: selectedRect.height }
        : undefined;
      const report = createDevModeInspectReport(current, {
        objectId,
        ...(rect ? { renderedRect: rect } : {})
      });
      commitBundle(appendDevModeReport(current, report), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("dev_mode_inspect_rejected", error);
    }
  }, [commitBundle, reportWorkflowError, selectedRect]);

  const createPhase10CodeSnippet = useCallback((objectId: string, kind: DevCodeSnippetKind) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      const snippet = createDevCodeSnippet(current, { objectId, kind });
      commitBundle(appendDevCodeSnippet(current, snippet), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("dev_code_snippet_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const markPhase10Ready = useCallback((objectId: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      const changed = markReadyForDevChanged(current, objectId);
      commitBundle(markReadyForDev(changed, {
        objectId,
        label: "Ready for dev handoff",
        reviewer: "K-Design Studio"
      }), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("ready_for_dev_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createPhase10VersionDiff = useCallback((objectId: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      const previousVersion = current.versions.find((version) => version.id !== current.baseRevision);
      const baselineVersion: BundleVersion = previousVersion ?? {
        id: `dev_baseline_${stableHash(`${current.id}:${current.baseRevision}:${objectId}`)}`,
        label: "Dev baseline",
        html: current.html.normalized,
        patchCount: current.patches.length,
        createdAt: new Date().toISOString()
      };
      const bundleWithBaseline = previousVersion
        ? current
        : ProjectBundleSchema.parse({
          ...current,
          versions: [baselineVersion, ...current.versions]
        });
      const diff = createVersionDiffRecord(bundleWithBaseline, { fromRevision: baselineVersion.id, objectIds: [objectId] });
      commitBundle(appendVersionDiffRecord(bundleWithBaseline, diff), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("version_diff_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createPhase10AssetDownload = useCallback((assetId: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      const fallbackAsset: AssetRef = {
        id: assetId,
        kind: "image",
        status: "verified",
        mimeType: "image/png",
        localPath: `${assetId}.png`
      };
      const prepared = ProjectBundleSchema.parse({
        ...current,
        assets: current.assets.some((asset) => asset.id === assetId) ? current.assets : [...current.assets, fallbackAsset],
        projectAssetUrls: upsertAssetUrls(current.projectAssetUrls, createProjectAssetUrl(current.id, assetId))
      });
      const record = createAssetDownloadRecord(prepared, { assetId });
      commitBundle(appendAssetDownloadRecord(prepared, record), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("asset_download_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createPhase10PublishPreview = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      const prepared = current.exportArtifacts.length > 0 ? current : (() => {
        createExport("html");
        return projectBundleRef.current ?? current;
      })();
      const artifactIds = prepared.exportArtifacts.map((artifact) => artifact.id);
      const preview = createPublishPreview(prepared, {
        artifactIds,
        viewports: [previewDevice],
        diagnostics: ["static-local-preview", "web-local-record"]
      });
      commitBundle(appendPublishPreview(prepared, preview), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("publish_preview_rejected", error);
    }
  }, [commitBundle, createExport, previewDevice, reportWorkflowError]);

  const createPhase10RoundtripPackage = useCallback((runtime: AgentRuntime) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      const prepared = current.exportArtifacts.length > 0 ? current : (() => {
        createExport("zip");
        return projectBundleRef.current ?? current;
      })();
      const roundtripPackage = createCodeRoundtripPackage(prepared, {
        runtime,
        artifactIds: prepared.exportArtifacts.map((artifact) => artifact.id)
      });
      commitBundle(appendCodeRoundtripPackage(prepared, roundtripPackage), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("code_roundtrip_package_rejected", error);
    }
  }, [commitBundle, createExport, reportWorkflowError]);

  const createPhase10RoundtripConflict = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      const prepared = current.codeRoundtripPackages.length > 0 ? current : (() => {
        createPhase10RoundtripPackage("codex");
        return projectBundleRef.current ?? current;
      })();
      const roundtripPackage = prepared.codeRoundtripPackages[0];
      if (!roundtripPackage) {
        throw new Error("No code roundtrip package available.");
      }
      const roundtripImport = validateCodeRoundtripImport(prepared, {
        packageId: roundtripPackage.id,
        runtime: roundtripPackage.runtime,
        sourceRevision: "source-revision-mismatch"
      });
      commitBundle(appendCodeRoundtripImport(prepared, roundtripImport), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("code_roundtrip_import_rejected", error);
    }
  }, [commitBundle, createPhase10RoundtripPackage, reportWorkflowError]);

  const loadPhase10WorkerFixture = useCallback(() => {
    try {
      const workerBundle = ProjectBundleSchema.parse(workerExportBundle);
      preserveInvalidLocalProjectRef.current = false;
      commitBundle(workerBundle, { trackUndo: true });
      setSelectedNodeId(null);
      setSelectedObjectId(null);
    } catch (error) {
      reportWorkflowError("worker_fixture_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

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

  const extractDesignSystem = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    const designSystem = extractDesignSystemCandidates(current);
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      designSystem,
      updatedAt: designSystem.updatedAt ?? new Date().toISOString()
    }), { trackUndo: true });
  }, [commitBundle]);

  const updateDesignSystem = useCallback((
    updater: (system: NonNullable<ProjectBundle["designSystem"]>, current: ProjectBundle) => NonNullable<ProjectBundle["designSystem"]>
  ) => {
    const current = projectBundleRef.current;
    if (!current?.designSystem) {
      appendDiagnostic({
        id: createLocalId("design_system_error"),
        source: "bridge",
        severity: "warning",
        code: "design_system_required",
        message: "Extract design-system candidates first.",
        createdAt: new Date().toISOString()
      });
      return;
    }
    try {
      const designSystem = updater(current.designSystem, current);
      commitBundle(ProjectBundleSchema.parse({
        ...current,
        designSystem,
        updatedAt: designSystem.updatedAt ?? new Date().toISOString()
      }), { trackUndo: true });
    } catch (error) {
      appendDiagnostic({
        id: createLocalId("design_system_error"),
        source: "bridge",
        severity: "warning",
        code: "design_system_rejected",
        message: error instanceof Error ? error.message : "Design-system update rejected.",
        createdAt: new Date().toISOString()
      });
    }
  }, [appendDiagnostic, commitBundle]);

  const approveDesignItems = useCallback((itemIds: string[]) => {
    updateDesignSystem((system) => approveDesignSystemItems(system, itemIds));
  }, [updateDesignSystem]);

  const rejectDesignItems = useCallback((itemIds: string[]) => {
    updateDesignSystem((system) => rejectDesignSystemItems(system, itemIds));
  }, [updateDesignSystem]);

  const mapDesignToken = useCallback((tokenId: string, mapping: { cssVariable?: string; tailwindClass?: string; codeReferenceId?: string }) => {
    updateDesignSystem((system) => mapTokenToCode(system, tokenId, mapping));
  }, [updateDesignSystem]);

  const addCodeReference = useCallback((input: {
    name: string;
    framework: string;
    importPath: string;
    exportName: string;
    sourcePath?: string;
    sourceUrl?: string;
    docsUrl?: string;
    storybookUrl?: string;
  }) => {
    updateDesignSystem((system) => addCodeComponentReference(system, input));
  }, [updateDesignSystem]);

  const publishCurrentDesignSystem = useCallback((label: string) => {
    updateDesignSystem((system, current) => publishDesignSystem(system, {
      label,
      sourceRevision: current.baseRevision
    }));
  }, [updateDesignSystem]);

  const remixCurrentDesignSystem = useCallback((name: string) => {
    updateDesignSystem((system) => remixDesignSystem(system, { name }));
  }, [updateDesignSystem]);

  const rollbackCurrentDesignSystem = useCallback((versionId: string) => {
    updateDesignSystem((system) => rollbackDesignSystem(system, versionId));
  }, [updateDesignSystem]);

  const previewComponentPlayground = useCallback((
    componentId: string,
    input: { variantId?: string; propValues?: Record<string, unknown>; mode?: string }
  ) => {
    if (!canvasGraph) {
      return;
    }
    try {
      setPlaygroundState(createComponentPlaygroundState({
        graph: canvasGraph,
        componentId,
        ...input
      }));
    } catch (error) {
      appendDiagnostic({
        id: createLocalId("playground_error"),
        source: "bridge",
        severity: "warning",
        code: "playground_rejected",
        message: error instanceof Error ? error.message : "Component playground state rejected.",
        createdAt: new Date().toISOString()
      });
    }
  }, [appendDiagnostic, canvasGraph]);

  const createPrototypeVariable = useCallback((input: {
    name: string;
    kind: PrototypeVariable["kind"];
    defaultValue: unknown;
    sharedComponentId?: string;
  }) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(addPrototypeVariable(current, input), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("prototype_variable_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createPrototypeInteraction = useCallback((input: {
    sourceObjectId: string;
    trigger: PrototypeTrigger;
    action: PrototypeActionKind;
    targetObjectId?: string;
    variableId?: string;
    value?: unknown;
    key?: string;
    delayMs?: number;
    conditions?: PrototypeInteraction["conditions"];
  }) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(addPrototypeInteraction(current, input), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("prototype_interaction_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createPrototypeStateRule = useCallback((input: Omit<ComponentStateRule, "id" | "conditions" | "variableBindings"> & {
    variableBindings?: ComponentStateRule["variableBindings"];
  }) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(addComponentStateRule(current, input), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("prototype_state_rule_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const startPresentationPreview = useCallback((activeObjectId?: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      setPresentationState(createPresentationState(current, {
        activeObjectId: activeObjectId ?? selectedObjectId ?? undefined,
        activeSlideId: current.slideDecks[0]?.activeSlideId,
        startedAt: new Date().toISOString()
      }));
    } catch (error) {
      reportWorkflowError("presentation_state_rejected", error);
    }
  }, [reportWorkflowError, selectedObjectId]);

  const playPresentationPreview = useCallback((interactionId: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      const baseState = presentationState ?? createPresentationState(current, {
        activeObjectId: selectedObjectId ?? undefined,
        activeSlideId: current.slideDecks[0]?.activeSlideId,
        startedAt: new Date().toISOString()
      });
      setPresentationState(playPrototypeInteraction(current, baseState, interactionId));
    } catch (error) {
      reportWorkflowError("presentation_playback_rejected", error);
    }
  }, [presentationState, reportWorkflowError, selectedObjectId]);

  const createDeck = useCallback((title: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(createSlideDeck(current, { title }), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("slide_deck_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createSlide = useCallback((deckId: string, title: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(addSlide(current, deckId, { title }), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("slide_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const updateSlideView = useCallback((deckId: string, view: SlideDeck["view"]) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(setSlideDeckView(current, deckId, view), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("slide_view_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const savePresenterNotes = useCallback((deckId: string, slideId: string, notes: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(setSlideNotes(current, deckId, slideId, notes), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("slide_notes_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const embedSlideCanvasObject = useCallback((deckId: string, slideId: string, objectId: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(addSlideBlock(current, deckId, slideId, {
        kind: "canvasObject",
        objectId
      }), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("slide_block_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const embedSlidePrototypeBlock = useCallback((deckId: string, slideId: string, interactionId: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(addSlideBlock(current, deckId, slideId, {
        kind: "prototypeBlock",
        interactionId
      }), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("slide_prototype_block_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createSlideFeedback = useCallback((deckId: string, slideId: string, input: {
    kind: SlideFeedback["kind"];
    author: string;
    body?: string;
    choices?: string[];
    targetId?: string;
    value?: number;
  }) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(addSlideFeedback(current, deckId, slideId, input), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("slide_feedback_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createLocalizedRemix = useCallback((remixPrompt: string, targetObjectId: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(createSelectedRegionRemix(current, {
        targetObjectId,
        prompt: remixPrompt
      }), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("variation_remix_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createAgentContext = useCallback((input: {
    runtime: AgentRuntime;
    targetObjectId: string;
    prompt: string;
  }) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(createAgentContextPackage(current, input), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("agent_context_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const ingestAgentOutputJson = useCallback((input: {
    contextPackageId: string;
    runtime: AgentRuntime;
    outputJson: string;
  }) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      let output: unknown;
      try {
        output = parseAgentOutputJson(input.outputJson);
      } catch {
        output = input.outputJson;
      }
      const nextBundle = ingestAgentOutput(current, {
        contextPackageId: input.contextPackageId,
        runtime: input.runtime,
        output
      });
      commitBundle(nextBundle, { trackUndo: true });
      const latestRun = nextBundle.agentRuns[0];
      if (latestRun?.status === "rejected") {
        appendDiagnostic({
          id: createLocalId("agent_output_rejected"),
          source: "bridge",
          severity: "warning",
          code: latestRun.diagnostics[0]?.code ?? "agent-output-rejected",
          message: latestRun.diagnostics.map((diagnostic) => diagnostic.code).join(", ") || "Agent output was rejected.",
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      reportWorkflowError("agent_output_rejected", error);
    }
  }, [appendDiagnostic, commitBundle, reportWorkflowError]);

  const promoteLocalizedVariation = useCallback((variationSetId: string, directionId: string) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(promoteVariationDirection(current, variationSetId, directionId), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("variation_promotion_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

  const createAgentRecipe = useCallback((input: {
    runtime: AgentRuntime;
    targetObjectId: string;
    prompt: string;
    variationSetId?: string;
    directionId?: string;
  }) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    try {
      commitBundle(exportAgentRecipe(current, input), { trackUndo: true });
    } catch (error) {
      reportWorkflowError("agent_recipe_rejected", error);
    }
  }, [commitBundle, reportWorkflowError]);

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

  const addPhase09ContextSource = useCallback((
    kind: "image" | "document" | "slideDeck" | "spreadsheet" | "figma" | "codebase" | "unsupported"
  ) => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    const createdAt = new Date().toISOString();
    if (kind === "unsupported") {
      const blocked = rejectUnsupportedSource({
        projectId: current.id,
        name: "비지원 압축 파일.exe",
        mimeType: "application/x-msdownload",
        reason: "binary executable",
        createdAt
      });
      commitBundle(ProjectBundleSchema.parse({
        ...current,
        sourceRecords: upsertById(current.sourceRecords, blocked.source),
        ingestionJobs: upsertById(current.ingestionJobs, blocked.job),
        updatedAt: createdAt
      }), { trackUndo: true });
      return;
    }

    const source = createSourceRecord({
      projectId: current.id,
      kind,
      name: phase09SourceName(kind),
      ...phase09SourceEvidence(kind),
      rights: kind === "image" ? "user-provided-context" : "fixture-summary",
      createdAt
    });
    const parsedSource: SourceRecord = {
      ...source,
      parseStatus: kind === "image" ? "parsed" : "partial",
      diagnostics: kind === "image" ? source.diagnostics : [...source.diagnostics, "deterministic-fixture-summary"]
    };
    const job = createIngestionJob({
      sourceId: parsedSource.id,
      status: parsedSource.parseStatus,
      diagnostics: parsedSource.diagnostics,
      createdAt
    });
    const artifact = phase09ParsedArtifact(parsedSource, createdAt);
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      sourceRecords: upsertById(current.sourceRecords, parsedSource),
      ingestionJobs: upsertById(current.ingestionJobs, job),
      parsedContextArtifacts: artifact
        ? upsertById(current.parsedContextArtifacts, artifact)
        : current.parsedContextArtifacts,
      updatedAt: createdAt
    }), { trackUndo: true });
  }, [commitBundle]);

  const generatePhase09Notes = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    const createdAt = new Date().toISOString();
    const sourceNotes = createGeneratedSourceNotes(current, createdAt);
    const designContext = createGeneratedDesignContext(current, createdAt);
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      generatedNotes: upsertNotes(upsertNotes(current.generatedNotes, sourceNotes), designContext),
      updatedAt: createdAt
    }), { trackUndo: true });
  }, [commitBundle]);

  const capturePhase09Snapshot = useCallback((mode: "editable" | "referenceOnly" | "blocked") => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    const createdAt = new Date().toISOString();
    const url = mode === "blocked" ? "javascript:alert(1)" : webSnapshotUrl;
    if (mode === "blocked") {
      setWebSnapshotUrl(url);
    }
    const validation = validatePublicSourceUrl(url);
    const baseSource = createSourceRecord({
      projectId: current.id,
      kind: "webCapture",
      name: `Web snapshot ${current.webSnapshots.length + 1}`,
      sourceUrl: url,
      rights: validation.valid ? "public-url-reference" : "blocked-url",
      createdAt
    });
    const source: SourceRecord = {
      ...baseSource,
      parseStatus: validation.valid ? (mode === "referenceOnly" ? "partial" : "parsed") : "blocked",
      usageStatus: validation.valid ? "candidate" : "blocked",
      diagnostics: validation.valid ? baseSource.diagnostics : [`blocked-url:${validation.reason ?? "unknown"}`]
    };
    const snapshot = createWebSnapshot({
      bundle: current,
      sourceId: source.id,
      url,
      ...(mode === "editable" ? { html: PHASE_09_SAFE_WEB_SNAPSHOT_HTML } : {}),
      createdAt
    });
    const bundleWithSnapshotObject = snapshot.status === "editable"
      ? appendWebSnapshotCanvasObject(current, snapshot)
      : current;
    const job = createIngestionJob({
      sourceId: source.id,
      status: snapshot.status === "blocked" ? "blocked" : source.parseStatus,
      diagnostics: snapshot.diagnostics,
      createdAt
    });

    commitBundle(ProjectBundleSchema.parse({
      ...bundleWithSnapshotObject,
      sourceRecords: upsertById(current.sourceRecords, source),
      ingestionJobs: upsertById(current.ingestionJobs, job),
      webSnapshots: upsertById(current.webSnapshots, snapshot),
      updatedAt: createdAt
    }), { trackUndo: true });
  }, [commitBundle, webSnapshotUrl]);

  const replacePhase09Asset = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    const baseAsset = current.assets[0] ?? createPhase09Asset("asset_phase09_original", "product-shot.png");
    const bundleWithAsset = current.assets.some((asset) => asset.id === baseAsset.id)
      ? current
      : ProjectBundleSchema.parse({
        ...current,
        assets: [...current.assets, baseAsset],
        projectAssetUrls: upsertAssetUrls(current.projectAssetUrls, createProjectAssetUrl(current.id, baseAsset.id))
      });
    const nextAsset = createPhase09Asset("asset_phase09_replacement", "replacement-product-shot.png");
    commitBundle(replaceAssetReference(bundleWithAsset, {
      previousAssetId: baseAsset.id,
      nextAsset,
      reason: "Phase 09 deterministic replacement",
      createdAt: new Date().toISOString()
    }), { trackUndo: true });
  }, [commitBundle]);

  const relinkPhase09Asset = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    const createdAt = new Date().toISOString();
    const asset = current.assets[0] ?? createPhase09Asset("asset_phase09_original", "product-shot.png");
    const source = current.sourceRecords.find((item) => item.kind === "image") ?? createSourceRecord({
      projectId: current.id,
      kind: "image",
      name: "제품 이미지.png",
      ...phase09SourceEvidence("image"),
      rights: "user-provided-context",
      createdAt
    });
    const prepared = ProjectBundleSchema.parse({
      ...current,
      assets: current.assets.some((item) => item.id === asset.id) ? current.assets : [...current.assets, asset],
      sourceRecords: upsertById(current.sourceRecords, source),
      projectAssetUrls: upsertAssetUrls(current.projectAssetUrls, createProjectAssetUrl(current.id, asset.id))
    });
    commitBundle(relinkAssetSource(prepared, {
      assetId: asset.id,
      sourceId: source.id,
      reason: "Phase 09 source provenance link",
      createdAt
    }), { trackUndo: true });
  }, [commitBundle]);

  const importPhase09CsvData = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    const createdAt = new Date().toISOString();
    const source = createSourceRecord({
      projectId: current.id,
      kind: "csv",
      name: "team-data.csv",
      localPath: "fixtures/team-data.csv",
      mimeType: "text/csv",
      bytes: "name,role\n민지,PM\n유진,Designer\n서연,Engineer",
      rights: "fixture-data",
      createdAt
    });
    const dataSource = parseCsvDataSource({
      name: "팀 데이터.csv",
      sourceId: source.id,
      csv: "name,role\n민지,PM\n유진,Designer\n서연,Engineer",
      createdAt
    });
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      sourceRecords: upsertById(current.sourceRecords, source),
      dataSources: upsertById(current.dataSources, dataSource),
      updatedAt: createdAt
    }), { trackUndo: true });
  }, [commitBundle]);

  const createPhase09DataBinding = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    const graph = current.canvasGraph ?? deriveCanvasGraph(current);
    const target = selectedObjectId
      ? graph.objects[selectedObjectId]
      : Object.values(graph.objects).find((object) => object.nodeId);
    if (!target) {
      reportWorkflowError("data_binding_rejected", new Error("No canvas object available for data binding."));
      return;
    }
    const createdAt = new Date().toISOString();
    const fallbackSourceRecord = createSourceRecord({
      projectId: current.id,
      kind: "csv",
      name: "team-data.csv",
      localPath: "fixtures/team-data.csv",
      mimeType: "text/csv",
      bytes: "name,role\n민지,PM\n유진,Designer\n서연,Engineer",
      rights: "fixture-data",
      createdAt
    });
    const existingDataSource = current.dataSources.find((item) => (
      current.sourceRecords.some((sourceRecord) => sourceRecord.id === item.sourceId)
    ));
    const source = existingDataSource ?? parseCsvDataSource({
      name: "팀 데이터.csv",
      sourceId: fallbackSourceRecord.id,
      csv: "name,role\n민지,PM\n유진,Designer\n서연,Engineer",
      createdAt
    });
    const binding: DataBinding = createDataBinding({
      dataSourceId: source.id,
      targetObjectId: target.id,
      ...(target.nodeId ? { targetNodeId: target.nodeId } : {}),
      fieldMap: { title: "name", subtitle: "role" },
      rowLimit: 3,
      sourceRevision: current.baseRevision,
      createdAt
    });
    const sourceRecords = current.sourceRecords.some((sourceRecord) => sourceRecord.id === source.sourceId)
      ? current.sourceRecords
      : upsertById(current.sourceRecords, fallbackSourceRecord);
    const validSourceIds = new Set(sourceRecords.map((sourceRecord) => sourceRecord.id));
    commitBundle(applyDataBindingToBundle(ProjectBundleSchema.parse({
      ...current,
      sourceRecords,
      dataSources: current.dataSources.filter((item) => validSourceIds.has(item.sourceId))
    }), source, binding), { trackUndo: true });
  }, [commitBundle, reportWorkflowError, selectedObjectId]);

  const createPhase09SyncEnvelope = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    const envelope = createSyncEnvelope({
      bundle: current,
      accountHint: "local-mock-account",
      createdAt: new Date().toISOString()
    });
    commitBundle(ProjectBundleSchema.parse({
      ...current,
      syncEnvelope: envelope,
      updatedAt: envelope.lastSyncedAt ?? new Date().toISOString()
    }), { trackUndo: true });
  }, [commitBundle]);

  const markPhase09SyncDiverged = useCallback(() => {
    const current = projectBundleRef.current;
    if (!current) {
      return;
    }
    commitBundle(markSyncDiverged(current, "local/mock remote revision diverged", new Date().toISOString()), {
      trackUndo: true
    });
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
          <div className="design-agent-steps" aria-label="Context-driven design workflow">
            {DESIGN_AGENT_STEPS.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </article>
            ))}
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

        {canvasGraph ? (
          <CanvasLayerTree
            graph={canvasGraph}
            selectedObjectId={selectedObjectId}
            onSelectObject={selectCanvasObject}
            onRenameObject={(objectId, name) => commitCanvasOperation("setObjectName", { name }, objectId)}
            onSetHidden={(objectId, hidden) => commitCanvasOperation("setObjectVisibility", { hidden }, objectId)}
            onSetLocked={(objectId, locked) => commitCanvasOperation("setObjectLock", { locked }, objectId)}
            onReorderObject={(objectId, parentId, index) => commitCanvasOperation("reorderObject", { parentId, index }, objectId)}
            onGroupSelection={(objectIds) => {
              const anchorObjectId = objectIds[0] ?? selectedObjectId;
              if (anchorObjectId) {
                commitCanvasOperation("groupObjects", { name: "Group", childObjectIds: objectIds }, anchorObjectId);
              }
            }}
            onUngroupObject={(objectId) => commitCanvasOperation("ungroupObjects", {}, objectId)}
          />
        ) : null}
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
          <button
            className={devModeOpen ? "active dev-mode-toggle" : "dev-mode-toggle"}
            data-testid="phase-10-dev-mode-toggle"
            type="button"
            onClick={() => {
              setDevModeOpen((current) => !current);
              setTweaksEnabled(true);
            }}
          >
            Dev Mode
          </button>
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
                {isPreviewReady ? selectedObject ? `selected ${selectedObject.kind}` : `ready · ${canvasObjects.length} objects` : "booting"}
              </span>
            </div>
            {selectedObject ? (
              <div className="canvas-object-breadcrumb" data-testid="canvas-object-breadcrumb">
                <span>{selectedObject.kind}</span>
                <strong>{selectedObject.name}</strong>
                <span>{selectedNode?.tagName ?? "canvas object"}</span>
              </div>
            ) : null}
            {selectedObject ? <div className="snap-guide" aria-hidden="true" /> : null}
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
              {devModeOpen ? (
                <DevModePanel
                  bundle={projectBundle}
                  selectedObject={selectedObject}
                  onCreateInspectReport={createPhase10InspectReport}
                  onCreateCodeSnippet={createPhase10CodeSnippet}
                  onMarkReady={markPhase10Ready}
                  onCreateVersionDiff={createPhase10VersionDiff}
                  onCreateAssetDownload={createPhase10AssetDownload}
                />
              ) : null}
              <ExportPublishPanel
                bundle={projectBundle}
                onCreateExport={createExport}
                onCreatePublishPreview={createPhase10PublishPreview}
                onCreateCodeRoundtrip={createPhase10RoundtripPackage}
                onImportRoundtripConflict={createPhase10RoundtripConflict}
                onLoadWorkerFixture={loadPhase10WorkerFixture}
              />
              {canvasGraph ? (
                <>
                  <CanvasObjectInspector
                    object={selectedObject}
                    nodeKind={selectedNode?.kind}
                    nodeTagName={selectedNode?.tagName}
                    onSetName={(name) => selectedObject && commitCanvasOperation("setObjectName", { name }, selectedObject.id)}
                    onSetLayoutConstraints={(constraints: CanvasConstraints) => selectedObject && commitCanvasOperation("setLayoutConstraints", { constraints }, selectedObject.id)}
                    onSetHidden={(hidden) => selectedObject && commitCanvasOperation("setObjectVisibility", { hidden }, selectedObject.id)}
                    onSetLocked={(locked) => selectedObject && commitCanvasOperation("setObjectLock", { locked }, selectedObject.id)}
                  />
                  <ComponentInstancePanel
                    graph={canvasGraph}
                    selectedObject={selectedObject}
                    onCreateComponent={(name, options) => selectedObject && commitCanvasOperation("createComponent", {
                      name,
                      sourceObjectId: selectedObject.id,
                      props: options.propNames.map((propName) => ({
                        name: propName,
                        kind: "text",
                        defaultValue: propName === "name" ? selectedObject.name : ""
                      })),
                      variants: options.variantNames.map((variantName) => ({
                        name: variantName,
                        props: {}
                      }))
                    }, selectedObject.id)}
                    onCreateInstance={(componentId) => selectedObject && commitCanvasOperation("createComponentInstance", { componentId, targetObjectId: selectedObject.id }, selectedObject.id)}
                    onSetVariant={(instanceId, variantId) => {
                      const objectId = canvasGraph.instances[instanceId]?.objectId ?? selectedObject?.id;
                      if (objectId) {
                        commitCanvasOperation("updateComponentOverride", { instanceId, variantId }, objectId);
                      }
                    }}
                    onSetState={(instanceId, state) => {
                      const objectId = canvasGraph.instances[instanceId]?.objectId ?? selectedObject?.id;
                      if (objectId) {
                        commitCanvasOperation("updateComponentOverride", { instanceId, state }, objectId);
                      }
                    }}
                    onSetOverride={(instanceId, key, value) => {
                      const objectId = canvasGraph.instances[instanceId]?.objectId ?? selectedObject?.id;
                      if (objectId) {
                        commitCanvasOperation("updateComponentOverride", { instanceId, overrides: { [key]: value } }, objectId);
                      }
                    }}
                    onDetachInstance={(instanceId) => {
                      const objectId = canvasGraph.instances[instanceId]?.objectId ?? selectedObject?.id;
                      if (objectId) {
                        commitCanvasOperation("detachComponentInstance", { instanceId }, objectId);
                      }
                    }}
                  />
                  <ComponentPlaygroundPanel
                    graph={canvasGraph}
                    designSystem={projectBundle.designSystem}
                    playgroundState={playgroundState}
                    onCreatePlaygroundState={previewComponentPlayground}
                  />
                  <PrototypePanel
                    bundle={projectBundle}
                    graph={canvasGraph}
                    selectedObjectId={selectedObjectId}
                    onAddVariable={createPrototypeVariable}
                    onAddInteraction={createPrototypeInteraction}
                    onAddStateRule={createPrototypeStateRule}
                  />
                  <PresentationMode
                    bundle={projectBundle}
                    graph={canvasGraph}
                    state={presentationState}
                    selectedObjectId={selectedObjectId}
                    onStart={startPresentationPreview}
                    onPlay={playPresentationPreview}
                  />
                  <SlideDeckPanel
                    bundle={projectBundle}
                    graph={canvasGraph}
                    selectedObjectId={selectedObjectId}
                    onCreateDeck={createDeck}
                    onAddSlide={createSlide}
                    onSetView={updateSlideView}
                    onSaveNotes={savePresenterNotes}
                    onEmbedSelectedObject={embedSlideCanvasObject}
                    onEmbedPrototypeBlock={embedSlidePrototypeBlock}
                    onAddFeedback={createSlideFeedback}
                  />
                  <VariationComparePanel
                    bundle={projectBundle}
                    graph={canvasGraph}
                    selectedObjectId={selectedObjectId}
                    onCreateRemix={createLocalizedRemix}
                    onCreateAgentContext={createAgentContext}
                    onIngestAgentOutput={ingestAgentOutputJson}
                    onPromote={promoteLocalizedVariation}
                    onExportRecipe={createAgentRecipe}
                  />
                </>
              ) : null}
              <DesignSystemPanel
                bundle={projectBundle}
                onExtractCandidates={extractDesignSystem}
                onApproveItems={approveDesignItems}
                onRejectItems={rejectDesignItems}
                onMapToken={mapDesignToken}
                onAddCodeReference={addCodeReference}
                onPublish={publishCurrentDesignSystem}
                onRemix={remixCurrentDesignSystem}
                onRollback={rollbackCurrentDesignSystem}
              />
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
              <section className="tweak-card phase-09-context" data-testid="phase-09-context-queue">
                <h2>Phase 09 Context</h2>
                <p className="tweak-description">출처, 요약, 권리, 데이터, 자산, 동기화 상태를 저장 모델로 관리합니다.</p>
                <div className="phase-09-actions">
                  <button type="button" data-testid="phase-09-add-image-source" onClick={() => addPhase09ContextSource("image")}>Image</button>
                  <button type="button" data-testid="phase-09-add-doc-source" onClick={() => addPhase09ContextSource("document")}>DOCX</button>
                  <button type="button" data-testid="phase-09-add-pptx-source" onClick={() => addPhase09ContextSource("slideDeck")}>PPTX</button>
                  <button type="button" data-testid="phase-09-add-xlsx-source" onClick={() => addPhase09ContextSource("spreadsheet")}>XLSX</button>
                  <button type="button" data-testid="phase-09-add-figma-source" onClick={() => addPhase09ContextSource("figma")}>Figma</button>
                  <button type="button" data-testid="phase-09-add-codebase-source" onClick={() => addPhase09ContextSource("codebase")}>Codebase</button>
                  <button type="button" data-testid="phase-09-add-unsupported-source" onClick={() => addPhase09ContextSource("unsupported")}>Block</button>
                  <button type="button" data-testid="phase-09-generate-notes" onClick={generatePhase09Notes}>Notes</button>
                </div>
                <div className="phase-09-record-list">
                  {projectBundle.sourceRecords.length === 0 ? <span>source records 없음</span> : projectBundle.sourceRecords.slice(0, 8).map((source) => (
                    <article key={source.id} className={`phase-09-record state-${source.parseStatus}`}>
                      <strong>{source.name}</strong>
                      <span>{source.kind} · {source.parseStatus} · {source.usageStatus}</span>
                      {source.diagnostics.length > 0 ? <small>{source.diagnostics.join(", ")}</small> : null}
                    </article>
                  ))}
                </div>
                <div className="phase-09-record-list" data-testid="phase-09-parsed-context-summaries">
                  {projectBundle.parsedContextArtifacts.length === 0 ? <span>parsed summaries 없음</span> : projectBundle.parsedContextArtifacts.slice(0, 8).map((artifact) => (
                    <article key={artifact.id} className="phase-09-record">
                      <strong>{artifact.title}</strong>
                      <span>{artifact.kind} · {artifact.summary}</span>
                      <small>{[
                        ...artifact.textBlocks.slice(0, 2),
                        ...artifact.frameNames.slice(0, 2),
                        ...artifact.tables.slice(0, 1).map((row) => Object.values(row).join(" / "))
                      ].filter(Boolean).join(" · ")}</small>
                    </article>
                  ))}
                </div>
                <div className="phase-09-notes-grid">
                  <pre data-testid="phase-09-source-notes">{projectBundle.generatedNotes.find((note) => note.path === "source-notes.md")?.content ?? "source-notes.md 없음"}</pre>
                  <pre data-testid="phase-09-design-context">{projectBundle.generatedNotes.find((note) => note.path === "design-context.md")?.content ?? "design-context.md 없음"}</pre>
                </div>
              </section>
              <section className="tweak-card phase-09-context" data-testid="phase-09-web-snapshot-list">
                <h2>Snapshot & Assets</h2>
                <label className="field-stack">
                  <span>Public URL</span>
                  <input
                    data-testid="phase-09-web-snapshot-url"
                    value={webSnapshotUrl}
                    onChange={(event) => setWebSnapshotUrl(event.target.value)}
                  />
                </label>
                <div className="phase-09-actions">
                  <button type="button" data-testid="phase-09-capture-web-snapshot" onClick={() => capturePhase09Snapshot("editable")}>Editable</button>
                  <button type="button" data-testid="phase-09-capture-reference-snapshot" onClick={() => capturePhase09Snapshot("referenceOnly")}>Reference</button>
                  <button type="button" data-testid="phase-09-capture-blocked-snapshot" onClick={() => capturePhase09Snapshot("blocked")}>Unsafe</button>
                  <button type="button" data-testid="phase-09-replace-asset" onClick={replacePhase09Asset}>Replace asset</button>
                  <button type="button" data-testid="phase-09-relink-asset" onClick={relinkPhase09Asset}>Relink asset</button>
                </div>
                <div className="phase-09-record-list">
                  {projectBundle.webSnapshots.length === 0 ? <span>snapshot 없음</span> : projectBundle.webSnapshots.slice(0, 6).map((snapshot) => (
                    <article key={snapshot.id} className={`phase-09-record state-${snapshot.status}`}>
                      <strong>{snapshot.status}</strong>
                      <span>{snapshot.url}</span>
                      <small>{snapshot.sourceId} · {snapshot.normalizedHtml ? "sanitized editable section" : "no editable html"} · {snapshot.diagnostics.join(", ")}</small>
                    </article>
                  ))}
                </div>
                <div className="phase-09-record-list" data-testid="phase-09-asset-provenance">
                  {projectBundle.projectAssetUrls.length === 0 && projectBundle.assetLifecycle.length === 0 ? <span>asset provenance 없음</span> : (
                    <>
                      {projectBundle.projectAssetUrls.map((assetUrl) => (
                        <article key={assetUrl.url} className="phase-09-record">
                          <strong>{assetUrl.assetId}</strong>
                          <span>{assetUrl.url}</span>
                        </article>
                      ))}
                      {projectBundle.assetLifecycle.slice(0, 5).map((event) => (
                        <article key={event.id} className="phase-09-record">
                          <strong>{event.type}</strong>
                          <span>{event.assetId} · {event.sourceId ?? event.nextAssetId ?? "no linked source"}</span>
                        </article>
                      ))}
                    </>
                  )}
                </div>
              </section>
              <section className="tweak-card phase-09-context" data-testid="phase-09-data-binding-preview">
                <h2>Data & Sync</h2>
                <div className="phase-09-actions">
                  <button type="button" data-testid="phase-09-import-csv-data" onClick={importPhase09CsvData}>Import CSV</button>
                  <button type="button" data-testid="phase-09-create-data-binding" onClick={createPhase09DataBinding}>Bind data</button>
                  <button type="button" data-testid="phase-09-create-sync-envelope" onClick={createPhase09SyncEnvelope}>Sync envelope</button>
                  <button type="button" data-testid="phase-09-mark-sync-diverged" onClick={markPhase09SyncDiverged}>Diverge</button>
                </div>
                <div className="phase-09-record-list">
                  {dataBindingPreview ? dataBindingPreview.rows.map((row, index) => (
                    <article key={`${row.title}-${index}`} className={`phase-09-record state-${dataBindingPreview.state}`}>
                      <strong>{row.title}</strong>
                      <span>{row.subtitle}</span>
                    </article>
                  )) : <span>data binding 없음</span>}
                  {dataBindingPreview?.diagnostics.map((diagnostic) => <span key={diagnostic}>{diagnostic}</span>)}
                </div>
                <div className="phase-09-record-list" data-testid="phase-09-sync-status">
                  <article className={`phase-09-record state-${projectBundle.syncEnvelope?.status ?? "localOnly"}`}>
                    <strong>DATA-01 foundation only</strong>
                    <span>{projectBundle.syncEnvelope?.status ?? "localOnly"} · {projectBundle.syncEnvelope?.remoteDocumentId ?? "no remote document"}</span>
                    <small>{[...(projectBundle.syncEnvelope?.diagnostics ?? []), ...syncDiagnostics].join(", ")}</small>
                  </article>
                </div>
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

const PHASE_09_SAFE_WEB_SNAPSHOT_HTML = String.raw`<main class="phase-09-web-snapshot">
  <section>
    <h1>공식 제품 페이지 스냅샷</h1>
    <p>공개 URL에서 가져온 안전한 HTML fixture입니다.</p>
  </section>
</main>`;

function phase09SourceName(kind: "image" | "document" | "slideDeck" | "spreadsheet" | "figma" | "codebase"): string {
  switch (kind) {
    case "image":
      return "제품 스크린샷.png";
    case "document":
      return "제품 요구사항.docx";
    case "slideDeck":
      return "기존 발표자료.pptx";
    case "spreadsheet":
      return "시장 데이터.xlsx";
    case "figma":
      return "Figma Frames.fig";
    case "codebase":
      return "app-codebase-manifest.json";
  }
}

function phase09SourceEvidence(
  kind: "image" | "document" | "slideDeck" | "spreadsheet" | "figma" | "codebase"
): { localPath: string; mimeType: string } {
  switch (kind) {
    case "image":
      return { localPath: "fixtures/product-screenshot.png", mimeType: "image/png" };
    case "document":
      return {
        localPath: "fixtures/product-requirements.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      };
    case "slideDeck":
      return {
        localPath: "fixtures/product-intro.pptx",
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      };
    case "spreadsheet":
      return {
        localPath: "fixtures/market-data.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      };
    case "figma":
      return { localPath: "fixtures/figma-export.json", mimeType: "application/json" };
    case "codebase":
      return { localPath: "fixtures/app-codebase-manifest.json", mimeType: "application/json" };
  }
}

function phase09ParsedArtifact(source: SourceRecord, createdAt: string): ParsedContextArtifact | undefined {
  switch (source.kind) {
    case "document":
      return parseDocumentSource({
        source,
        text: "브랜드 핵심 문장: 바이브코더가 실제 제품 화면을 더 빠르게 다듬는다.\n사용자: 한국어로 디자인을 만드는 개인 제작자.",
        createdAt
      });
    case "slideDeck":
      return parseSlideDeckSource({
        source,
        slideTitles: ["문제", "해결", "제품 데모"],
        notes: ["발표자는 실제 화면과 편집 가능성을 강조한다."],
        createdAt
      });
    case "spreadsheet":
      return parseSpreadsheetSource({
        source,
        rows: [{ segment: "바이브코더", need: "빠른 편집" }, { segment: "디자이너", need: "출처 관리" }],
        createdAt
      });
    case "figma":
      return parseFigmaExportSource({
        source,
        frameNames: ["Landing / Desktop", "Editor / Canvas"],
        componentNames: ["Primary CTA", "Inspector Panel"],
        createdAt
      });
    case "codebase":
      return parseCodebaseFolderManifest({
        source,
        files: [
          { path: "apps/web/components/editor-shell.tsx", kind: "react", summary: "studio shell and workflow panels" },
          { path: "packages/editor-core/src/schemas.ts", kind: "typescript", summary: "ProjectBundle source of truth" }
        ],
        createdAt
      });
    default:
      return undefined;
  }
}

function createPhase09Asset(id: string, filename: string): AssetRef {
  return {
    id,
    kind: "image",
    status: "cached",
    localPath: `assets/${filename}`,
    mimeType: "image/png",
    license: "phase-09-fixture"
  };
}

function appendWebSnapshotCanvasObject(
  bundle: ProjectBundle,
  snapshot: { canvasObjectIds: string[]; createdAt: string; normalizedHtml?: string | undefined }
): ProjectBundle {
  const objectId = snapshot.canvasObjectIds[0];
  if (!objectId) {
    return bundle;
  }
  const nodeId = objectId.startsWith("obj_")
    ? objectId.slice(4)
    : `cdx_snapshot_${stableHash(objectId)}`;
  const sectionHtml = `<section class="phase-09-snapshot-section" data-cdx-id="${nodeId}" data-cdx-role="frame">${snapshot.normalizedHtml ?? ""}</section>`;
  const normalized = bundle.html.normalized.includes(`data-cdx-id="${nodeId}"`)
    ? bundle.html.normalized
    : `${bundle.html.normalized}\n${sectionHtml}`;
  const bundleWithSnapshotHtml = rebaseRevisionReferences(ProjectBundleSchema.parse({
    ...bundle,
    baseRevision: `rev_${stableHash(normalized)}`,
    updatedAt: snapshot.createdAt,
    html: {
      ...bundle.html,
      normalized
    },
    editGraph: buildEditGraph(normalized)
  }), snapshot.createdAt);
  const graph = bundleWithSnapshotHtml.canvasGraph ?? deriveCanvasGraph(bundleWithSnapshotHtml);
  if (graph.objects[objectId]) {
    return ProjectBundleSchema.parse({ ...bundleWithSnapshotHtml, canvasGraph: graph });
  }
  const parent = Object.values(graph.objects).find((object) => object.kind === "artboard")
    ?? graph.objects[graph.rootObjectIds[0] ?? ""];
  if (!parent) {
    return ProjectBundleSchema.parse({ ...bundleWithSnapshotHtml, canvasGraph: graph });
  }
  const snapshotObject: CanvasObject = {
    id: objectId,
    kind: "section",
    name: "Editable Web Snapshot",
    nodeId,
    parentId: parent.id,
    childIds: [],
    locked: false,
    hidden: false
  };
  const parentChildIds = parent.childIds.includes(objectId)
    ? parent.childIds
    : [...parent.childIds, objectId];
  return ProjectBundleSchema.parse({
    ...bundleWithSnapshotHtml,
    canvasGraph: {
      ...graph,
      objects: {
        ...graph.objects,
        [parent.id]: {
          ...parent,
          childIds: parentChildIds
        },
        [objectId]: snapshotObject
      },
      updatedAt: snapshot.createdAt
    }
  });
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return [...items.filter((current) => current.id !== item.id), item];
}

function upsertNotes(items: GeneratedNote[], note: GeneratedNote): GeneratedNote[] {
  return [...items.filter((current) => current.path !== note.path), note];
}

function upsertAssetUrls(items: ProjectAssetUrl[], item: ProjectAssetUrl): ProjectAssetUrl[] {
  return [...items.filter((current) => current.assetId !== item.assetId), item];
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
