---
phase: 10
title: Dev Mode, Publish, and Export Fidelity
slug: dev-mode-publish-and-export-fidelity
milestone: 2
status: context
inserted_by: reinforce
source: .planning/research/COMPETITIVE-GAP-REVIEW.md
---

# Phase 10 Context — Dev Mode, Publish, and Export Fidelity

## Goal

Add Figma Dev Mode-style inspection, ready-for-dev state, version comparison, real file exports, publish previews, and code-agent roundtrip.

## Requirements

- DEV-01: User can inspect selected objects for measurements, spacing, CSS, tokens, accessibility notes, component metadata, and prototype interactions.
- DEV-02: User can copy code snippets or token references that correspond to the selected design object.
- DEV-03: User can mark frames or components as ready for dev and compare changes across saved versions.
- DEV-04: User can download detected assets and inspect original asset metadata from the dev surface.
- EXP-09: User can publish a responsive hosted preview or static site from stored artifact state.
- EXP-10: User can export real files for HTML, ZIP, PNG, PDF, and PPTX with deterministic visual-diff verification.
- EXP-11: User can export MP4/GIF for authored animation templates.
- EXP-12: User can export a GitHub/code-agent package and roundtrip code-side changes back into the artifact package.
- SLIDE-04: User can export rasterized PPTX slides from artboards.
- SLIDE-05: User can export editable PPTX for a strict subset of text, image, and shape nodes.

## Context

Figma Dev Mode sets the expected handoff bar: inspectable measurements, token details, component metadata, code snippets, version comparison, ready-for-dev states, and downloadable assets. Figma Sites/Paper emphasize production continuity. Claude Design exposes multiple export/handoff routes.

Phase 10 must turn export and handoff records into real artifacts with verifiable fidelity.

## Acceptance Criteria

- Inspect panel values come from stored state and rendered layout snapshots.
- Ready-for-dev and version diff states survive reload.
- Exported files are written to disk or storage and verified against deterministic fixtures.
- Published previews are generated from stored state, not live iframe DOM.
- Code-agent roundtrip has conflict detection when code-side changes cannot map cleanly back.

## Explicit Non-Goals

- Full production hosting platform.
- Pixel-perfect editable Figma export.
- Full semantic PPTX coverage beyond the strict supported subset.
