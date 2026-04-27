# STACK Research

Date: 2026-04-27  
Product: Claude Design-grade, agent-agnostic Korean design IDE. Prompt/context -> generated or imported HTML -> iframe preview -> direct rendered editing -> right Tweaks panel -> export/handoff to HTML/ZIP/PDF/PPTX/PNG/Canva/agents, with MP4 later.

## Executive Recommendation

Build a TypeScript monorepo with a Next.js web app, a model-first HTML design core, a sandboxed iframe preview runtime, parent-side overlay controls, and a separate export worker.

The important stack decision: do not make the live iframe DOM the source of truth. Store a typed `ProjectBundle`, `EditGraph`, and patch log, render that state into safe HTML, then use the iframe DOM only as a measured projection for selection, drag, resize, text editing, and export.

Confidence: high for app/export stack, medium-high for editor architecture, medium for PPTX/MP4 because faithful visual export and editable native PowerPoint are different products.

## 2026 Baseline

Current package snapshot checked via npm on 2026-04-27:

| Area | Package | Current |
|---|---:|---:|
| Web framework | `next` | `16.2.4` |
| UI runtime | `react` | `19.2.5` |
| Styling | `tailwindcss` | `4.2.4` |
| Overlay transforms | `react-moveable` | `0.56.0` |
| Infinite canvas alternative | `tldraw` | `4.5.10` |
| Export browser | `playwright` | `1.59.1` |
| PPTX generation | `pptxgenjs` | `4.0.1` |
| Video generation | `@remotion/renderer` | `4.0.452` |
| ORM | `drizzle-orm` | `0.45.2` |
| AI adapter | `ai` | `6.0.168` |
| Auth | `@clerk/nextjs` | `7.2.7` |
| CRDT option | `yjs` | `13.6.30` |
| HTML parser | `parse5` | `8.0.1` |
| CSS parser | `postcss` | `8.5.12` |

## Frontend Framework

Use:

- `Next.js 16 App Router`, `React 19`, `TypeScript`, `pnpm workspaces`.
- `Tailwind CSS v4` for app UI and generated design tokens. Use CSS-first theme variables.
- `shadcn/ui` plus Radix primitives for controls, panels, menus, dialogs, tabs, popovers, command menus, and toolbars.
- `lucide-react` for editor command icons.
- `Zustand` for editor UI/session state.
- `TanStack Query` for server cache and export job polling.
- `Vitest` for pure package tests, `Playwright` for editor/export E2E.

App shape:

```txt
apps/web
  app/(editor)/projects/[projectId]/page.tsx
  app/api/generate/route.ts
  app/api/projects/[projectId]/documents/[documentId]/route.ts
  app/api/export-jobs/route.ts
apps/export-worker
packages/editor-core
packages/preview-runtime
packages/export
packages/ui
packages/shared
```

Reasoning:

- Next gives auth integration, API routes, server components for non-editor surfaces, and strong deployment defaults.
- The actual editor should be a client island. Keep heavy pointer/canvas/iframe logic outside React Server Components.
- Do not build this as a pure Vite SPA unless backend/auth/export are intentionally externalized from day one.

Confidence: high.

## AI and Runtime Adapter Stack

Use an internal model adapter, not model calls scattered through UI code.

Recommended:

- Primary generation path: `apps/web` route handler -> `packages/ai` service -> provider/runtime adapter.
- Default runtime should follow the user's active agent family where possible: Codex-family inside Codex workflows, Claude-family inside Claude workflows, and portable fallback adapters elsewhere. The user experience must not start as an API-key/provider chooser.
- Output contract: model must return `GeneratedArtifact`, `EditPatch[]`, or `BaseRevisionProposal` plus sanitized HTML/CSS, not arbitrary final HTML only.
- Require structured output and repair loops: `generate -> parse -> sanitize -> render -> visual smoke -> fix`.
- Agent handoff contract: export plain project files (`index.html`, `project.cdx.json`, assets, source notes, and design-agent prompt files) that Codex, Claude Code, Cursor, local agents, and web agents can read.

Do not make provider/API key choice visible as the main UX. Users type natural Korean prompts; the stack handles model routing.

Confidence: medium-high. Model versions change fast, but the adapter boundary is durable.

## Canvas and Editor Architecture

Recommended architecture:

```txt
Prompt
  -> Design generator
  -> ProjectBundle + EditGraph + assets + tokens + patch log
  -> Safe HTML/CSS renderer
  -> Sandboxed iframe preview
  -> Iframe bridge measures DOMRects and hit targets
  -> Parent overlay renders selection boxes and handles
  -> Tweaks panel emits typed operations
  -> ProjectBundle updates, snapshots, rerender
```

Core rule:

- Source of truth: `ProjectBundle + EditGraph + patch log`.
- Projection: iframe DOM.
- Interaction shell: parent overlay.
- Persistence: operations plus snapshots.

`ProjectBundle` / `EditGraph` minimum:

