import { BookOpen } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { handbookPageUrl } from "../lib/handbook";
import { useOptionalHandbookView } from "../lib/handbook-view";

export function CitationChip({
  page,
  excerpt,
}: {
  page: number;
  excerpt?: string;
}) {
  const handbook = useOptionalHandbookView();
  const tooltipId = useId();
  const chipRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, place: "above" as "above" | "below" });
  const active = handbook?.page === page;

  function placeTooltip() {
    const rect = chipRef.current?.getBoundingClientRect();
    if (!rect) return;
    const place = rect.top > 168 ? "above" : "below";
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2),
      window.innerWidth - 16,
    );
    setPos({
      top: place === "above" ? rect.top - 8 : rect.bottom + 8,
      left,
      place,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    placeTooltip();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const hide = () => setOpen(false);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!handbook) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    handbook.openPage(page, excerpt);
    setOpen(false);
  }

  const quote = excerpt?.replace(/\s+/g, " ").trim();

  return (
    <>
      <a
        ref={chipRef}
        href={handbookPageUrl(page)}
        target="_blank"
        rel="noopener noreferrer"
        className={active ? "cite-chip cite-chip-active" : "cite-chip"}
        aria-label={`Open handbook page ${page}`}
        aria-current={active ? "page" : undefined}
        aria-describedby={open ? tooltipId : undefined}
        onClick={onClick}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <BookOpen size={11} strokeWidth={1.9} aria-hidden />
        p. {page}
      </a>
      {open
        ? createPortal(
            <span
              id={tooltipId}
              role="tooltip"
              className={`cite-tooltip cite-tooltip-${pos.place}`}
              style={{ top: pos.top, left: pos.left }}
            >
              {quote ? <span className="cite-tooltip-quote">“{quote}”</span> : null}
              <span className="cite-tooltip-meta">Handbook · p. {page}</span>
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
