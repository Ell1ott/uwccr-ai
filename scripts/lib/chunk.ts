const TARGET_CHARS = 1600;
const OVERLAP_CHARS = 320;

export type TextChunk = {
  content: string;
  page: number;
  section: string | null;
};

export function chunkPages(pages: string[]): TextChunk[] {
  const chunks: TextChunk[] = [];

  for (let i = 0; i < pages.length; i += 1) {
    const page = i + 1;
    const pageText = pages[i]?.replace(/\s+/g, " ").trim();
    if (!pageText) continue;

    const pieces = splitToSize(pageText, TARGET_CHARS, OVERLAP_CHARS);
    for (const content of pieces) {
      chunks.push({
        content,
        page,
        section: headingFrom(content),
      });
    }
  }

  return chunks;
}

function headingFrom(content: string): string | null {
  const first = content.split(/[.!?]/)[0]?.trim();
  if (!first || first.length > 80) return null;
  return first;
}

function splitToSize(text: string, target: number, overlap: number): string[] {
  if (text.length <= target) return [text];

  const parts: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + target, text.length);
    if (end < text.length) {
      const breakAt = text.lastIndexOf(" ", end);
      if (breakAt > start + target * 0.6) end = breakAt;
    }

    parts.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return parts.filter(Boolean);
}
