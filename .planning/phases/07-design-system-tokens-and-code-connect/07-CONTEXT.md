---
phase: 07
title: Design System, Tokens, and Code Connect
slug: design-system-tokens-and-code-connect
milestone: 2
status: context
inserted_by: reinforce
source: .planning/research/COMPETITIVE-GAP-REVIEW.md
---

# Phase 07 Context — Design System, Tokens, and Code Connect

## Goal

Turn the design-system placeholder into a governed, versioned, code-connected system that can be reused across projects and agents.

## Requirements

- DSGN-04: User can maintain project-level design skills, brand rules, reusable presets, and artifact-specific style rules beyond the core design-system setup.
- DSGN-05: User can publish, remix, version, and roll back a design system after reviewing extracted colors, typography, spacing, components, and layout patterns.
- DSGN-06: User can map design tokens to CSS variables, Tailwind classes, and code-component references.
- DSGN-07: User can open a component playground to test component variants, props, variable modes, and states without mutating the main canvas.
- DSGN-08: User can attach Storybook, GitHub, docs, and code references to design-system components and preserve those links in handoff.

## Context

Claude Design's design-system setup extracts reusable components, colors, typography, and patterns from codebases, decks, documents, brand assets, and other references. Figma Dev Mode/Code Connect emphasizes token/code connection and component playground behavior. Paper's roadmap emphasizes code components, Tailwind, themes, and tokens.

Phase 07 must make design systems concrete and auditable instead of a one-click placeholder.

## Acceptance Criteria

- Extracted design-system candidates require review before publish.
- Design systems have version history and rollback.
- Tokens have stable names, values, modes, provenance, and code mapping.
- Component playground works without mutating the canvas.
- Agent handoff includes design-system files and source links.

## Explicit Non-Goals

- Marketplace distribution.
- Automatic perfect inference from arbitrary undocumented codebases.
- Runtime lock-in to one provider or one coding agent.
