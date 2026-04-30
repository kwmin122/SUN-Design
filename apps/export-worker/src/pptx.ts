import { readFileSync } from "node:fs";
import path from "node:path";

import type { AssetRef, CanvasObject, EditNode, ProjectBundle } from "@kdesign/editor-core";

import { createZipArchive } from "./zip.js";

export type PptxMode = "rasterized" | "editableSubset";

type MediaFile = {
  relId: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

type EditableBuild = {
  slideXml: string;
};

type EditablePptxNode = {
  id: string;
  kind: string;
  name: string;
  textPreview?: string;
  tagName?: string;
  assetId?: string;
};

const MAX_EDITABLE_NODES = 18;

export function createPptxBytes(
  bundle: ProjectBundle,
  mode: PptxMode,
  input: {
    previewPng?: Uint8Array;
    renderDiagnostics?: string[];
  } = {}
): Uint8Array {
  const mediaFiles: MediaFile[] = [];
  const slideXml = mode === "rasterized"
    ? rasterSlideXml(bundle.title, input.renderDiagnostics ?? [], Boolean(input.previewPng))
    : buildEditableSlide(bundle, mediaFiles).slideXml;
  if (mode === "rasterized" && input.previewPng) {
    mediaFiles.push({
      relId: "rIdPreview",
      filename: "preview.png",
      contentType: "image/png",
      bytes: input.previewPng
    });
  }

  const files: Record<string, string | Uint8Array> = {
    "[Content_Types].xml": contentTypesXml(mediaFiles),
    "_rels/.rels": packageRelsXml(),
    "ppt/presentation.xml": presentationXml(),
    "ppt/_rels/presentation.xml.rels": presentationRelsXml(),
    "ppt/slides/slide1.xml": slideXml,
    "ppt/slides/_rels/slide1.xml.rels": slideRelsXml(mediaFiles)
  };

  for (const media of mediaFiles) {
    files[`ppt/media/${media.filename}`] = media.bytes;
  }

  return createZipArchive(files);
}

export function createEditableSubsetPptx(
  bundle: ProjectBundle,
  input: { deckId?: string; createdAt?: string } = {}
): { data: Uint8Array; diagnostics: string[] } {
  void input;
  return {
    data: createPptxBytes(bundle, "editableSubset"),
    diagnostics: collectEditableSubsetDiagnostics(bundle)
  };
}

export function createRasterizedPptx(
  bundle: ProjectBundle,
  input: { deckId?: string; pngArtifactPaths?: string[]; renderDiagnostics?: string[]; createdAt?: string } = {}
): Uint8Array {
  void input.deckId;
  void input.createdAt;
  const previewPng = input.pngArtifactPaths?.[0]
    ? readTrustedPngArtifact(input.pngArtifactPaths[0])
    : undefined;
  return createPptxBytes(bundle, "rasterized", {
    ...(previewPng ? { previewPng } : {}),
    renderDiagnostics: input.renderDiagnostics ?? [
      previewPng ? "pptx-rasterized:preview-artifact" : "pptx-rasterized:preview-missing"
    ]
  });
}

export function collectEditableSubsetDiagnostics(bundle: ProjectBundle): string[] {
  const candidates = editableCandidates(bundle);
  const selected = candidates.slice(0, MAX_EDITABLE_NODES);
  return [
    `editable-subset:mapped:${selected.length}`,
    `editable-subset:skipped:${Math.max(candidates.length - selected.length, 0)}`,
    ...unsupportedNodeDiagnostics(bundle)
  ];
}

function contentTypesXml(mediaFiles: MediaFile[]): string {
  const defaults = [...new Set(mediaFiles.map((media) => {
    const extension = media.filename.split(".").at(-1) ?? "";
    return { extension, contentType: media.contentType };
  }).filter((item) => item.extension))];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${defaults.map((item) => `<Default Extension="${escapeXml(item.extension)}" ContentType="${escapeXml(item.contentType)}"/>`).join("\n  ")}
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`;
}

function packageRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
}

function presentationXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="wide"/>
</p:presentation>`;
}

function presentationRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`;
}

function slideRelsXml(mediaFiles: MediaFile[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${mediaFiles.map((media) => `<Relationship Id="${escapeXml(media.relId)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${escapeXml(media.filename)}"/>`).join("\n  ")}
</Relationships>`;
}

