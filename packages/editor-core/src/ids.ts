export function stableHash(input: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

export function createStableNodeId(input: {
  domPath: string;
  tagName: string;
  textPreview?: string;
  siblingIndex: number;
}): string {
  return `cdx_${stableHash(
    `${input.domPath}|${input.tagName}|${input.siblingIndex}|${input.textPreview ?? ""}`
  )}`;
}
