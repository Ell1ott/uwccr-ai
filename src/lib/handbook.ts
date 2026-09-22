export function handbookPdfUrl(): string {
  const raw = import.meta.env.VITE_HANDBOOK_PDF_URL?.trim();
  return raw || "/handbook.pdf";
}

export function handbookPageUrl(page: number): string {
  return `${handbookPdfUrl()}#page=${page}`;
}
