import { motion } from "motion/react";
import type { LiveTurn } from "../lib/ask";
import { stepsFromCitations } from "../lib/ask";
import type { ChatMessage } from "../lib/conversations";
import type { Citation } from "../lib/database.types";
import { ActivityTrace } from "./ActivityTrace";
import { MarkdownAnswer } from "./MarkdownAnswer";

const SUGGESTIONS = [
  "If I miss classes, when am I in trouble?",
  "What happens if I break curfew?",
  "Can I leave campus on a weekend?",
];

export function MessageList({
  messages,
  live,
  onSuggest,
}: {
  messages: ChatMessage[];
  live: LiveTurn | null;
  onSuggest: (question: string) => void;
}) {
  if (messages.length === 0 && !live) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-1 py-8">
        <p className="text-label-sm tracking-[0.14em] text-on-surface-variant uppercase">
          Handbook
        </p>
        <h2 className="mt-1 text-headline-lg-mobile tracking-tight md:text-headline-lg">
          Am I fucked?
        </h2>
        <p className="mt-3 text-body-md text-on-surface-variant">
          Ask a situation. I’ll tell you where you stand from the pages I have.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {SUGGESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              className="rounded-[18px] bg-surface-container-lowest px-4 py-3 text-left text-body-md text-on-surface shadow-[0_8px_32px_rgba(4,22,39,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={() => onSuggest(question)}
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-4">
      {messages.map((message) =>
        message.role === "user" ? (
          <UserBubble key={message.id} content={message.content} />
        ) : (
          <AssistantTurn
            key={message.id}
            content={message.content}
            citations={message.citations}
            steps={stepsFromCitations(message.citations)}
          />
        ),
      )}
      {live ? (
        <AssistantTurn
          content={live.answer}
          citations={live.citations}
          steps={live.steps}
          live
          startedAt={live.startedAt}
          endedAt={live.endedAt}
        />
      ) : null}
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="ml-8 rounded-[22px] bg-primary px-4 py-3 text-body-md text-on-primary"
    >
      {content}
    </motion.div>
  );
}

function AssistantTurn({
  content,
  citations,
  steps,
  live = false,
  startedAt,
  endedAt,
}: {
  content: string;
  citations: Citation[];
  steps: LiveTurn["steps"];
  live?: boolean;
  startedAt?: number;
  endedAt?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mr-4 flex flex-col gap-3"
    >
      <ActivityTrace
        steps={steps}
        live={live}
        startedAt={startedAt}
        endedAt={endedAt}
        defaultOpen={live}
      />
      {content ? (
        <MarkdownAnswer
          content={content}
          citations={citations}
          streaming={live && !endedAt}
        />
      ) : live ? (
        <p className="text-body-md text-on-surface-variant/60">
          <span
            aria-hidden
            className="caret-blink inline-block h-[1.05em] w-[1.5px] translate-y-[2px] bg-on-surface-variant/70 align-middle"
          />
        </p>
      ) : null}
    </motion.div>
  );
}
