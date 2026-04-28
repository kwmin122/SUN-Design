import { describe, expect, it } from "vitest";

import {
  AgentRecipeSchema,
  DesignSystemSchema,
  ProjectBundleSchema,
  PrototypeInteractionSchema,
  SlideBlockSchema,
  SlideFeedbackSchema
} from "../schemas.js";
import { PreviewMessageSchema } from "../preview-schemas.js";

function createMinimalBundleRecord(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "phase-08-fixture",
    title: "Phase 08 Fixture",
    baseRevision: "rev_test",
    createdAt: "2026-04-28T00:00:00.000Z",
    updatedAt: "2026-04-28T00:00:00.000Z",
    source: { kind: "fixture" },
    html: {
      raw: "<main></main>",
      sanitized: "<main></main>",
      normalized: '<main data-cdx-id="cdx_test" data-cdx-role="frame"></main>'
    },
    assets: [],
    editGraph: {
      version: 1,
      rootNodeIds: ["cdx_test"],
      nodes: {
        cdx_test: {
          id: "cdx_test",
          kind: "frame",
          tagName: "main",
          domPath: "main[0]",
          fingerprint: "frame-main",
          editableProps: ["backgroundColor", "padding", "gap", "borderRadius"]
        }
      }
    },
    patches: [],
    sanitizerReport: {
      removedElementCount: 0,
      removedAttributeCount: 0,
      blockedUrlCount: 0,
      changes: []
    }
  };
}