function rasterSlideXml(title: string, diagnostics: string[], hasPreview: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${hasPreview ? `<p:pic>
        <p:nvPicPr><p:cNvPr id="2" name="${escapeXml(title)} raster preview"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rIdPreview"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>` : textBoxXml(2, "Raster preview missing", "Raster preview PNG was not provided.", 457200, 274320, 11277600, 914400)}
      ${textBoxXml(3, "Export diagnostics", diagnostics.join(" / "), 457200, 5943600, 11277600, 457200)}
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

function buildEditableSlide(bundle: ProjectBundle, mediaFiles: MediaFile[]): EditableBuild {
  const candidates = editableCandidates(bundle);
  const selected = candidates.slice(0, MAX_EDITABLE_NODES);
  const diagnostics = collectEditableSubsetDiagnostics(bundle);
  const elements = selected
    .map((node, index) => editableNodeXml(bundle, node, index, mediaFiles, diagnostics))
    .join("\n");
  const diagnosticText = diagnostics.join(" / ");

  return {
    slideXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${textBoxXml(2, "Project title", bundle.title, 548640, 274320, 11094720, 457200)}
      ${elements}
      ${textBoxXml(900, "editable-diagnostics", diagnosticText, 548640, 6172200, 11094720, 365760)}
    </p:spTree>
  </p:cSld>
</p:sld>`
  };
}

function editableCandidates(bundle: ProjectBundle): EditablePptxNode[] {
  const editNodes: EditablePptxNode[] = Object.values(bundle.editGraph.nodes)
    .filter((node) => (
      node.kind === "text" ||
      node.kind === "image" ||
      node.kind === "frame" ||
      node.kind === "block" ||
      node.kind === "button"
    ))
    .map(editableFromEditNode);
  const vectorLikeObjects = Object.values(bundle.canvasGraph?.objects ?? {})
    .filter((object) => object.kind === "vectorLike")
    .map(editableFromCanvasObject);
  return [...editNodes, ...vectorLikeObjects];
}

function editableNodeXml(
  bundle: ProjectBundle,
  node: EditablePptxNode,
  index: number,
  mediaFiles: MediaFile[],
  diagnostics: string[]
): string {
  const position = gridPosition(index);
  if (node.kind === "image") {
    const imageMedia = createImageMedia(bundle, node, mediaFiles.length + 1);
    if (imageMedia) {
      mediaFiles.push(imageMedia);
      return pictureXml(index + 3, node, imageMedia.relId, position.x, position.y, position.width, position.height);
    }
    diagnostics.push(`unsupported-image:${node.id}`);
  }

  const text = node.kind === "image"
    ? `Image placeholder: ${node.assetId ?? node.id}`
    : `${node.kind}: ${node.textPreview || node.tagName || node.id}`;
  if (node.kind === "text") {
    return textBoxXml(index + 3, `${node.kind} ${node.id}`, text.slice(0, 180), position.x, position.y, position.width, position.height);
  }
  return rectangleXml(index + 3, `${node.kind} ${node.id}`, text.slice(0, 180), position.x, position.y, position.width, position.height);
}

function createImageMedia(bundle: ProjectBundle, node: EditablePptxNode, index: number): MediaFile | undefined {
  if (!node.assetId) {
    return undefined;
  }
  const asset = bundle.assets.find((item) => item.id === node.assetId);
  if (!asset?.sourceUrl) {
    return undefined;
  }
  const decoded = decodeDataUrl(asset);
  if (!decoded) {
    return undefined;
  }
  return {
    relId: `rIdAsset${index}`,
    filename: `${safeName(node.assetId)}.${decoded.extension}`,
    contentType: decoded.contentType,
    bytes: decoded.bytes
  };
}

function decodeDataUrl(asset: AssetRef): { extension: string; contentType: string; bytes: Uint8Array } | undefined {
  const sourceUrl = asset.sourceUrl ?? "";
  const match = sourceUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!match) {
    return undefined;
  }
  const contentType = match[1] ?? "";
  if (!contentType.startsWith("image/")) {
    return undefined;
  }
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  const bytes = isBase64
    ? new Uint8Array(Buffer.from(payload, "base64"))
    : new TextEncoder().encode(decodeURIComponent(payload));
  return {
    extension: extensionForContentType(contentType),
    contentType,
    bytes
  };
}

function unsupportedNodeDiagnostics(bundle: ProjectBundle): string[] {
  const supported = new Set(["text", "image", "frame", "block", "button", "vectorLike"]);
  const editUnsupported = Object.values(bundle.editGraph.nodes)
    .filter((node) => !supported.has(node.kind))
    .map((node) => node.kind);
  const canvasUnsupported = Object.values(bundle.canvasGraph?.objects ?? {})
    .filter((object) => !supported.has(object.kind) && object.kind !== "page" && object.kind !== "artboard" && object.kind !== "section")
    .map((object) => object.kind);
  return [...new Set([...editUnsupported, ...canvasUnsupported])].map((kind) => `unsupported-pptx-node:${kind}`);
}

function pictureXml(
  id: number,
  node: EditablePptxNode,
  relId: string,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  return `<p:pic>
        <p:nvPicPr><p:cNvPr id="${id}" name="image ${escapeXml(node.id)}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="${escapeXml(relId)}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>`;
}

function textBoxXml(
  id: number,
  name: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  return `<p:sp>
        <p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom></p:spPr>
        <p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(text)}</a:t></a:r></a:p></p:txBody>
      </p:sp>`;
}

function rectangleXml(
  id: number,
  name: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  return `<p:sp>
        <p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
        <p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(text)}</a:t></a:r></a:p></p:txBody>
      </p:sp>`;
}

function editableFromEditNode(node: EditNode): EditablePptxNode {
  return {
    id: node.id,
    kind: node.kind,
    name: node.textPreview || node.tagName || node.id,
    tagName: node.tagName,
    ...(node.textPreview ? { textPreview: node.textPreview } : {}),
    ...(node.assetId ? { assetId: node.assetId } : {})
  };
}

function editableFromCanvasObject(object: CanvasObject): EditablePptxNode {
  return {
    id: object.id,
    kind: object.kind,
    name: object.name,
    textPreview: object.name,
    tagName: object.kind
  };
}

function gridPosition(index: number): { x: number; y: number; width: number; height: number } {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 548640 + col * 3749040,
    y: 914400 + row * 822960,
    width: 3383280,
    height: 594360
  };
}

function extensionForContentType(contentType: string): string {
  if (contentType === "image/svg+xml") {
    return "svg";
  }
  if (contentType === "image/jpeg") {
    return "jpg";
  }
  if (contentType === "image/gif") {
    return "gif";
  }
  return "png";
}

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function readTrustedPngArtifact(inputPath: string): Uint8Array {
  const resolved = path.resolve(inputPath);
  if (path.extname(resolved).toLowerCase() !== ".png") {
    throw new Error(`PPTX raster preview must be a PNG artifact: ${inputPath}`);
  }
  const approvedRoots = [
    path.resolve(".tmp-export-worker"),
    path.resolve(".kdesign/exports"),
    path.resolve("../..", ".tmp-export-worker"),
    path.resolve("../..", ".kdesign/exports")
  ];
  if (!approvedRoots.some((root) => isWithin(root, resolved))) {
    throw new Error(`PPTX raster preview path escapes approved roots: ${inputPath}`);
  }
  return new Uint8Array(readFileSync(resolved));
}

function isWithin(root: string, child: string): boolean {
  const relative = path.relative(root, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
