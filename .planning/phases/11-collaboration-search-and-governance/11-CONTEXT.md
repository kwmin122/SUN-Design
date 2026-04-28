---
phase: 11
title: Collaboration, Search, and Governance
slug: collaboration-search-and-governance
milestone: 2
status: context
inserted_by: reinforce
source: .planning/research/COMPETITIVE-GAP-REVIEW.md
---

# Phase 11 Context — Collaboration, Search, and Governance

## Goal

Make the workspace navigable and team-ready without losing the local-first path.

## Requirements

- HOME-01: User can browse recent designs, examples, templates, design systems, and project folders from a first-class project home.
- HOME-02: User can search designs by name, tag, source asset, design system, artifact type, and semantic content.
- HOME-03: User can organize projects with nested folders, tags, ownership, and lifecycle status.
- COLL-01: Multiple users can comment or collaborate on the same document.
- COLL-02: User can see presence, follow/spotlight another collaborator, and review activity history.
- COLL-03: User can use role-based sharing, review states, approval status, and audit log records.
- COLL-04: User can attach annotations and implementation notes to frames, components, and selected layers.
- QUAL-02: User can run quality gates for accessibility, contrast, overflow, responsive breakage, source provenance, and generic AI visual patterns.
- REG-01: Patches can be replayed across AI-regenerated base revisions with conflict handling.

## Context

Figma and Claude Design both make project navigation, sharing, comments, and team workflows core to the product. Paper's roadmap also calls out full sharing settings, nested folders, tags, and smart search. K-Design must support solo local-first work first, but the artifact model must not block team usage.

Phase 11 closes the workspace shell gap after the core object, system, prototype, context, and dev-mode surfaces are stable.

## Acceptance Criteria

- Project home exposes recents, folders, tags, examples, templates, and design-system libraries.
- Search indexes project metadata, source metadata, artifact type, and semantic content.
- Sharing/review/audit records are stored in the project/account model.
- Quality gates run against stored state and rendered snapshots.
- Regeneration replay shows conflicts instead of silently overwriting user edits.

## Explicit Non-Goals

- Full multiplayer CRDT as the first collaboration step.
- Public marketplace.
- Enterprise compliance hardening before role/review/audit primitives are proven.
