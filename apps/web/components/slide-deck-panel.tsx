"use client";

import { useMemo, useState } from "react";
import type { CanvasGraph, ProjectBundle, SlideDeck, SlideFeedback } from "@kdesign/editor-core";

type SlideDeckPanelProps = {
  bundle: ProjectBundle;
  graph: CanvasGraph;
  selectedObjectId: string | null;
  onCreateDeck(title: string): void;
  onAddSlide(deckId: string, title: string): void;
  onSetView(deckId: string, view: SlideDeck["view"]): void;
  onSaveNotes(deckId: string, slideId: string, notes: string): void;
  onEmbedSelectedObject(deckId: string, slideId: string, objectId: string): void;
  onEmbedPrototypeBlock(deckId: string, slideId: string, interactionId: string): void;
  onAddFeedback(deckId: string, slideId: string, input: {
    kind: SlideFeedback["kind"];
    author: string;
    body?: string;
    choices?: string[];
    targetId?: string;
    value?: number;
  }): void;
};

export function SlideDeckPanel({
  bundle,
  graph,
  selectedObjectId,
  onCreateDeck,
  onAddSlide,
  onSetView,
  onSaveNotes,
  onEmbedSelectedObject,
  onEmbedPrototypeBlock,
  onAddFeedback
}: SlideDeckPanelProps) {
  const decks = bundle.slideDecks;
  const activeDeck = decks[0];
  const activeSlide = activeDeck?.slides.find((slide) => slide.id === activeDeck.activeSlideId) ?? activeDeck?.slides[0];
  const interactions = bundle.prototypeGraph?.interactions ?? [];
  const objects = useMemo(() => Object.values(graph.objects).filter((object) => object.parentId), [graph.objects]);
  const fallbackObjectId = selectedObjectId ?? objects[0]?.id ?? "";

  const [deckTitle, setDeckTitle] = useState("Studio Review Deck");
  const [slideTitle, setSlideTitle] = useState("Prototype decision");
  const [notes, setNotes] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<SlideFeedback["kind"]>("comment");
  const [feedbackBody, setFeedbackBody] = useState("Looks ready for review.");
  const [feedbackValue, setFeedbackValue] = useState(5);

  const slideId = activeSlide?.id ?? "";
  const deckId = activeDeck?.id ?? "";
  const firstInteractionId = interactions[0]?.id ?? "";
  const feedbackTargets = [
    ...(activeSlide?.blocks.map((block) => ({ id: block.id, label: `${block.kind} block` })) ?? []),
    ...(activeSlide?.feedback.filter((item) => item.kind === "poll").map((item) => ({ id: item.id, label: "poll" })) ?? [])
  ];

  return (
    <section className="tweak-card slide-deck-panel" data-testid="slide-deck-panel">
      <div className="inspector-heading">
        <div>
          <h2>Slides</h2>
          <p>{decks.length} decks · {activeDeck?.slides.length ?? 0} slides</p>
        </div>
        <span>{activeDeck?.view ?? "none"}</span>
      </div>

      <div className="prototype-grid">
        <label className="field-stack">
          <span>Deck title</span>
          <input value={deckTitle} onChange={(event) => setDeckTitle(event.target.value)} />
        </label>
        <label className="field-stack">
          <span>Slide title</span>
          <input value={slideTitle} onChange={(event) => setSlideTitle(event.target.value)} />
        </label>
      </div>
      <div className="presentation-actions">
        <button type="button" onClick={() => onCreateDeck(deckTitle)}>Create deck</button>
        <button type="button" disabled={!deckId} onClick={() => onAddSlide(deckId, slideTitle)}>Add slide</button>
      </div>

      {activeDeck ? (
        <>
          <div className="segmented-control">
            {(["slide", "grid", "outline"] as const).map((view) => (
              <button
                className={activeDeck.view === view ? "active" : ""}
                key={view}
                type="button"
                onClick={() => onSetView(activeDeck.id, view)}
              >
                {view}
              </button>
            ))}
          </div>

          <div className={activeDeck.view === "grid" ? "slide-grid-preview" : "slide-outline"} data-testid="slide-outline">
            {activeDeck.slides.map((slide) => (
              <span key={slide.id}>{slide.order + 1}. {slide.title}</span>
            ))}
          </div>

          <label className="field-stack slide-notes">
            <span>Presenter notes</span>
            <textarea
              data-testid="slide-notes-input"
              value={notes || activeSlide?.notes || ""}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <button className="quality-button" type="button" disabled={!slideId} onClick={() => onSaveNotes(deckId, slideId, notes || activeSlide?.notes || "")}>
            Save notes
          </button>

          <div className="presentation-actions">
            <button
              type="button"
              disabled={!slideId || !fallbackObjectId}
              onClick={() => onEmbedSelectedObject(deckId, slideId, fallbackObjectId)}
            >
              Embed selected canvas object
            </button>
            <button
              type="button"
              disabled={!slideId || !firstInteractionId}
              onClick={() => onEmbedPrototypeBlock(deckId, slideId, firstInteractionId)}
            >
              Embed prototype block
            </button>
          </div>

          <div className="prototype-grid">
            <label className="field-stack">
              <span>Feedback</span>
              <select value={feedbackKind} onChange={(event) => setFeedbackKind(event.target.value as SlideFeedback["kind"])}>
                <option value="comment">comment</option>
                <option value="poll">poll</option>
                <option value="vote">vote</option>
                <option value="alignment">alignment</option>
              </select>
            </label>
            <label className="field-stack">
              <span>Value</span>
              <input
                value={feedbackKind === "alignment" ? feedbackValue : feedbackBody}
                onChange={(event) => {
                  if (feedbackKind === "alignment") {
                    setFeedbackValue(Number(event.target.value));
                  } else {
                    setFeedbackBody(event.target.value);
                  }
                }}
              />
            </label>
          </div>
          <button
            className="quality-button"
            type="button"
            disabled={!slideId}
            onClick={() => onAddFeedback(deckId, slideId, createFeedbackInput(feedbackKind, feedbackBody, feedbackValue, feedbackTargets[0]?.id))}
          >
            Add {feedbackKind}
          </button>

          <div className="slide-feedback-list" data-testid="slide-feedback-list">
            <strong>Feedback</strong>
            {activeSlide?.feedback.length ? activeSlide.feedback.map((feedback) => (
              <span key={feedback.id}>{feedback.kind} · {feedback.author}{feedback.value ? ` · ${feedback.value}` : ""}</span>
            )) : <span>아직 없음</span>}
          </div>
          <div className="slide-feedback-list">
            <strong>Blocks</strong>
            {activeSlide?.blocks.length ? activeSlide.blocks.map((block) => (
              <span key={block.id}>{block.kind} · {block.objectId ?? block.interactionId ?? block.content}</span>
            )) : <span>아직 없음</span>}
          </div>
        </>
      ) : null}
    </section>
  );
}

function createFeedbackInput(
  kind: SlideFeedback["kind"],
  body: string,
  value: number,
  firstTargetId: string | undefined
): { kind: SlideFeedback["kind"]; author: string; body?: string; choices?: string[]; targetId?: string; value?: number } {
  if (kind === "poll") {
    return { kind, author: "reviewer", choices: ["Tighter", "Roomier", "Presentation"] };
  }
  if (kind === "vote") {
    return { kind, author: "reviewer", ...(firstTargetId ? { targetId: firstTargetId } : {}) };
  }
  if (kind === "alignment") {
    return { kind, author: "reviewer", value };
  }
  return { kind, author: "reviewer", body };
}