```ts
type ProjectBundle = {
  id: string
  baseRevision: string
  html: string
  cssAssets: AssetRef[]
  mediaAssets: AssetRef[]
  editGraph: EditGraph
  patches: EditPatch[]
}

type EditGraph = {
  nodes: Record<string, EditNode>
  tokens: DesignTokens
  assets: AssetRef[]
}
```

Each rendered element must include stable IDs:

```html
<section data-cdx-id="node_123" data-cdx-role="frame">...</section>
```

Direct editing model:

- Click/select: iframe bridge hit-tests `[data-cdx-id]` and posts selected node ID plus rect.
- Drag/resize/rotate: parent overlay uses `react-moveable`; commit `setLayout`, `setSize`, `setTransform`, or `setStyle` operations.
- Text edit: start controlled text-edit mode inside iframe bridge, then commit `setText`.
- Tweaks panel: write typed style/layout ops, not raw string mutation.
- Undo/redo: operation log with inverse ops.

Design subset:

- For the first real release, require generated output to use an editor-safe subset: artboards, frames, groups, text, image, icon/SVG, button, input, repeated cards.
- Prefer absolute positioning inside artboard/page design surfaces.
- Allow flex/grid containers only when the Tweaks panel edits container properties instead of free-dragging children.
- Arbitrary existing HTML import is read-only or "convert to editable subset" until proven.

Confidence: medium-high. This is the hardest part of the product and should be prototyped before expanding features.

## DOM Overlay and Editor Libraries

Recommended:

- `react-moveable` for control boxes: drag, resize, scale, rotate, group, snap, bounds.
- Custom iframe bridge for hit testing, rect measurement, scroll/zoom synchronization, text editing, and postMessage protocol.
- `parse5` for HTML parse/serialize.
- `PostCSS` or `css-tree` for CSS AST and style patching.
- `DOMPurify` or `rehype-sanitize` style allowlist for generated/imported HTML.

Use `tldraw` only for future whiteboard/moodboard modes, not as the main HTML editor. tldraw is excellent for infinite canvas apps, but the product's core artifact is HTML rendered in a browser.

Confidence: medium-high for Moveable plus custom bridge; low for using an off-the-shelf web builder as the core.

## Iframe Sandbox

Recommended preview boundary:

- Serve preview content on a separate preview origin when deployed, for example `preview.example.com`.
- In local/dev, keep iframe content isolated and treat all generated HTML as untrusted.
- Strip user/model scripts by default.
- Inject only the signed preview bridge script needed for measurement and editor events.
- Use iframe `sandbox` without app-origin DOM access.

Initial iframe policy:

```html
<iframe
  sandbox="allow-scripts"
  referrerpolicy="no-referrer"
/>
```

Avoid:

- Do not use app-origin iframe content with both `allow-scripts` and `allow-same-origin`.
- Do not let generated HTML access app cookies, localStorage, parent DOM, downloads, forms, popups, or top navigation.
- Do not depend on parent direct DOM reads from the iframe.

Communication:

- Use `postMessage` with a per-frame nonce, message schema validation, and `event.source === iframe.contentWindow`.
- If using opaque-origin `srcdoc`, origin may be `null`; nonce and source checks become mandatory.
- If using separate preview origin, verify exact origin and nonce.

CSP:

```txt
default-src 'none';
img-src data: blob: https:;
font-src data: https:;
style-src 'unsafe-inline';
script-src 'sha256-<bridge-hash>';
connect-src 'none';
frame-ancestors 'self' https://app.example.com;
base-uri 'none';
form-action 'none';
```

Confidence: high. Security boundaries must be implemented before public beta.

## Export Stack

Recommended path:

- HTML: materialize safe `ProjectBundle + patch log` output plus assets manifest.
- PNG: `Playwright` worker loads canonical render URL and uses `page.screenshot`.
- PDF: `Playwright` worker uses Chromium `page.pdf`; call `emulateMedia({ media: "screen" })` for visual fidelity when needed.
- PPTX v1: render each artboard/page to PNG and place each image into a slide with `PptxGenJS.addImage`. This is visually reliable but not editable in PowerPoint.
- PPTX v2: semantic PPTX export for a strict subset: text boxes, images, simple shapes, backgrounds. Do not promise full editability for arbitrary HTML/CSS.
- MP4: defer. For product-native animation templates, use Remotion. For arbitrary HTML/CSS animation capture, use Playwright frame capture plus FFmpeg in a worker container.

Run exports outside serverless request handlers:

```txt
web app -> export_jobs row -> queue -> apps/export-worker -> R2/S3 artifact -> signed download URL
```

Worker requirements:

- Container with Chromium, fonts, `fonts-noto-cjk` or bundled Korean fonts, FFmpeg for video.
- Deterministic viewport/artboard dimensions.
- Asset preloading and font-ready waits before capture.
- Visual regression tests for representative Korean text, gradients, SVGs, images, and long pages.

Confidence:

- HTML: high.
- PNG/PDF: high.
- Raster PPTX: high.
- Editable PPTX: medium-low.
- MP4: medium for authored timelines, low for arbitrary HTML capture.

