import { ArrowUp } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

export function Composer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (question: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const question = value.trim();
    if (!question || disabled) return;
    onSend(question);
    setValue("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-[28px] bg-surface-container-lowest p-2 shadow-[0_8px_32px_rgba(4,22,39,0.06)]"
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor="question">
        Ask the handbook
      </label>
      <textarea
        id="question"
        rows={1}
        value={value}
        disabled={disabled}
        placeholder="What happened?"
        className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant disabled:opacity-50"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp size={18} strokeWidth={1.75} aria-hidden />
      </button>
    </form>
  );
}
