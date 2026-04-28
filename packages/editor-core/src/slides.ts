import { ensureCanvasGraph } from "./canvas-graph.js";
import { stableHash } from "./ids.js";
import {
  ProjectBundleSchema,
  SlideBlockSchema,
  SlideDeckSchema,
  SlideFeedbackSchema,
  type ProjectBundle,
  type SlideBlock,
  type SlideFeedback
} from "./schemas.js";

type SlideBlockInput = Omit<SlideBlock, "id" | "order"> & { id?: string; order?: number };
type SlideFeedbackInput = {
  id?: string;
  kind: SlideFeedback["kind"];
  author: string;
  body?: string;
  choices?: string[];
  targetId?: string;
  value?: number;
  createdAt?: string;
};

export function createSlideDeck(
  bundle: ProjectBundle,
  input: { title: string; createdAt?: string; id?: string }
): ProjectBundle {
  const current = ensureCanvasGraph(bundle);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const deckId = input.id ?? `deck_${stableHash(`${current.id}:${input.title}:${createdAt}`)}`;
  const firstSlideId = `slide_${stableHash(`${deckId}:cover`)}`;
  const deck = SlideDeckSchema.parse({
    id: deckId,
    title: requireText(input.title, "Slide deck title"),
    view: "slide",
    slides: [{
      id: firstSlideId,
      title: "Cover",
      order: 0,
      notes: "",
      blocks: [],
      feedback: []
    }],
    activeSlideId: firstSlideId,
    createdAt,
    updatedAt: createdAt
  });
  return ProjectBundleSchema.parse({
    ...current,
    slideDecks: [deck, ...current.slideDecks],
    updatedAt: createdAt
  });
}

export function addSlide(
  bundle: ProjectBundle,
  deckId: string,
  input: { title: string; createdAt?: string; id?: string }
): ProjectBundle {
  return updateDeck(bundle, deckId, (deck) => {
    const createdAt = input.createdAt ?? new Date().toISOString();
    const slide = {
      id: input.id ?? `slide_${stableHash(`${deck.id}:${input.title}:${deck.slides.length}`)}`,
      title: requireText(input.title, "Slide title"),
      order: deck.slides.length,
      notes: "",
      blocks: [],
      feedback: []
    };
    return {
      ...deck,
      slides: [...deck.slides, slide],
      activeSlideId: slide.id,
      updatedAt: createdAt
    };
  });
}

export function setSlideNotes(
  bundle: ProjectBundle,
  deckId: string,
  slideId: string,
  notes: string
): ProjectBundle {
  if (notes.length > 5000) {
    throw new Error("Slide notes must be 5000 characters or fewer.");
  }
  return updateSlide(bundle, deckId, slideId, (slide) => ({ ...slide, notes }));
}

export function addSlideBlock(
  bundle: ProjectBundle,
  deckId: string,
  slideId: string,
  input: SlideBlockInput
): ProjectBundle {
  const current = ensureCanvasGraph(bundle);
  validateSlideBlock(current, input);
  return updateSlide(current, deckId, slideId, (slide) => {
    const block = SlideBlockSchema.parse({
      ...input,
      id: input.id ?? `slide_block_${stableHash(`${deckId}:${slideId}:${input.kind}:${slide.blocks.length}`)}`,
      order: input.order ?? slide.blocks.length
    });
    return { ...slide, blocks: [...slide.blocks, block] };
  });
}

export function addSlideFeedback(
  bundle: ProjectBundle,
  deckId: string,
  slideId: string,
  input: SlideFeedbackInput
): ProjectBundle {
  return updateSlide(bundle, deckId, slideId, (slide) => {
    validateSlideFeedback(slide.blocks, slide.feedback, input);
    const createdAt = input.createdAt ?? new Date().toISOString();
    const feedback = SlideFeedbackSchema.parse({
      ...input,
      id: input.id ?? `slide_feedback_${stableHash(`${deckId}:${slideId}:${input.kind}:${createdAt}`)}`,
      createdAt
    });
    return { ...slide, feedback: [...slide.feedback, feedback] };
  });
}

export function setSlideDeckView(
  bundle: ProjectBundle,
  deckId: string,
  view: "slide" | "grid" | "outline"
): ProjectBundle {
  return updateDeck(bundle, deckId, (deck) => ({ ...deck, view, updatedAt: new Date().toISOString() }));
}

function updateDeck(
  bundle: ProjectBundle,
  deckId: string,
  updater: (deck: ProjectBundle["slideDecks"][number]) => ProjectBundle["slideDecks"][number]
): ProjectBundle {
  if (!bundle.slideDecks.some((deck) => deck.id === deckId)) {
    throw new Error(`Unknown slide deck: ${deckId}`);
  }
  return ProjectBundleSchema.parse({
    ...bundle,
    slideDecks: bundle.slideDecks.map((deck) => deck.id === deckId ? updater(deck) : deck),
    updatedAt: new Date().toISOString()
  });
}

function updateSlide(
  bundle: ProjectBundle,
  deckId: string,
  slideId: string,
  updater: (slide: ProjectBundle["slideDecks"][number]["slides"][number]) => ProjectBundle["slideDecks"][number]["slides"][number]
): ProjectBundle {
  return updateDeck(bundle, deckId, (deck) => {
    if (!deck.slides.some((slide) => slide.id === slideId)) {
      throw new Error(`Unknown slide: ${slideId}`);
    }
    return {
      ...deck,
      slides: deck.slides.map((slide) => slide.id === slideId ? updater(slide) : slide),
      updatedAt: new Date().toISOString()
    };
  });
}

function validateSlideBlock(bundle: ProjectBundle, input: SlideBlockInput): void {
  if (input.kind === "canvasObject" && (!input.objectId || !bundle.canvasGraph?.objects[input.objectId])) {
    throw new Error(`Unknown slide canvas object: ${input.objectId ?? ""}`);
  }
  if (input.kind === "prototypeBlock" && (
    !input.interactionId ||
    !bundle.prototypeGraph?.interactions.some((interaction) => interaction.id === input.interactionId)
  )) {
    throw new Error(`Unknown slide prototype interaction: ${input.interactionId ?? ""}`);
  }
}

function validateSlideFeedback(
  blocks: SlideBlock[],
  feedback: SlideFeedback[],
  input: SlideFeedbackInput
): void {
  const choices = input.choices ?? [];
  if (input.kind === "poll" && (choices.length < 2 || choices.length > 6)) {
    throw new Error("Poll feedback requires 2-6 choices.");
  }
  if (input.kind === "alignment" && (!Number.isInteger(input.value) || input.value! < 1 || input.value! > 5)) {
    throw new Error("Alignment feedback requires an integer value from 1 to 5.");
  }
  if (input.kind === "vote" && input.targetId) {
    const targetExists = blocks.some((block) => block.id === input.targetId) ||
      feedback.some((item) => item.id === input.targetId && item.kind === "poll");
    if (!targetExists) {
      throw new Error(`Unknown vote target: ${input.targetId}`);
    }
  }
}

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must not be empty.`);
  }
  return trimmed;
}
