import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";
import {
  PdfHighlighter,
  PdfLoader,
  TextHighlight,
  useHighlightContainerContext,
  type Highlight,
  type PdfHighlighterUtils,
} from "react-pdf-highlighter-plus";
import "pdfjs-dist/web/pdf_viewer.css";
import "react-pdf-highlighter-plus/style/style.css";
import { handbookPdfUrl } from "../lib/handbook";
import { highlightFromExcerpt } from "../lib/handbook-cite";

const CITE_COLOR = "rgba(255, 214, 102, 0.55)";

export function HandbookPdf({
  page,
  excerpt,
}: {
  page: number;
  excerpt: string | null;
}) {
  return (
    <div className="handbook-pdf">
      <PdfLoader
        document={handbookPdfUrl()}
        workerSrc={pdfWorker}
        beforeLoad={() => (
          <p className="px-4 py-6 text-body-md text-on-surface-variant">
            Opening the handbook…
          </p>
        )}
        errorMessage={(error) => (
          <p className="px-4 py-6 text-body-md text-on-surface-variant">
            Couldn’t load the handbook. {error.message}
          </p>
        )}
      >
        {(pdfDocument) => (
          <CitedViewer
            key={`${page}:${excerpt ?? ""}`}
            pdfDocument={pdfDocument}
            page={page}
            excerpt={excerpt}
          />
        )}
      </PdfLoader>
    </div>
  );
}

function CitedViewer({
  pdfDocument,
  page,
  excerpt,
}: {
  pdfDocument: PDFDocumentProxy;
  page: number;
  excerpt: string | null;
}) {
  const utilsRef = useRef<PdfHighlighterUtils | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function locate() {
      if (!excerpt) {
        if (!cancelled) {
          setHighlights([]);
          utilsRef.current?.goToPage(page);
        }
        return;
      }

      const highlight = await highlightFromExcerpt(pdfDocument, page, excerpt);
      if (cancelled) return;
      setHighlights(highlight ? [highlight] : []);
    }

    void locate();
    return () => {
      cancelled = true;
    };
  }, [pdfDocument, page, excerpt]);

  return (
    <PdfHighlighter
      pdfDocument={pdfDocument}
      highlights={highlights}
      initialPage={page}
      pdfScaleValue="page-width"
      enableAreaSelection={() => false}
      theme={{
        mode: "light",
        containerBackgroundColor: "#f5f3f4",
      }}
      style={{ width: "100%", height: "100%" }}
      utilsRef={(utils) => {
        utilsRef.current = utils;
      }}
    >
      <CiteHighlight />
    </PdfHighlighter>
  );
}

function CiteHighlight() {
  const { highlight, isScrolledTo } = useHighlightContainerContext();
  if (highlight.type && highlight.type !== "text") return null;
  return (
    <TextHighlight
      highlight={highlight}
      isScrolledTo={isScrolledTo}
      highlightColor={CITE_COLOR}
    />
  );
}
