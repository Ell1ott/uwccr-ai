import { X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Drawer } from "vaul";

export function BottomSheet({
  title,
  overlayLabel,
  onClose,
  children,
}: {
  title: string;
  overlayLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <Drawer.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      shouldScaleBackground={false}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-primary/45" />
        <Drawer.Content
          aria-labelledby={titleId}
          aria-describedby={undefined}
          className="fixed right-0 bottom-0 left-0 z-[91] mx-auto flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface-container-lowest shadow-[0_-12px_48px_rgba(4,22,39,0.18)] outline-none"
        >
          <Drawer.Title className="sr-only">{overlayLabel}</Drawer.Title>
          <div className="px-5 pt-2 pb-3">
            <Drawer.Handle className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-on-surface/20" />
            <div className="flex items-center justify-between gap-3">
              <h2 id={titleId} className="text-title-md tracking-tight">
                {title}
              </h2>
              <button
                type="button"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                aria-label="Close"
                onClick={onClose}
              >
                <X size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>
          <div className="sheet-scroll min-h-0 flex-1 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
