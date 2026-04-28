import { stableHash } from "./ids.js";
import type {
  AgentRuntime,
  DesignSystem,
  HandoffPackage,
  ProjectBundle,
  ShareAccess,
  ShareLink
} from "./schemas.js";

export function learnDesignSystem(bundle: ProjectBundle, createdAt = new Date().toISOString()): DesignSystem {
  const normalized = bundle.html.normalized;
  const colorMatches = Array.from(normalized.matchAll(/#[0-9a-f]{3,8}/gi)).map((match) => match[0].toLowerCase());
  const uniqueColors = Array.from(new Set(colorMatches)).slice(0, 6);
  const colors: Record<string, string> = {};
  uniqueColors.forEach((color, index) => {
    colors[`color${index + 1}`] = color;
  });

  if (!colors.color1) {
    colors.color1 = "#171717";
  }
  if (!colors.color2) {
    colors.color2 = "#ffffff";
  }

  return {
    id: `design_system_${stableHash(`${bundle.id}:${bundle.baseRevision}`)}`,
    name: `${bundle.title} System`,
    colors,
    typography: {
      heading: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif",
      body: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif"
    },
    radius: "14px",
    spacing: "8px",
    source: "learned",
    createdAt
  };
}

export function createShareLink(input: {
  bundle: ProjectBundle;
  access: ShareAccess;
  createdAt?: string;
}): ShareLink {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const id = `share_${stableHash(`${input.bundle.id}:${input.access}:${createdAt}`)}`;
  return {
    id,
    access: input.access,
    url: `kdesign://share/${encodeURIComponent(input.bundle.id)}/${id}`,
    createdAt
  };
}

export function createAgentHandoff(input: {
  bundle: ProjectBundle;
  target: AgentRuntime;
  createdAt?: string;
}): HandoffPackage {
  return createHandoff({
    bundle: input.bundle,
    target: input.target,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
}

export function createCanvaHandoff(input: {
  bundle: ProjectBundle;
  createdAt?: string;
}): HandoffPackage {
  return createHandoff({
    bundle: input.bundle,
    target: "canva",
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
}

function createHandoff(input: {
  bundle: ProjectBundle;
  target: AgentRuntime | "canva";
  createdAt?: string;
}): HandoffPackage {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: `handoff_${stableHash(`${input.bundle.id}:${input.target}:${input.bundle.baseRevision}:${createdAt}`)}`,
    target: input.target,
    artifactId: input.bundle.id,
    sourceRevision: input.bundle.baseRevision,
    includes: [
      "ProjectBundle",
      "EditGraph",
      "canvasGraph",
      "canvasOperations",
      "components",
      "componentInstances",
      "patches",
      "assets",
      "comments",
      "versions",
      "exportJobs",
      "designSystem"
    ],
    instructionsPath: "docs/prompts/context-driven-design-agent-prompt.md",
    createdAt
  };
}
