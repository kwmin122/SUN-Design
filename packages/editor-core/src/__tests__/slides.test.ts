import { describe, expect, it } from "vitest";

import { ensureCanvasGraph } from "../canvas-graph.js";
import { BASIC_LANDING_FIXTURE_HTML } from "../fixtures.js";
import { normalizeHtml } from "../normalize.js";
import { addPrototypeInteraction, ensurePrototypeGraph } from "../prototype.js";
import {
  addSlide,
  addSlideBlock,
  addSlideFeedback,
  createSlideDeck,
  setSlideDeckView,
  setSlideNotes
} from "../slides.js";
import type { ProjectBundle } from "../schemas.js";

function createSlideBundle(): { bundle: ProjectBundle; sourceObjectId: string; targetObjectId: string } {
  const base = ensureCanvasGraph(normalizeHtml({
    id: "slides-fixture",
    title: "Slides Fixture",
    html: BASIC_LANDING_FIXTURE_HTML
  }));
  const graph = base.canvasGraph!;
  const sourceObjectId = graph.objects["obj_artboard_slides-fixture"]!.childIds[0]!;
  const targetObjectId = graph.objects["obj_artboard_slides-fixture"]!.childIds[1] ?? sourceObjectId;
  const bundle = addPrototypeInteraction(ensurePrototypeGraph(base), {
    id: "proto_ix_open",
    sourceObjectId,
    trigger: "click",
    action: "navigateTo",
    targetObjectId
  });
  return { bundle, sourceObjectId, targetObjectId };
}

describe("slide deck helpers", () => {
  it("creates a deck with outline notes embedded blocks and feedback", () => {
    const fixture = createSlideBundle();
    let bundle = createSlideDeck(fixture.bundle, {
      id: "deck_phase8",
      title: "Phase 08 Review",
      createdAt: "2026-04-28T00:00:00.000Z"
    });
    bundle = addSlide(bundle, "deck_phase8", {
      id: "slide_flow",
      title: "Prototype flow",
      createdAt: "2026-04-28T00:00:01.000Z"
    });
    bundle = setSlideDeckView(bundle, "deck_phase8", "outline");
    bundle = setSlideNotes(bundle, "deck_phase8", "slide_flow", "Walk through the selected-region interaction.");
    bundle = addSlideBlock(bundle, "deck_phase8", "slide_flow", {
      id: "block_canvas",
      kind: "canvasObject",
      objectId: fixture.sourceObjectId,
      order: 0
    });
    bundle = addSlideBlock(bundle, "deck_phase8", "slide_flow", {
      id: "block_prototype",
      kind: "prototypeBlock",
      interactionId: "proto_ix_open",
      order: 1
    });
    bundle = addSlideBlock(bundle, "deck_phase8", "slide_flow", {
      id: "block_prompt",
      kind: "text",
      content: "Compare the live canvas with the prototype transition.",
      order: 2
    });
    bundle = addSlideFeedback(bundle, "deck_phase8", "slide_flow", {
      id: "feedback_comment",
      kind: "comment",
      author: "reviewer",
      body: "Keep this as speaker context.",
      createdAt: "2026-04-28T00:00:02.000Z"
    });
    bundle = addSlideFeedback(bundle, "deck_phase8", "slide_flow", {
      id: "feedback_poll",
      kind: "poll",
      author: "reviewer",
      choices: ["Tighter", "Roomier", "Presentation"],
      createdAt: "2026-04-28T00:00:03.000Z"
    });
    bundle = addSlideFeedback(bundle, "deck_phase8", "slide_flow", {
      id: "feedback_vote",
      kind: "vote",
      author: "reviewer",
      targetId: "feedback_poll",
      createdAt: "2026-04-28T00:00:04.000Z"
    });
    bundle = addSlideFeedback(bundle, "deck_phase8", "slide_flow", {
      id: "feedback_alignment",
      kind: "alignment",
      author: "reviewer",
      value: 5,
      createdAt: "2026-04-28T00:00:05.000Z"
    });

    const deck = bundle.slideDecks.find((item) => item.id === "deck_phase8")!;
    const slide = deck.slides.find((item) => item.id === "slide_flow")!;
    expect(deck.view).toBe("outline");
    expect(slide.notes).toContain("selected-region interaction");
    expect(slide.blocks.map((block) => block.kind)).toEqual(["canvasObject", "prototypeBlock", "text"]);
    expect(slide.feedback.map((item) => item.kind)).toEqual(["comment", "poll", "vote", "alignment"]);
  });

  it("rejects invalid slide feedback", () => {
    const fixture = createSlideBundle();
    let bundle = createSlideDeck(fixture.bundle, { id: "deck_phase8", title: "Phase 08 Review" });
    bundle = addSlide(bundle, "deck_phase8", { id: "slide_flow", title: "Prototype flow" });

    expect(() => addSlideFeedback(bundle, "deck_phase8", "slide_flow", {
      kind: "poll",
      author: "reviewer",
      choices: ["Only one"]
    })).toThrow("2-6 choices");

    expect(() => addSlideFeedback(bundle, "deck_phase8", "slide_flow", {
      kind: "alignment",
      author: "reviewer",
      value: 6
    })).toThrow("integer value from 1 to 5");

    expect(() => addSlideFeedback(bundle, "deck_phase8", "slide_flow", {
      kind: "vote",
      author: "reviewer",
      targetId: "missing-target"
    })).toThrow("Unknown vote target");
  });

  it("rejects invalid embedded block references and overlong notes", () => {
    const fixture = createSlideBundle();
    let bundle = createSlideDeck(fixture.bundle, { id: "deck_phase8", title: "Phase 08 Review" });
    bundle = addSlide(bundle, "deck_phase8", { id: "slide_flow", title: "Prototype flow" });

    expect(() => addSlideBlock(bundle, "deck_phase8", "slide_flow", {
      kind: "canvasObject",
      objectId: "missing-object"
    })).toThrow("Unknown slide canvas object");

    expect(() => addSlideBlock(bundle, "deck_phase8", "slide_flow", {
      kind: "prototypeBlock",
      interactionId: "missing-interaction"
    })).toThrow("Unknown slide prototype interaction");

    expect(() => setSlideNotes(bundle, "deck_phase8", "slide_flow", "x".repeat(5001)))
      .toThrow("5000 characters or fewer");
  });
});
