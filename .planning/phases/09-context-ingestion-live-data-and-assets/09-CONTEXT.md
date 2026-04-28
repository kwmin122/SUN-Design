---
phase: 09
title: Context Ingestion, Live Data, and Assets
slug: context-ingestion-live-data-and-assets
milestone: 2
status: context
inserted_by: reinforce
source: .planning/research/COMPETITIVE-GAP-REVIEW.md
---

# Phase 09 Context — Context Ingestion, Live Data, and Assets

## Goal

Replace placeholder context records with real source ingestion, provenance, editable live snapshots, and data-bound content.

## Requirements

- CTX-01: User can ingest real screenshots, images, URLs, DOCX, PPTX, XLSX, Figma exports, and codebase folders into structured project context.
- CTX-02: User gets generated `source-notes.md` and `design-context.md` files that record official sources, asset paths, uncertain facts, and usage rights.
- CTX-03: User can capture a live web page or selected region into editable canvas sections with source provenance.
- DATA-01: Documents can sync between local storage and a hosted account.
- DATA-02: User can bind components to CSV, spreadsheet, API fixture, or static JSON data and preview realistic repeated content.
- ASSET-01: User can cache, replace, relink, and audit project assets with stable URLs, source notes, and license/provenance metadata.

## Context

Claude Design's output quality depends on reference material and design-system inputs. Paper's roadmap includes Paper Snapshot, live data, and hosted assets. Figma Make/Sites workflows increasingly use frames, context, and live app/publish paths.

Phase 09 must make context reliable: every asset and source should be traceable, inspectable, and safe to reuse.

## Acceptance Criteria

- Each ingested source has type, hash, path, provenance, parsing status, and usage status.
- `source-notes.md` and `design-context.md` are generated or updated per project.
- Web snapshot import creates editable sections without trusting remote scripts.
- Data bindings render realistic repeated content and degrade safely on missing data.
- Asset replacement keeps patch logs and export references coherent.

## Explicit Non-Goals

- Scraping private sites without user-provided access.
- Using unverified assets as core visuals.
- Hosted storage hardening before local-first sync semantics are validated.
