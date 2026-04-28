import { stableHash } from "./ids.js";
import { extractDesignSystemCandidates } from "./design-system.js";
import type {
  AgentRuntime,
  DesignSystem,
  HandoffPackage,
  ProjectBundle,
  ShareAccess,
  ShareLink
} from "./schemas.js";

export function learnDesignSystem(bundle: ProjectBundle, createdAt = new Date().toISOString()): DesignSystem {
  return extractDesignSystemCandidates(bundle, createdAt);
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
      "designSystem",
      "designTokens",
      "codeReferences",
      "componentPatterns",
      "designSystemVersions",
      "prototypeGraph",
      "slideDecks",
      "variationSets",
      "agentRecipes"
    ],
    instructionsPath: "docs/prompts/context-driven-design-agent-prompt.md",
    createdAt
  };
}
