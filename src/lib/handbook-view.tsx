import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type HandbookView = {
  page: number | null;
  excerpt: string | null;
  openPage: (page: number, excerpt?: string) => void;
  close: () => void;
};

const HandbookViewContext = createContext<HandbookView | null>(null);

export function HandbookViewProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<number | null>(null);
  const [excerpt, setExcerpt] = useState<string | null>(null);

  const openPage = useCallback((next: number, nextExcerpt?: string) => {
    setPage(next);
    setExcerpt(nextExcerpt?.replace(/\s+/g, " ").trim() || null);
  }, []);

  const close = useCallback(() => {
    setPage(null);
    setExcerpt(null);
  }, []);

  const value = useMemo(
    () => ({ page, excerpt, openPage, close }),
    [page, excerpt, openPage, close],
  );

  return (
    <HandbookViewContext.Provider value={value}>
      {children}
    </HandbookViewContext.Provider>
  );
}

export function useHandbookView(): HandbookView {
  const context = useContext(HandbookViewContext);
  if (!context) {
    throw new Error("useHandbookView must be used inside HandbookViewProvider");
  }
  return context;
}

export function useOptionalHandbookView(): HandbookView | null {
  return useContext(HandbookViewContext);
}
