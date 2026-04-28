---
phase: 08
title: Prototyping, Slides, and AI Variations
slug: prototyping-slides-and-ai-variations
milestone: 2
status: context
inserted_by: reinforce
source: .planning/research/COMPETITIVE-GAP-REVIEW.md
---

# Phase 08 Context — Prototyping, Slides, and AI Variations

## Goal

Add real prototype interactions, deck authoring, and localized AI variation workflows on top of the canvas model.

## Requirements

- AI-01: User can ask the AI to rewrite or restyle only a selected region.
- AI-02: User can compare multiple generated visual directions side by side.
- AI-03: User can right-click or otherwise target an object and request a localized remix that preserves surrounding layout and source provenance.
- AI-04: User can run a canvas-aware agent action that reads the current canvas object model and emits typed operations instead of raw DOM edits.
- AI-05: User can export a portable prompt/script recipe that another agent runtime can replay against the same artifact package.
- PROTO-01: User can define click, hover, tap, keyboard, and timed prototype interactions between canvas objects and artboards.
- PROTO-02: User can model component state with variables, conditionals, and state sharing across matching components.
- PROTO-03: User can preview interactive prototypes in presentation mode without losing edit state.
- SLIDE-01: User can create a slide deck with slide view, grid view, speaker/presenter notes, and deck outline navigation.
- SLIDE-02: User can embed playable prototype blocks or live canvas objects inside a slide.
- SLIDE-03: User can collect presentation feedback through comments, polls, voting, or alignment-scale primitives.

## Context

Claude Design emphasizes iterative prompt/chat/inline feedback and variations. Figma supports interactive components, state, variables, and presentation workflows. Figma Slides adds slide/grid views, presenter notes, embedded prototypes, comments, polls, voting, and collaboration surfaces.

Phase 08 must treat prototypes and decks as first-class artifacts, not just generic pages.

## Acceptance Criteria

- Prototype interactions are stored as typed graph records.
- Presentation mode can play interactions without mutating source state.
- Slide decks have a stored outline and per-slide notes.
- Variations can be compared side by side and promoted.
- Selected-region AI edits produce typed operations with conflict/error handling.

## Explicit Non-Goals

- Full video editor.
- Full animation studio.
- Non-portable AI-only hidden state.
