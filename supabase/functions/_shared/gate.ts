import { chatComplete, type ChatMessage } from "./openrouter.ts";

export type GateResult =
  | { mode: "handbook" }
  | { mode: "chat"; reply: string };

const GATE_PROMPT =
  `You gate the latest user message for "am I fucked", a UWC Costa Rica student handbook bot.

HANDBOOK: school rules, leave/exeat, curfew, discipline, academics, housing, devices, dress, health, staff meetings, consequences, "am I in trouble", or a follow-up to those.
CHAT: greetings, thanks, bye, small talk, who-are-you, or anything unrelated to the handbook.

When unsure, choose HANDBOOK.

If CHAT, reply yourself in 1-2 short blunt sentences. No markdown. No "Bottom line".
- Greeting: casual, then tell them to ask a real handbook question.
- Off-topic: this bot is for rules, issues, and getting out of shit — not that.

JSON only:
{"mode":"handbook"}
{"mode":"chat","reply":"..."}`;

export async function gateMessage(
  question: string,
  history: ChatMessage[],
  options: { apiKey: string; model: string },
): Promise<GateResult> {
  const obvious = obviousChat(question);
  if (obvious) return obvious;

  const messages: ChatMessage[] = [
    { role: "system", content: GATE_PROMPT },
    ...trimHistory(history),
    { role: "user", content: question },
  ];

  const raw = await chatComplete(messages, {
    apiKey: options.apiKey,
    model: options.model,
    maxTokens: 120,
    temperature: 0,
  });

  return parseGate(raw);
}

export function parseGate(raw: string): GateResult {
  const parsed = extractJson(raw);
  if (!parsed || parsed.mode !== "chat") return { mode: "handbook" };

  const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
  if (!reply) return { mode: "handbook" };

  return { mode: "chat", reply };
}

function obviousChat(question: string): GateResult | null {
  const key = question
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!key) return null;
  if (/^(hi+|hey+|hello+|yo|sup|howdy)( there)?$/.test(key)) {
    return {
      mode: "chat",
      reply: "Hey. Ask me a handbook question if you’ve got one.",
    };
  }
  if (/^(thanks|thank you|thx|ty)$/.test(key)) {
    return { mode: "chat", reply: "Anytime." };
  }
  return null;
}

function trimHistory(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-4).map((row) => ({
    role: row.role,
    content: row.content.length > 400
      ? `${row.content.slice(0, 397)}...`
      : row.content,
  }));
}

function extractJson(raw: string): { mode?: unknown; reply?: unknown } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(raw.slice(start, end + 1)) as {
      mode?: unknown;
      reply?: unknown;
    };
  } catch {
    return null;
  }
}
