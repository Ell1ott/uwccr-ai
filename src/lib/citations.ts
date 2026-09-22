const HANDBOOK_HREF = /^#handbook-(\d+)$/;

export function linkifyCitations(markdown: string): string {
  return markdown.replace(
    /\[((?:p\.\s*\d+)(?:\s*,\s*p\.\s*\d+)*)\]/gi,
    (match) => {
      const pages = [...match.matchAll(/p\.\s*(\d+)/gi)].map((item) => item[1]);
      if (pages.length === 0) return match;
      return pages.map((page) => `[p. ${page}](#handbook-${page})`).join(" ");
    },
  );
}

export function handbookHrefPage(href: string | undefined): number | null {
  if (!href) return null;
  const match = href.match(HANDBOOK_HREF);
  return match ? Number(match[1]) : null;
}
