import type { Citation } from "./database.types";
import { SUPABASE_ANON_KEY, functionsUrl } from "./supabase";

export type AskResponse = {
  conversation_id: string;
  answer: string;
  citations: Citation[];
};

export type StreamEvent =
  | { type: "thread"; conversation_id: string }
  | { type: "status"; label: string }
  | { type: "search"; query: string }
  | {
      type: "match";
      page: number | null;
      section: string | null;
      excerpt: string;
      score: number;
    }
  | { type: "token"; text: string }
  | {
      type: "done";
      conversation_id: string;
      answer: string;
      citations: Citation[];
    }
  | { type: "error"; error: string };

export type ActivityStep = {
  id: string;
  kind: "search" | "page" | "think";
  label: string;
  detail?: string;
};

export type LiveTurn = {
  startedAt: number;
  endedAt?: number;
  steps: ActivityStep[];
  answer: string;
  citations: Citation[];
};

export function stepFromEvent(
  event: StreamEvent,
  id: string,
): ActivityStep | null {
  if (event.type === "status") {
    return { id, kind: "think", label: event.label };
  }
  if (event.type === "search") {
    return {
      id,
      kind: "search",
      label: `Searched the handbook for “${clip(event.query, 72)}”`,
      detail: event.query,
    };
  }
  if (event.type === "match") {
    const page = event.page ? `p. ${event.page}` : "the handbook";
    const rest = event.section?.trim() ||
      event.excerpt.replace(/\s+/g, " ").trim();
    return {
      id,
      kind: "page",
      label: `Opened ${page} — ${clip(rest, 70)}`,
      detail: event.excerpt.replace(/\s+/g, " ").trim(),
    };
  }
  return null;
}

export function stepsFromCitations(citations: Citation[]): ActivityStep[] {
  return citations.map((citation, index) => {
    const page = citation.page ? `p. ${citation.page}` : "the handbook";
    const rest = citation.excerpt.replace(/\s+/g, " ").trim();
    return {
      id: `cite-${index}`,
      kind: "page" as const,
      label: `Opened ${page} — ${clip(rest, 70)}`,
      detail: rest,
    };
  });
}

function clip(value: string, max: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

export async function askHandbookStream(
  question: string,
  accessToken: string,
  conversationId: string | undefined,
  onEvent: (event: StreamEvent) => void,
): Promise<AskResponse> {
  if (!functionsUrl) {
    throw new Error("Ask is not configured yet.");
  }

  const response = await fetch(`${functionsUrl}/ask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      question,
      conversation_id: conversationId,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error || "Could not get an answer.");
  }
  if (!response.body) {
    throw new Error("Ask returned an empty stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AskResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const event = parseSseBlock(part);
        if (!event) continue;
        if (event.type === "error") {
          throw new Error(event.error);
        }
        onEvent(event);
        if (event.type === "done") {
          result = {
            conversation_id: event.conversation_id,
            answer: event.answer,
            citations: event.citations ?? [],
          };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!result) {
    throw new Error("Ask stream ended before a complete answer.");
  }
  return result;
}

function parseSseBlock(block: string): StreamEvent | null {
  for (const line of block.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      return JSON.parse(line.slice(6)) as StreamEvent;
    } catch {
      return null;
    }
  }
  return null;
}
