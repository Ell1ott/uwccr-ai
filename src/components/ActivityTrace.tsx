import { BookOpen, ChevronDown, Lightbulb, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { ActivityStep } from "../lib/ask";

const ICONS = {
  search: Search,
  page: BookOpen,
  think: Lightbulb,
} as const;

export function ActivityTrace({
  steps,
  live = false,
  startedAt,
  endedAt,
  defaultOpen = true,
}: {
  steps: ActivityStep[];
  live?: boolean;
  startedAt?: number;
  endedAt?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!live || !startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [live, startedAt]);

  if (steps.length === 0 && !live) return null;

  const elapsedMs = startedAt
    ? (endedAt ?? (live ? now : startedAt)) - startedAt
    : 0;
  const seconds = Math.max(0, Math.round(elapsedMs / 1000));
  const header = live
    ? seconds < 1
      ? "Working"
      : `Working for ${seconds}s`
    : startedAt && endedAt
      ? `Worked for ${Math.max(1, Math.round((endedAt - startedAt) / 1000))}s`
      : steps.length === 1
        ? "Looked at 1 page"
        : `Looked at ${steps.length} pages`;

  return (
    <div className="select-none">
      <button
        type="button"
        className="flex items-center gap-1 text-[14px] leading-5 text-on-surface-variant/75 transition-colors hover:text-on-surface"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{header}</span>
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex"
        >
          <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="steps"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <ol className="relative mt-2 flex flex-col">
              {steps.length > 1 ? (
                <span
                  aria-hidden
                  className="absolute top-2.5 bottom-2.5 left-[7px] w-px bg-outline-variant/70"
                />
              ) : null}
              {steps.map((step, index) => {
                const Icon = ICONS[step.kind];
                const current = live && index === steps.length - 1;
                return (
                  <motion.li
                    key={step.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="relative flex items-start gap-2.5 py-[5px]"
                  >
                    <span className="relative z-10 mt-px flex size-[15px] shrink-0 items-center justify-center bg-surface-dim text-on-surface-variant/70">
                      <Icon size={14} strokeWidth={1.6} aria-hidden />
                    </span>
                    <p
                      title={step.detail ?? step.label}
                      className={`min-w-0 truncate text-[14px] leading-5 ${
                        current
                          ? "text-on-surface"
                          : "text-on-surface-variant/70"
                      }`}
                    >
                      {step.label}
                    </p>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
