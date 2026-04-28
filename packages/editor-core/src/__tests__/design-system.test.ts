import { describe, expect, it } from "vitest";

import { createLocalComponentDefinition } from "../canvas-components.js";
import { ensureCanvasGraph } from "../canvas-graph.js";
import {
  addCodeComponentReference,
  approveDesignSystemItems,
  createComponentPlaygroundState,
  extractDesignSystemCandidates,
  mapTokenToCode,
  publishDesignSystem,
  rejectDesignSystemItems,
  remixDesignSystem,
  rollbackDesignSystem
} from "../design-system.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import type { DesignSystem, ProjectBundle } from "../schemas.js";

function createBundle(): ProjectBundle {
  const bundle = ensureCanvasGraph(normalizeHtml({
    id: "design-system-fixture",
    title: "Design System Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  }));
  const graph = bundle.canvasGraph!;
  const sourceObjectId = graph.objects["obj_artboard_design-system-fixture"]!.childIds[0]!;
  const component = createLocalComponentDefinition({
    graph,
    sourceObjectId,
    name: "MarketingCard",
    props: [{ name: "headline", kind: "text", defaultValue: "Headline" }],
    variants: [{ name: "Compact", props: { headline: "Compact headline" } }],
    createdAt: "2026-04-28T00:00:00.000Z"
  });
  graph.components[component.id] = component;
  return bundle;
}

function approveFirstToken(system: DesignSystem): DesignSystem {
  const token = system.tokens.find((item) => item.category === "color") ?? system.tokens[0];
  expect(token).toBeDefined();
  return approveDesignSystemItems(system, [token!.id]);
}

describe("design-system governance helpers", () => {
  it("extracts reviewable design-system candidates", () => {
    const system = extractDesignSystemCandidates(createBundle(), "2026-04-28T00:00:00.000Z");

    expect(system.source).toBe("learned");
    expect(system.tokens.some((token) => token.name.startsWith("color."))).toBe(true);
    expect(system.tokens.some((token) => token.name === "typography.heading")).toBe(true);
    expect(system.tokens.every((token) => token.status === "candidate")).toBe(true);
    expect(system.componentPatterns).toHaveLength(1);
    expect(system.componentPatterns[0]?.name).toBe("MarketingCard");
  });

  it("approves rejects publishes remixes and rolls back design-system versions", () => {
    const extracted = extractDesignSystemCandidates(createBundle(), "2026-04-28T00:00:00.000Z");
    const approved = approveFirstToken(extracted);
    const rejected = rejectDesignSystemItems(approved, [approved.tokens[1]!.id]);
    const published = publishDesignSystem(rejected, {
      label: "Studio System v1",
      sourceRevision: "rev_test",
      createdAt: "2026-04-28T00:00:01.000Z"
    });

    expect(published.publishState).toBe("published");
    expect(published.versions[0]?.label).toBe("Studio System v1");
    expect(published.tokens.some((token) => token.status === "published")).toBe(true);

    const remix = remixDesignSystem(published, {
      name: "Studio System Remix",
      tokenUpdates: { [published.tokens[0]!.id]: "#123456" },
      createdAt: "2026-04-28T00:00:02.000Z"
    });
    expect(remix.name).toBe("Studio System Remix");
    expect(remix.publishState).toBe("draft");
    expect(remix.tokens[0]?.value).toBe("#123456");

    const rolledBack = rollbackDesignSystem(remix, published.versions[0]!.id);
    expect(rolledBack.publishState).toBe("published");
    expect(rolledBack.tokens[0]?.value).toBe(published.tokens[0]?.value);
    expect(rolledBack.versions).toHaveLength(1);

    expect(() => rollbackDesignSystem(published, "missing-version")).toThrow("Unknown design-system version");
  });

  it("maps tokens to CSS variables and Tailwind classes", () => {
    const system = approveFirstToken(extractDesignSystemCandidates(createBundle()));
    const withRef = addCodeComponentReference(system, {
      name: "MarketingCard",
      framework: "react",
      importPath: "@/components/marketing-card",
      exportName: "MarketingCard",
      sourcePath: "apps/web/components/marketing-card.tsx",
      docsUrl: "https://example.com/docs/marketing-card",
      storybookUrl: "https://example.com/storybook/marketing-card",
      propMappings: { headline: "title" },
      slotMappings: { media: "children" }
    });
    const token = withRef.tokens.find((item) => item.category === "color")!;
    const mapped = mapTokenToCode(withRef, token.id, {
      cssVariable: "--brand-primary",
      tailwindClass: "text-brand-primary",
      codeReferenceId: withRef.codeReferences[0]!.id
    });

    expect(mapped.tokens.find((item) => item.id === token.id)?.codeMapping).toMatchObject({
      cssVariable: "--brand-primary",
      tailwindClass: "text-brand-primary",
      codeReferenceId: withRef.codeReferences[0]!.id
    });
    expect(() => mapTokenToCode(withRef, token.id, { cssVariable: "brand-primary" })).toThrow("Invalid CSS variable");
    expect(() => mapTokenToCode(withRef, "missing-token", { cssVariable: "--brand-primary" })).toThrow("Unknown design token");
    expect(() => mapTokenToCode(withRef, token.id, { codeReferenceId: "missing-ref" })).toThrow("Unknown code component reference");
  });

  it("rejects duplicate token names before publishing", () => {
    const approved = approveFirstToken(extractDesignSystemCandidates(createBundle()));
    const duplicateToken = {
      ...approved.tokens[0]!,
      id: "token_duplicate",
      name: approved.tokens[0]!.name.toUpperCase()
    };
    const duplicateSystem: DesignSystem = {
      ...approved,
      tokens: [...approved.tokens, duplicateToken]
    };

    expect(() => publishDesignSystem(duplicateSystem, {
      label: "Studio System v1",
      sourceRevision: "rev_test"
    })).toThrow("Duplicate design token name");
  });

  it("rejects unsafe code component references", () => {
    const system = extractDesignSystemCandidates(createBundle());
    expect(() => addCodeComponentReference(system, {
      name: "BadPath",
      framework: "react",
      importPath: "@/components/bad",
      exportName: "BadPath",
      sourcePath: "../secrets.ts"
    })).toThrow("Unsafe code component source path");

    expect(() => addCodeComponentReference(system, {
      name: "BadUrl",
      framework: "react",
      importPath: "@/components/bad",
      exportName: "BadUrl",
      docsUrl: "http://example.com/docs"
    })).toThrow("must be https");

    const withRef = addCodeComponentReference(system, {
      name: "MarketingCard",
      framework: "react",
      importPath: "@/components/marketing-card",
      exportName: "MarketingCard"
    });
    expect(() => addCodeComponentReference(withRef, {
      name: "MarketingCard",
      framework: "react",
      importPath: "@/components/marketing-card",
      exportName: "MarketingCard"
    })).toThrow("Duplicate code component reference");
  });

  it("creates component playground state without mutating the graph", () => {
    const bundle = createBundle();
    const graph = bundle.canvasGraph!;
    const before = JSON.stringify(graph);
    const component = Object.values(graph.components)[0]!;
    const state = createComponentPlaygroundState({
      graph,
      componentId: component.id,
      variantId: component.variants[1]!.id,
      propValues: { headline: "Playground headline" },
      mode: "dark"
    });

    expect(state.componentName).toBe("MarketingCard");
    expect(state.variantName).toBe("Compact");
    expect(state.propValues).toEqual({ headline: "Playground headline" });
    expect(state.mode).toBe("dark");
    expect(state.snapshotHash).toBeTruthy();
    expect(JSON.stringify(graph)).toBe(before);
    expect(() => createComponentPlaygroundState({
      graph,
      componentId: component.id,
      propValues: { missing: "Nope" }
    })).toThrow("Unknown component playground prop");
  });
});
