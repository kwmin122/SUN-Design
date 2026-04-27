# ARCHITECTURE Research

## Product Shape

Pipeline: prompt -> generated HTML -> sandboxed iframe preview -> direct visual editing -> right Tweaks panel -> export.

The hard problem is not rendering HTML. It is preserving editable intent while the preview remains isolated, generated markup stays arbitrary enough to feel useful, and exports remain deterministic.

## Recommended Pattern

Use a hybrid architecture:

1. Keep the generated HTML bundle as the base source.
2. Normalize it into an `EditGraph` with stable `data-cdx-id` attributes and node metadata.
3. Persist all user edits as schema-validated patches against that graph.
4. Render the result in a sandboxed iframe through a small injected preview bridge.
5. Export by materializing `base bundle + patch log + assets` into clean standalone output.

This keeps the product flexible like "edit any generated page" without letting live iframe DOM mutations become the source of truth.

## Component Boundaries

| Component | Owns | Does not own |
|---|---|---|
| App Shell | Canvas chrome, selection state, right Tweaks panel, command routing | Generated document execution |
| Agent Adapter | Prompt request, model/runtime invocation, generated artifact contract | Direct mutation of editor state |
| HTML Normalizer | Sanitization, asset capture, `data-cdx-id` injection, initial `EditGraph` | UI controls |
| Project Store | `ProjectBundle`, `EditGraph`, patch log, undo/redo, snapshots | iframe DOM as durable state |
| Preview Sandbox | Isolated render, hit testing, layout snapshots, patch application | Parent app secrets or storage |
| Canvas Overlay | Selection boxes, drag/resize handles, guides | Reading iframe DOM directly |
| Tweaks Panel | Property editors, validated patch creation | Free-form DOM writes |
| Exporter | Materialized HTML/CSS/assets, zip, screenshot/PDF jobs | Editor-only bridge scripts |

## Core Data Model

```ts
type ProjectBundle = {
  id: string;
  baseRevision: string;
  html: string;
  cssAssets: Asset[];
  mediaAssets: Asset[];
  editGraph: EditGraph;
  patches: EditPatch[];
};

type EditNode = {
  id: string;                 // data-cdx-id
  kind: "frame" | "text" | "image" | "button" | "input" | "decorative" | "unknown";
  parentId?: string;
  domPath: string;            // fallback path, not primary identity
  fingerprint: string;        // tag + role + text hash + class/style hints
  editableProps: string[];
  lastLayout?: DOMRectLike;
};

type EditPatch = {
  id: string;
  nodeId: string;
  op: "setStyle" | "setText" | "replaceAsset" | "setAttr" | "move" | "resize";
  value: unknown;
  source: "canvas" | "tweaks" | "agent";
  baseRevision: string;
};
```

## Data Flow

```text
Prompt
  -> Agent Adapter
  -> GeneratedArtifact { html, assets, optional designIntent }
  -> HTML Normalizer { sanitize, inject ids, build EditGraph }
  -> Project Store { base bundle, revision 0 }
  -> Preview Sandbox iframe { render normalized html + bridge }
  -> Bridge emits layout snapshot + selectable nodes
  -> Canvas Overlay / Tweaks Panel create EditPatch
  -> Project Store appends patch + updates undo stack
  -> Preview Sandbox applies patch and re-emits affected layout
  -> Exporter materializes clean artifact
```

## DOM-to-Edit-Model Mapping

Do not rely on CSS selectors alone. Generated HTML will change, class names may be low quality, and visual edits need stable identity.

Mapping strategy:

- Normalization pass injects `data-cdx-id` into editable block, text, image, button, and form-like nodes.
- Each node stores a fallback `domPath` and a `fingerprint` built from tag, role, accessible label, nearby text hash, class list, and sibling index.
- The iframe bridge owns hit testing with `elementFromPoint()` and sends `nodeId` events to the parent.
- The parent only accepts node ids that exist in the current `EditGraph`.
- After agent regeneration, re-anchor patches by `data-cdx-id` first, then fingerprint, then path. Unmatched patches become explicit conflicts.
- First release should avoid deep semantic anchoring, full design-system inference, and auto-layout reconstruction. Support stable element identity, text edits, asset swaps, color, typography, spacing, size, and simple position changes first.

## Sandbox Security

Generated HTML is untrusted content.

Recommended preview mode:

- Use a sandboxed iframe without `allow-same-origin`.
- Prefer no generated scripts by default. If scripts are needed, enable a separate "interactive preview" mode with `allow-scripts`, still without `allow-same-origin`.
- Parent app must not read iframe DOM directly. The injected bridge inside the iframe sends whitelisted messages via `postMessage`.
- Validate message `source`, session nonce, schema, and expected message type. For opaque sandbox origins, `origin` may be `null`, so source and nonce checks matter.
- Sanitize `srcdoc` input and use Trusted Types where available.
- Strip or proxy external assets. Block form submission, popups, top navigation, downloads, and credentialed requests by default.
- Apply CSP for the parent app and, when serving preview documents over a URL, add a restrictive CSP/sandbox response.