## Persistence

Use:

- `Postgres` on Neon or Supabase.
- `Drizzle ORM`.
- `Cloudflare R2` or S3-compatible storage for images, generated exports, snapshots, and uploaded assets.
- Redis/BullMQ, Inngest, Trigger.dev, or Cloud Tasks for export queue. If staying simple, start with BullMQ plus managed Redis.

Schema minimum:

```txt
users
organizations
projects
documents
document_versions
document_operations
assets
export_jobs
generation_runs
```

Document persistence:

- Store current snapshot as JSONB.
- Append typed operations for undo, audit, and replay.
- Store generated HTML/CSS snapshot per version for export reproducibility.
- Store asset metadata in Postgres and binary assets in object storage.

Collaboration:

- Do not start with full CRDT if the first milestone is solo prompt/edit/export.
- Keep operations deterministic so a future Yjs adapter can map shared state to the same `EditGraph`.
- Add Yjs only when real-time multi-user editing is in scope.

Confidence: high for Postgres plus operation log; medium for future CRDT bridge.

## Auth and Deployment

Recommended production setup:

- Web: Vercel, Next.js app.
- Preview: separate Vercel project or edge/static service on `preview.<domain>` with no auth cookies and strict headers.
- Export worker: Fly.io, Google Cloud Run, Render, or AWS ECS. Prefer a container platform over serverless functions because Chromium/FFmpeg exports are long and dependency-heavy.
- DB: Neon Postgres.
- Storage: Cloudflare R2.
- Queue: managed Redis plus BullMQ, or managed workflow service if team wants dashboards/retries.
- Observability: Sentry, PostHog, OpenTelemetry logs for generation/export runs.

Auth:

- Use Clerk for alpha if teams/orgs/sharing matter immediately.
- If Korean consumer login via Kakao/Naver is a launch blocker, use Auth.js with custom OAuth providers instead.
- Keep internal `userId`/`orgId` abstractions provider-neutral so auth can move before GA.

Confidence: high for deployment split; medium for auth because Korean-market login priorities may change.

## Alternatives Rejected

| Alternative | Reject / Defer Reason | Confidence |
|---|---|---:|
| Directly mutate iframe DOM as source of truth | Breaks undo, diff, versioning, sanitization, export reproducibility, and AI patching. | high |
| GrapesJS as core editor | Strong page-builder base, but it owns too much UI/model behavior and fights a Claude-grade custom editor UX. Good only for reference/prototypes. | high |
| tldraw as main editor | Great React infinite canvas SDK, but source is canvas shapes, not browser-rendered HTML. Use later for moodboards/annotation. | high |
| Craft.js/React component tree as core | Forces generated output into React component constraints; product promise is HTML generation and browser preview. | medium-high |
| Konva/Fabric/Pixi canvas renderer | Good object canvas, weak for real HTML/CSS fidelity and export-to-HTML promise. | high |
| html2canvas/dom-to-image for export | Lower fidelity and more edge cases than headless browser rendering for CSS/fonts/media. | high |
| Vercel-only export functions | Browser/PDF/video exports need Chromium, fonts, retries, and long-running jobs. Use a worker container. | high |
| Full CRDT on day one | Adds distributed-state complexity before operation semantics are stable. Start with op log, add Yjs later. | medium-high |
| Arbitrary JS execution in preview | Too risky for public product. Strip scripts first; add isolated interactive mode later. | high |

## Source Notes

- Next App Router docs, last updated 2026-03-31: https://nextjs.org/docs/app
- React latest docs/version page: https://react.dev/versions
- Tailwind CSS v4 architecture: https://tailwindcss.com/blog/tailwindcss-v4
- shadcn CLI v4 / framework templates: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- MDN iframe sandbox guidance: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- MDN `postMessage` security guidance: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- Moveable docs: https://daybrush.com/moveable/release/latest/doc/Moveable.html
- tldraw SDK positioning: https://tldraw.dev/
- GrapesJS positioning: https://grapesjs.github.io/grapesjs/
- parse5 HTML parser: https://parse5.js.org/
- PostCSS: https://postcss.org/
- Yjs CRDT docs: https://docs.yjs.dev/
- Playwright screenshots: https://playwright.dev/docs/screenshots
- Playwright `page.pdf`: https://playwright.dev/docs/next/api/class-page#page-pdf
- PptxGenJS slide/image and saving docs: https://gitbrent.github.io/PptxGenJS/docs/usage-add-slide.html
- Remotion programmatic video docs: https://www.remotiondocs.com/
- Vercel AI Gateway quickstart, current model-routing surface: https://vercel.com/docs/ai-gateway/getting-started/text
- Anthropic Claude API docs: https://platform.claude.com/docs/en/home
- Drizzle ORM: https://orm.drizzle.team/
- Clerk Organizations for Next.js: https://clerk.com/docs/nextjs/guides/organizations/getting-started
- Cloudflare R2 S3 compatibility: https://developers.cloudflare.com/r2/api/s3/api/
