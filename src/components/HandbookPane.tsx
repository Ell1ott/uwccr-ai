import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { useHandbookView } from "../lib/handbook-view";
import { HandbookPdf } from "./HandbookPdf";

export function HandbookPane() {
  const { page, excerpt, close } = useHandbookView();
  const desktop = useIsDesktop();

  useEffect(() => {
    if (page == null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, close]);

  return (
    <AnimatePresence>
      {page != null ? (
        desktop ? (
          <DesktopPane
            key="desktop"
            page={page}
            excerpt={excerpt}
            onClose={close}
          />
        ) : (
          <MobilePane
            key="mobile"
            page={page}
            excerpt={excerpt}
            onClose={close}
          />
        )
      ) : null}
    </AnimatePresence>
  );
}

function DesktopPane({
  page,
  excerpt,
  onClose,
}: {
  page: number;
  excerpt: string | null;
  onClose: () => void;
}) {
  return (
    <motion.aside
      initial={{ x: 24 }}
      animate={{ x: 0 }}
      exit={{ x: 24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex h-full min-w-0 w-[min(48vw,560px)] shrink-0 flex-col border-l border-outline-variant/50 bg-surface"
    >
      <PaneHeader page={page} excerpt={excerpt} onClose={onClose} />
      <HandbookPdf page={page} excerpt={excerpt} />
    </motion.aside>
  );
}

function MobilePane({
  page,
  excerpt,
  onClose,
}: {
  page: number;
  excerpt: string | null;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ y: 16 }}
      animate={{ y: 0 }}
      exit={{ y: 16 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-[85] flex flex-col bg-surface"
    >
      <PaneHeader page={page} excerpt={excerpt} onClose={onClose} />
      <HandbookPdf page={page} excerpt={excerpt} />
    </motion.div>
  );
}

function PaneHeader({
  page,
  excerpt,
  onClose,
}: {
  page: number;
  excerpt: string | null;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3">
      <div className="min-w-0 flex-1">
        <p className="text-label-sm tracking-[0.14em] text-on-surface-variant uppercase">
          Handbook
        </p>
        <p className="text-title-md tracking-tight">Page {page}</p>
      </div>
      <button
        type="button"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        aria-label="Close handbook"
        onClick={onClose}
      >
        <X size={18} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
