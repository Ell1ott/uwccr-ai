import type { Conversation } from "../lib/conversations";

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function ThreadList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <p className="px-1 py-4 text-body-md text-on-surface-variant">
        No threads yet. Ask something from the handbook.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {conversations.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              className={`w-full rounded-[18px] px-3 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
                selected
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-surface-container-low text-on-surface"
              }`}
              onClick={() => onSelect(item.id)}
            >
              <span className="block truncate text-body-md font-medium">
                {item.title}
              </span>
              <span
                className={`mt-1 block text-label-sm tracking-wide ${
                  selected
                    ? "text-on-secondary-container/70"
                    : "text-on-surface-variant"
                }`}
              >
                {formatUpdated(item.updated_at)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