describe("schema contracts", () => {
  it("accepts a minimal ProjectBundle with an empty patch log", () => {
    const result = ProjectBundleSchema.safeParse({
      schemaVersion: 1,
      id: "phase-01-fixture",
      title: "Phase 01 Fixture",
      baseRevision: "rev_test",
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z",
      source: { kind: "fixture" },
      html: {
        raw: "<main></main>",
        sanitized: "<main></main>",
        normalized: '<main data-cdx-id="cdx_test" data-cdx-role="frame"></main>'
      },
      assets: [],
      editGraph: {
        version: 1,
        rootNodeIds: ["cdx_test"],
        nodes: {
          cdx_test: {
            id: "cdx_test",
            kind: "frame",
            tagName: "main",
            domPath: "main[0]",
            fingerprint: "frame-main",
            editableProps: ["backgroundColor", "padding", "gap", "borderRadius"]
          }
        }
      },
      patches: [],
      sanitizerReport: {
        removedElementCount: 0,
        removedAttributeCount: 0,
        blockedUrlCount: 0,
        changes: []
      }
    });

    expect(result.success).toBe(true);
  });

  it("accepts a ProjectBundle with canvas graph and canvas operations", () => {
    const result = ProjectBundleSchema.safeParse({
      schemaVersion: 1,
      id: "phase-06-fixture",
      title: "Phase 06 Fixture",
      baseRevision: "rev_test",
      createdAt: "2026-04-28T00:00:00.000Z",
      updatedAt: "2026-04-28T00:00:00.000Z",
      source: { kind: "fixture" },
      html: {
        raw: "<main></main>",
        sanitized: "<main></main>",
        normalized: '<main data-cdx-id="cdx_test" data-cdx-role="frame"></main>'
      },
      assets: [],
      editGraph: {
        version: 1,
        rootNodeIds: ["cdx_test"],
        nodes: {
          cdx_test: {
            id: "cdx_test",
            kind: "frame",
            tagName: "main",
            domPath: "main[0]",
            fingerprint: "frame-main",
            editableProps: ["backgroundColor", "padding", "gap", "borderRadius"]
          }
        }
      },
      patches: [],
      sanitizerReport: {
        removedElementCount: 0,
        removedAttributeCount: 0,
        blockedUrlCount: 0,
        changes: []
      },
      canvasGraph: {
        version: 1,
        rootObjectIds: ["obj_page"],
        objects: {
          obj_page: {
            id: "obj_page",
            kind: "page",
            name: "Page",
            childIds: ["obj_frame"],
            locked: false,
            hidden: false
          },
          obj_frame: {
            id: "obj_frame",
            kind: "frame",
            name: "Frame",
            nodeId: "cdx_test",
            parentId: "obj_page",
            childIds: [],
            locked: false,
            hidden: false
          }
        },
        components: {},
        instances: {},
        guides: [],
        updatedAt: "2026-04-28T00:00:00.000Z"
      },
      canvasOperations: [{
        id: "canvas_op_1",
        op: "setObjectName",
        objectId: "obj_frame",
        value: { name: "Renamed" },
        source: "canvas",
        baseRevision: "rev_test",
        createdAt: "2026-04-28T00:00:00.000Z"
      }]
    });

    expect(result.success).toBe(true);
  });

  it("parses legacy design systems with governance defaults", () => {
    const result = DesignSystemSchema.parse({
      id: "design_system_legacy",
      name: "Legacy System",
      colors: { color1: "#171717" },
      typography: {
        heading: "Pretendard",
        body: "Pretendard"
      },
      radius: "14px",
      spacing: "8px",
      source: "learned",
      createdAt: "2026-04-28T00:00:00.000Z"
    });

    expect(result.tokens).toEqual([]);
    expect(result.codeReferences).toEqual([]);
    expect(result.componentPatterns).toEqual([]);
    expect(result.versions).toEqual([]);
    expect(result.publishState).toBe("draft");
  });

  it("accepts governed design-system records", () => {
    const result = DesignSystemSchema.safeParse({
      id: "design_system_governed",
      name: "Governed System",
      colors: { primary: "#2f9f8f" },
      typography: {
        heading: "Pretendard",
        body: "Pretendard"
      },
      radius: "8px",
      spacing: "4px",
      source: "connected",
      createdAt: "2026-04-28T00:00:00.000Z",
      tokens: [{
        id: "token_primary",
        name: "color.primary",
        category: "color",
        value: "#2f9f8f",
        modes: [{ mode: "dark", value: "#6ee7d8" }],
        provenance: "fixture",
        status: "approved",
        codeMapping: {
          cssVariable: "--brand-primary",
          tailwindClass: "text-brand-primary"
        }
      }],
      codeReferences: [{
        id: "code_ref_card",
        name: "MarketingCard",
        framework: "react",
        importPath: "@/components/marketing-card",
        exportName: "MarketingCard",
        sourcePath: "apps/web/components/marketing-card.tsx",
        docsUrl: "https://example.com/docs/marketing-card",
        storybookUrl: "https://example.com/storybook/marketing-card",
        propMappings: { headline: "title" },
        slotMappings: { media: "children" },
        status: "approved"
      }],
      componentPatterns: [{
        id: "pattern_card",
        name: "Marketing card",
        sourceObjectId: "obj_card",
        componentId: "component_card",
        variantIds: ["variant_base"],
        propNames: ["headline"],
        tokenIds: ["token_primary"],
        codeReferenceId: "code_ref_card",
        provenance: "canvas-component",
        status: "approved"
      }],
      versions: [{
        id: "version_1",
        label: "Studio System v1",
        sourceRevision: "rev_test",
        tokenCount: 1,
        componentPatternCount: 1,
        snapshotHash: "hash_1",
        snapshot: {
          colors: { primary: "#2f9f8f" },
          typography: {
            heading: "Pretendard",
            body: "Pretendard"
          },
          radius: "8px",
          spacing: "4px",
          tokens: [{
            id: "token_primary",
            name: "color.primary",
            category: "color",
            value: "#2f9f8f",
            modes: [],
            provenance: "fixture",
            status: "published"
          }],
          codeReferences: [],
          componentPatterns: [],
          publishState: "published"
        },
        createdAt: "2026-04-28T00:00:00.000Z"
      }],
      publishState: "published"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid governed design-system values", () => {
    expect(DesignSystemSchema.safeParse({
      id: "design_system_bad_token",
      name: "Bad System",
      colors: {},
      typography: { heading: "Pretendard", body: "Pretendard" },
      radius: "8px",
      spacing: "4px",
      source: "learned",
      createdAt: "2026-04-28T00:00:00.000Z",
      tokens: [{
        id: "token_bad",
        name: "bad",
        category: "not-real",
        value: "x",
        provenance: "fixture"
      }]
    }).success).toBe(false);

    expect(DesignSystemSchema.safeParse({
      id: "design_system_bad_state",
      name: "Bad System",
      colors: {},
      typography: { heading: "Pretendard", body: "Pretendard" },
      radius: "8px",
      spacing: "4px",
      source: "learned",
      createdAt: "2026-04-28T00:00:00.000Z",
      publishState: "live"
    }).success).toBe(false);
  });

  it("parses legacy bundles with prototype slide and variation defaults", () => {
    const result = ProjectBundleSchema.parse(createMinimalBundleRecord());

    expect(result.prototypeGraph).toBeUndefined();
    expect(result.presentationState).toBeUndefined();
    expect(result.slideDecks).toEqual([]);
    expect(result.variationSets).toEqual([]);
    expect(result.agentRecipes).toEqual([]);
  });

  it("accepts a ProjectBundle with prototype slides variations and agent recipes", () => {
    const result = ProjectBundleSchema.safeParse({
      ...createMinimalBundleRecord(),
      prototypeGraph: {
        version: 1,
        variables: [{
          id: "proto_var_open",
          name: "Overlay open",
          kind: "boolean",
          defaultValue: false
        }],
        interactions: [{
          id: "proto_ix_open",
          sourceObjectId: "obj_button",
          trigger: "click",
          action: "openOverlay",
          targetObjectId: "obj_overlay",
          conditions: [{
            variableId: "proto_var_open",
            operator: "isFalsy"
          }],
          transition: {
            kind: "dissolve",
            durationMs: 180,
            easing: "ease-out"
          },
          provenance: "fixture",
          createdAt: "2026-04-28T00:00:00.000Z"
        }],
        stateRules: [{
          id: "state_rule_open",
          componentId: "component_card",
          variantId: "variant_open",
          state: "hover",
          variableBindings: { proto_var_open: true }
        }],
        updatedAt: "2026-04-28T00:00:00.000Z"
      },
      presentationState: {
        mode: "present",
        activeObjectId: "obj_button",
        activeInteractionId: "proto_ix_open",
        variableValues: { proto_var_open: false },
        componentStates: { obj_button: "hover" },
        history: ["proto_ix_open"],
        startedAt: "2026-04-28T00:00:00.000Z"
      },
      slideDecks: [{
        id: "deck_demo",
        title: "Demo Deck",
        view: "outline",
        activeSlideId: "slide_intro",
        slides: [{
          id: "slide_intro",
          title: "Intro",
          order: 0,
          notes: "Presenter notes",
          blocks: [{
            id: "slide_block_canvas",
            kind: "canvasObject",
            objectId: "obj_button",
            order: 0
          }],
          feedback: [{
            id: "feedback_poll",
            kind: "poll",
            author: "reviewer",
            choices: ["A", "B"],
            createdAt: "2026-04-28T00:00:00.000Z"
          }]
        }],
        createdAt: "2026-04-28T00:00:00.000Z",
        updatedAt: "2026-04-28T00:00:00.000Z"
      }],
      variationSets: [{
        id: "variation_set_hero",
        targetObjectId: "obj_button",
        prompt: "Make the selected CTA clearer.",
        sourceRevision: "rev_test",
        directions: [{
          id: "variation_dir_clear",
          name: "Clear CTA",
          description: "Increase spacing and contrast.",
          targetObjectId: "obj_button",
          operations: [],
          patches: [],
          status: "candidate",
          provenance: "fixture",
          createdAt: "2026-04-28T00:00:00.000Z"
        }],
        createdAt: "2026-04-28T00:00:00.000Z",
        updatedAt: "2026-04-28T00:00:00.000Z"
      }],
      agentRecipes: [{
        id: "agent_recipe_codex",
        runtime: "codex",
        targetObjectId: "obj_button",
        sourceRevision: "rev_test",
        prompt: "Improve selected region.",
        instructionsPath: "docs/prompts/context-driven-design-agent-prompt.md",
        operationIds: ["variation_op_1"],
        replaySteps: ["Load the stored ProjectBundle."],
        createdAt: "2026-04-28T00:00:00.000Z"
      }]
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid prototype slide feedback and recipe values", () => {
    expect(PrototypeInteractionSchema.safeParse({
      id: "proto_ix_bad",
      sourceObjectId: "obj_button",
      trigger: "double-click",
      action: "navigateTo",
      provenance: "fixture",
      createdAt: "2026-04-28T00:00:00.000Z"
    }).success).toBe(false);

    expect(SlideBlockSchema.safeParse({
      id: "slide_block_bad",
      kind: "liveDom",
      order: 0
    }).success).toBe(false);

    expect(SlideFeedbackSchema.safeParse({
      id: "feedback_bad",
      kind: "emoji",
      author: "reviewer",
      createdAt: "2026-04-28T00:00:00.000Z"
    }).success).toBe(false);

    expect(AgentRecipeSchema.safeParse({
      id: "agent_recipe_bad",
      runtime: "claude",
      targetObjectId: "obj_button",
      sourceRevision: "rev_test",
      prompt: "Improve selected region.",
      instructionsPath: "docs/prompts/context-driven-design-agent-prompt.md",
      createdAt: "2026-04-28T00:00:00.000Z"
    }).success).toBe(false);
  });

  it("accepts a preview.ready message with a nonce", () => {
    const result = PreviewMessageSchema.safeParse({
      type: "preview.ready",
      nonce: "nonce-1",
      documentId: "phase-01-fixture",
      nodeCount: 1
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown preview message type", () => {
    const result = PreviewMessageSchema.safeParse({
      type: "preview.unknown",
      nonce: "nonce-1"
    });

    expect(result.success).toBe(false);
  });
});
