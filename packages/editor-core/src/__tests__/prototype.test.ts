import { describe, expect, it } from "vitest";

import { createLocalComponentDefinition } from "../canvas-components.js";
import { ensureCanvasGraph } from "../canvas-graph.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import {
  addComponentStateRule,
  addPrototypeInteraction,
  addPrototypeVariable,
  createPresentationState,
  ensurePrototypeGraph,
  playPrototypeInteraction
} from "../prototype.js";
import { ProjectBundleSchema, type ProjectBundle } from "../schemas.js";

function createPrototypeBundle(): {
  bundle: ProjectBundle;
  sourceObjectId: string;
  targetObjectId: string;
  componentId: string;
  variantId: string;
} {
  const bundle = ensureCanvasGraph(normalizeHtml({
    id: "prototype-fixture",
    title: "Prototype Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  }));
  const graph = bundle.canvasGraph!;
  const sourceObjectId = graph.objects["obj_artboard_prototype-fixture"]!.childIds[0]!;
  const targetObjectId = graph.objects["obj_artboard_prototype-fixture"]!.childIds[1] ?? sourceObjectId;
  const component = createLocalComponentDefinition({
    graph,
    sourceObjectId,
    name: "Interactive module",
    props: [{ name: "label", kind: "text", defaultValue: "Open" }],
    variants: [{ name: "Hover", props: { label: "Hover" } }],
    createdAt: "2026-04-28T00:00:00.000Z"
  });
  graph.components[component.id] = component;

  return {
    bundle: ProjectBundleSchema.parse(bundle),
    sourceObjectId,
    targetObjectId,
    componentId: component.id,
    variantId: component.variants[1]!.id
  };
}

describe("prototype helpers", () => {
  it("creates click hover tap keyboard and timed interactions", () => {
    const fixture = createPrototypeBundle();
    let bundle = ensurePrototypeGraph(fixture.bundle, "2026-04-28T00:00:00.000Z");
    bundle = addPrototypeVariable(bundle, {
      id: "proto_var_overlay",
      name: "Overlay open",
      kind: "boolean",
      defaultValue: false,
      sharedComponentId: fixture.componentId
    });
    bundle = addPrototypeInteraction(bundle, {
      id: "proto_ix_click",
      sourceObjectId: fixture.sourceObjectId,
      trigger: "click",
      action: "navigateTo",
      targetObjectId: fixture.targetObjectId,
      transition: { kind: "instant" }
    });
    bundle = addPrototypeInteraction(bundle, {
      id: "proto_ix_hover",
      sourceObjectId: fixture.sourceObjectId,
      trigger: "hover",
      action: "setComponentState",
      targetObjectId: fixture.sourceObjectId,
      value: "hover"
    });
    bundle = addPrototypeInteraction(bundle, {
      id: "proto_ix_tap",
      sourceObjectId: fixture.sourceObjectId,
      trigger: "tap",
      action: "toggleVariable",
      variableId: "proto_var_overlay"
    });
    bundle = addPrototypeInteraction(bundle, {
      id: "proto_ix_keyboard",
      sourceObjectId: fixture.sourceObjectId,
      trigger: "keyboard",
      action: "setVariable",
      variableId: "proto_var_overlay",
      value: true,
      key: "Enter",
      conditions: [{ variableId: "proto_var_overlay", operator: "isFalsy" }]
    });
    bundle = addPrototypeInteraction(bundle, {
      id: "proto_ix_timed",
      sourceObjectId: fixture.sourceObjectId,
      trigger: "timed",
      action: "openOverlay",
      targetObjectId: fixture.targetObjectId,
      delayMs: 1200
    });
    bundle = addComponentStateRule(bundle, {
      componentId: fixture.componentId,
      variantId: fixture.variantId,
      state: "hover",
      variableBindings: { proto_var_overlay: true },
      conditions: [{ variableId: "proto_var_overlay", operator: "equals", value: true }]
    });

    expect(bundle.prototypeGraph?.interactions.map((interaction) => interaction.trigger))
      .toEqual(["click", "hover", "tap", "keyboard", "timed"]);
    expect(bundle.prototypeGraph?.stateRules[0]?.variantId).toBe(fixture.variantId);
  });

  it("previews prototype interactions without mutating the bundle", () => {
    const fixture = createPrototypeBundle();
    let bundle = ensurePrototypeGraph(fixture.bundle, "2026-04-28T00:00:00.000Z");
    bundle = addPrototypeVariable(bundle, {
      id: "proto_var_overlay",
      name: "Overlay open",
      kind: "boolean",
      defaultValue: false
    });
    bundle = addPrototypeInteraction(bundle, {
      id: "proto_ix_keyboard",
      sourceObjectId: fixture.sourceObjectId,
      trigger: "keyboard",
      action: "setVariable",
      variableId: "proto_var_overlay",
      value: true,
      key: "Enter",
      conditions: [{ variableId: "proto_var_overlay", operator: "isFalsy" }]
    });

    const before = JSON.stringify(bundle);
    const state = createPresentationState(bundle, {
      activeObjectId: fixture.sourceObjectId,
      startedAt: "2026-04-28T00:00:00.000Z"
    });
    const nextState = playPrototypeInteraction(bundle, state, "proto_ix_keyboard");

    expect(nextState.variableValues.proto_var_overlay).toBe(true);
    expect(nextState.activeInteractionId).toBe("proto_ix_keyboard");
    expect(nextState.history).toEqual(["proto_ix_keyboard"]);
    expect(JSON.stringify(bundle)).toBe(before);
    expect(bundle.canvasOperations).toEqual([]);
    expect(bundle.patches).toEqual([]);
  });

  it("rejects unknown objects variables and unsafe trigger input", () => {
    const fixture = createPrototypeBundle();
    let bundle = ensurePrototypeGraph(fixture.bundle, "2026-04-28T00:00:00.000Z");
    bundle = addPrototypeVariable(bundle, {
      id: "proto_var_overlay",
      name: "Overlay open",
      kind: "boolean",
      defaultValue: false
    });

    expect(() => addPrototypeInteraction(bundle, {
      sourceObjectId: "missing-object",
      trigger: "click",
      action: "navigateTo",
      targetObjectId: fixture.targetObjectId
    })).toThrow("Unknown prototype source object");

    expect(() => addPrototypeInteraction(bundle, {
      sourceObjectId: fixture.sourceObjectId,
      trigger: "tap",
      action: "toggleVariable",
      variableId: "missing-variable"
    })).toThrow("Unknown prototype variable");

    expect(() => addPrototypeInteraction(bundle, {
      sourceObjectId: fixture.sourceObjectId,
      trigger: "keyboard",
      action: "navigateTo",
      targetObjectId: fixture.targetObjectId,
      key: "javascript:alert(1)"
    })).toThrow("safe key");

    expect(() => addPrototypeInteraction(bundle, {
      sourceObjectId: fixture.sourceObjectId,
      trigger: "timed",
      action: "navigateTo",
      targetObjectId: fixture.targetObjectId
    })).toThrow("delayMs > 0");
  });

  it("rejects invalid component state rules and playback state values", () => {
    const fixture = createPrototypeBundle();
    let bundle = ensurePrototypeGraph(fixture.bundle, "2026-04-28T00:00:00.000Z");
    bundle = addPrototypeInteraction(bundle, {
      id: "proto_ix_bad_state",
      sourceObjectId: fixture.sourceObjectId,
      trigger: "hover",
      action: "setComponentState",
      targetObjectId: fixture.sourceObjectId,
      value: "expanded"
    });
    const state = createPresentationState(bundle, {
      activeObjectId: fixture.sourceObjectId,
      startedAt: "2026-04-28T00:00:00.000Z"
    });

    expect(() => addComponentStateRule(bundle, {
      componentId: fixture.componentId,
      variantId: "missing-variant",
      state: "hover",
      variableBindings: {}
    })).toThrow("Unknown component variant");
    expect(() => playPrototypeInteraction(bundle, state, "proto_ix_bad_state")).toThrow("Invalid component state");
  });
});
