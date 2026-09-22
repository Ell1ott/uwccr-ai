import type { PDFDocumentProxy } from "pdfjs-dist";
import { getTextPosition, type Highlight } from "react-pdf-highlighter-plus";

export function excerptQueries(excerpt: string): string[] {
  const compact = excerpt.replace(/\s+/g, " ").trim();
  if (!compact) return [];

  const queries = [compact];
  if (compact.length > 120) queries.push(compact.slice(0, 120).trim());
  if (compact.length > 72) {
    const sentence = compact.split(/(?<=[.?!])\s/)[0]?.trim();
    if (sentence && sentence.length >= 24 && sentence !== compact) {
      queries.push(sentence);
    }
    queries.push(compact.slice(0, 72).trim());
  }
  if (compact.length > 36) queries.push(compact.slice(0, 36).trim());

  return [...new Set(queries.filter(Boolean))];
}

export async function highlightFromExcerpt(
  pdfDocument: PDFDocumentProxy,
  page: number,
  excerpt: string,
): Promise<Highlight | null> {
  for (const query of excerptQueries(excerpt)) {
    const match = await getTextPosition(pdfDocument, query, {
      pages: [page],
      fuzzy: true,
    });
    if (!match) continue;
    return {
      id: `cite-${page}-${query.length}`,
      type: "text",
      position: match.position,
      content: { text: match.matchedText },
    };
  }
  return null;
}
