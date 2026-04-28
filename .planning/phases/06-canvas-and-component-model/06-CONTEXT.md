---
phase: 06
title: Canvas and Component Model
slug: canvas-and-component-model
milestone: 2
status: context
inserted_by: reinforce
source: .planning/research/COMPETITIVE-GAP-REVIEW.md
---

# Phase 06 Context — Canvas and Component Model

## Goal

Promote normalized HTML nodes into explicit canvas objects and reusable component instances while preserving HTML/CSS as the exportable substrate.

## Requirements

- CANVAS-01: User can work with pages, artboards, frames, sections, component instances, and primitive text/image/vector nodes as explicit canvas objects.
- CANVAS-02: User can use a visible layer tree to select, reorder, group, hide, lock, and rename canvas objects.
- CANVAS-03: User can apply constraints, snapping, guides, and resize rules that persist through reload and export.
- CANVAS-04: User can edit CSS flex, auto-layout-like behavior, CSS Grid, gap, padding, alignment, and breakpoints through structured controls.
- CANVAS-05: User can create and edit reusable component instances with slots, props, variants, overrides, and state.

## Context

Milestone 1 has stable normalized HTML, EditGraph, patch log, and constrained direct edits. Phase 06 must add professional canvas semantics without replacing that source-of-truth family with a proprietary-only model.

Paper's HTML/CSS canvas direction and Figma's frame/layer/component fundamentals are the reference bar. The app must feel like a real design tool while still exporting and handing off HTML/CSS.

## Acceptance Criteria

- Canvas objects are represented in stored state and survive reload.
- Layer tree operations emit typed patches or schema migrations.
- Constraints and layout controls are validated and reject unsafe or unsupported values.
- Component instances support at least one reusable slot/prop/variant path.
- Browser verification covers desktop, tablet, and mobile.

## Explicit Non-Goals

- Full vector/path editor.
- Full multiplayer editing.
- Proprietary canvas format that cannot export to web-standard HTML/CSS.