Why: MDN documents that unsandboxed `srcdoc` can become same-origin with the parent and is an XSS vector, and that `postMessage` receivers must validate sender identity. MDN also warns against combining `allow-scripts` and `allow-same-origin` for same-origin embedded documents.

References:

- https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP

## Edit Persistence

Persistence should be event-sourced:

- Store the normalized base bundle once.
- Append patches for every user-visible change.
- Maintain undo/redo as inverse patches or patch cursor movement.
- Save periodic materialized snapshots for fast reload, but treat snapshots as cache.
- Persist locally in IndexedDB first; sync/server persistence can use the same bundle + patch log contract.
- Agent edits should enter as proposed patches or a new base revision, never as silent DOM replacement.

This gives a clear conflict model: if the base HTML changes, replay patches onto the new `EditGraph`; show conflicts where re-anchoring fails.

## Export Pipeline

Exporter contract:

1. Load `ProjectBundle`.
2. Apply patch log to a clean normalized DOM.
3. Remove editor-only bridge scripts, overlays, non-export metadata if requested, and internal CSP/debug tags.
4. Resolve assets into `/assets` or inline data URLs based on export mode.
5. Emit:
   - `index.html`
   - `assets/*`
   - optional `project.cdx.json` for re-import/edit continuation
   - optional thumbnail/screenshot/PDF from a headless render job of the materialized stored state

The exported HTML and any screenshot/PDF capture input must be produced from stored state. A browser may render that materialized output for capture, but the exporter must not serialize or copy ad-hoc live iframe DOM mutations.

## Agent and Runtime Boundary

The agent/runtime boundary should be artifact-based:

- Input to agent: prompt, selected node context, small DOM fragment, computed styles, screenshot crop, and user intent.
- Output from agent: `GeneratedArtifact`, `EditPatch[]`, or `BaseRevisionProposal`.
- The editor validates all agent output against schemas before applying it.
- The agent never receives parent app credentials, local storage, full user workspace state, or direct iframe access.
- The preview bridge is a render/runtime component, not an AI agent.

This keeps model variability behind a contract and lets local, hosted, or multi-model runtimes swap without changing editor internals.

## Architecture Patterns Considered

### Pattern A: Live DOM as Source of Truth

Edit the iframe DOM directly and serialize it for save/export.

Pros:

- Fastest prototype.
- Minimal data modeling.
- Easy to demonstrate click-to-edit.

Cons:

- Unsafe pressure to use same-origin iframe access.
- Undo, conflict handling, regeneration, and export become brittle.
- Hard to distinguish user intent from browser-normalized DOM.

Use only for a throwaway demo.

### Pattern B: Strict Component DSL as Source of Truth

Require the agent to generate a structured component tree, then render HTML from that schema.

Pros:

- Strong editing semantics.
- Easier constraints, undo, export, and collaboration.
- Better long-term design-system integration.

Cons:

- Less flexible for arbitrary generated HTML.
- Agent output must fit the DSL.
- High upfront schema/design-system cost.

Good later if the product becomes "AI Figma for a controlled component system."

### Pattern C: HTML Base + EditGraph + Patch Log

Preserve generated HTML, normalize it into editable nodes, and persist validated patches.

Pros:

- Handles arbitrary generated HTML while keeping durable edit semantics.
- Works with sandboxed iframe communication.
- Supports regeneration, undo, export, and future collaboration incrementally.

Cons:

- Requires a normalizer, bridge protocol, and re-anchor logic.
- Some edits will remain approximate until layout semantics improve.
- Needs clear conflict UI when regenerated HTML diverges.

Recommended for this product.

## Suggested Build Order

1. Project model: `ProjectBundle`, `EditGraph`, `EditPatch`, local persistence, undo/redo.
2. Static sandbox preview: render sanitized sample HTML in iframe with bridge messaging.
3. Normalizer: inject stable ids, classify basic nodes, emit layout snapshots.
4. Selection loop: click iframe element -> bridge message -> overlay selection -> Tweaks panel binds to node.
5. Patch loop: edit text/color/typography/spacing/size/image -> append patch -> iframe applies patch.
6. Prompt adapter: generate/import HTML into the same normalization pipeline. Start with one runtime behind `AgentAdapter`.
7. Exporter: deterministic standalone HTML + assets + optional re-import manifest.
8. Regeneration/re-anchor: selected-node prompt edits, patch replay, conflict surfacing.
9. Advanced surface: drag/resize guides, responsive breakpoints, interactive JS preview, collaboration, design-system extraction.

## Planning Recommendation

Plan the first vertical slice around this proof:

`typed prompt or sample HTML -> normalized iframe preview -> select visible element -> edit in Tweaks panel -> reload and preserve patch -> export clean HTML`.

Anything outside that loop should be deferred unless it directly improves the mapping, sandbox, persistence, or export contract.
