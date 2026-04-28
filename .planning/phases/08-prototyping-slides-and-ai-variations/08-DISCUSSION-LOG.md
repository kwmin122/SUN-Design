# Phase 08: Prototyping, Slides, and AI Variations — Gap Discussion Log

> Audit trail only. Do not use as input to planning, research, or execution agents.
> Decisions are captured in `08-CONTEXT.md`; this log preserves alternatives considered.

**Date:** 2026-04-28  
**Phase:** 08-prototyping-slides-and-ai-variations  
**Areas discussed:** Gap scope, agent runtime/output contract, canvas context package, product workflow, validation and tests  
**Mode:** gaps-only, recommended-default discussion

---

## Context Handling

Phase 08 already had context, plans, summaries, verification, and two remediation commits. The user requested `$sunco-discuss 8 --gaps-only`, so the discussion updated the existing context rather than reopening all Phase 08 scope.

Codex Default mode does not expose the structured `request_user_input` UI, and the user previously asked the agent to keep moving. The discussion therefore selected reasonable defaults from the existing founder intent and independent verification findings.

---

## Gap Scope

| Option | Description | Selected |
|---|---|---|
| Reopen all Phase 08 | Replan prototype, slides, variations, recipes, and UI together. | |
| AI-01 through AI-04 only | Keep completed prototype/slide/AI-05 foundation intact and discuss only the ship-hold gap. | yes |
| Defer AI gaps to Phase 09+ | Keep Phase 08 foundation-only and move on. | |

**Selected:** AI-01 through AI-04 only.  
**Reason:** Persisted-state integrity and helper hardening are fixed. The remaining ship hold is specifically real canvas-aware agent/model output ingestion.

---

## Agent Runtime and Output Contract

| Option | Description | Selected |
|---|---|---|
| Single hosted provider | Wire one cloud model/API directly into the app. | |
| Agent-agnostic structured output ingestion | Accept model/agent-produced structured output from Codex, Claude Code, Cursor, local agents, or web agents. | yes |
| Keep deterministic local directions | Preserve current hardcoded directions as the product path. | |

**Selected:** Agent-agnostic structured output ingestion.  
**Reason:** The product must not be Claude-only or provider-specific. The completion evidence must be a real model-shaped output path, not hardcoded direction labels.

---

## Canvas Context Package

| Option | Description | Selected |
|---|---|---|
| Full bundle prompt | Send the entire `ProjectBundle` and let the model decide. | |
| Selected-region package | Send target object, ancestor chain, relevant surrounding context, tokens/design-system refs, source revision, and prompt. | yes |
| Live iframe scrape | Read the current iframe DOM to generate edits. | |

**Selected:** Selected-region package.  
**Reason:** It keeps remix targeted, preserves surrounding layout, and follows the source-of-truth contract. Live iframe scraping remains forbidden.

---

## Product Workflow

| Option | Description | Selected |
|---|---|---|
| Hidden developer import only | Support generated JSON import but no visible design workflow. | |
| Visible selected-object remix workflow | Add selected-object/right-click or panel workflow, generated direction status, compare, validation failures, and promote. | yes |
| Auto-apply model output | Apply the first generated result immediately. | |

**Selected:** Visible selected-object remix workflow.  
**Reason:** Claude Design/Paper/Figma-level quality requires a real product surface with reviewable candidates, not a backend-only schema path.

---

## Validation and Tests

| Option | Description | Selected |
|---|---|---|
| Schema parse only | Trust typed output once it passes Zod. | |
| Full integrity and scope validation | Validate object refs, source revision, target scope, supported ops, unsafe patch values, provenance, diagnostics, reload. | yes |
| Manual QA only | Rely on visual inspection without regression tests. | |

**Selected:** Full integrity and scope validation.  
**Reason:** Phase 06 and Phase 08 already found graph corruption classes; the agent path must not reopen those bugs.

---

## Claude's Discretion

- Exact type names may change during planning.
- UI labels may be Korean-first as long as they keep the workflow clear.
- A deterministic fixture adapter may exist for tests, but deterministic directions alone cannot complete AI-01 through AI-04.

## Deferred Ideas

- Hosted provider billing/auth and worker queues.
- Full live data/context ingestion.
- Dev Mode publish/export fidelity.
- Realtime collaboration and governance.
