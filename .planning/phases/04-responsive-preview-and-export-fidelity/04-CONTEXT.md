# Phase 04: Responsive Preview and Export Fidelity — Context

**Gathered:** 2026-04-27
**Status:** Ready for execution planning
**Mode:** autonomous continuation from `$sunco-auto`

## Phase Boundary

Phase 04 adds deterministic responsive preview widths, stored-state export materialization, and Korean typography/design quality flags. Export must use saved `ProjectBundle` state, asset manifest, tweak values, and patch log. It must not scrape or save transient live iframe DOM.

This phase does not add hosted storage, worker queues, full production observability, real cloud export infrastructure, or external sharing.

## Required Outcomes

- User can switch desktop, tablet, and mobile preview widths without losing selection or document state.
- Standalone HTML export is materialized from stored normalized HTML and strips editor-only metadata.
- Export job records exist for HTML, PNG, PDF, ZIP, and PPTX handoff surfaces.
- Export jobs record deterministic viewport/source revision and are tied to stored state.
- Korean quality audit flags line-break/overflow/contrast/generic-AI risks in the UI.
- Export and quality surfaces are browser-tested.
