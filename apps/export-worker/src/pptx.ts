import type { ProjectBundle } from "@kdesign/editor-core";

import { createZipArchive } from "./zip.js";

export type PptxMode = "rasterized" | "editableSubset";

export function createPptxBytes(
  bundle: ProjectBundle,
  mode: PptxMode,
  input: {
    previewPng?: Uint8Array;
    renderDiagnostics?: string[];
  } = {}
): Uint8Array {
  const includePreview = mode === "rasterized" && Boolean(input.previewPng);
  const files: Record<string, string | Uint8Array> = {
    "[Content_Types].xml": contentTypesXml(includePreview),
    "_rels/.rels": packageRelsXml(),
    "ppt/presentation.xml": presentationXml(),
    "ppt/_rels/presentation.xml.rels": presentationRelsXml(),
    "ppt/slides/slide1.xml": includePreview
      ? rasterSlideXml(bundle.title, input.renderDiagnostics ?? [])
      : editableSlideXml(bundle),
    "ppt/slides/_rels/slide1.xml.rels": slideRelsXml(includePreview)
  };

  if (includePreview && input.previewPng) {
    files["ppt/media/preview.png"] = input.previewPng;
  }

  return createZipArchive(files);
}

function contentTypesXml(includePng: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${includePng ? "<Default Extension=\"png\" ContentType=\"image/png\"/>" : ""}
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

function slideRelsXml(includePreview: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${includePreview ? "<Relationship Id=\"rIdPreview\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"../media/preview.png\"/>" : ""}
</Relationships>`;
}

function rasterSlideXml(title: string, diagnostics: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="2" name="${escapeXml(title)} raster preview"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rIdPreview"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Export diagnostics"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="5943600"/><a:ext cx="11277600" cy="457200"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(diagnostics.join(" / "))}</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

function editableSlideXml(bundle: ProjectBundle): string {
  const shapes = Object.values(bundle.editGraph.nodes)
    .filter((node) => node.kind === "text" || node.kind === "image" || node.kind === "frame" || node.kind === "block")
    .slice(0, 12)
    .map((node, index) => editableShapeXml(node, index + 2))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Project title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(bundle.title)}</a:t></a:r></a:p></p:txBody>
      </p:sp>
      ${shapes}
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

function editableShapeXml(
  node: ProjectBundle["editGraph"]["nodes"][string],
  index: number
): string {
  const col = (index - 2) % 3;
  const row = Math.floor((index - 2) / 3);
  const x = 548640 + col * 3749040;
  const y = 914400 + row * 1325880;
  const width = 3383280;
  const height = 1005840;
  const text = node.kind === "image"
    ? `Image: ${node.textPreview || node.id}`
    : `${node.kind}: ${node.textPreview || node.tagName || node.id}`;
  return `<p:sp>
        <p:nvSpPr><p:cNvPr id="${index + 1}" name="${escapeXml(node.kind)} ${escapeXml(node.id)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom></p:spPr>
        <p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(text.slice(0, 160))}</a:t></a:r></a:p></p:txBody>
      </p:sp>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
