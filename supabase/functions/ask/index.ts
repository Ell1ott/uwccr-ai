import { createClient } from "npm:@supabase/supabase-js@2";
import { embedText } from "../_shared/embed.ts";
import { gateMessage } from "../_shared/gate.ts";
import { chatStream, type ChatMessage } from "../_shared/openrouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept",
};

const sseHeaders = {
  ...corsHeaders,
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

type MatchRow = {
  id: number;
  content: string;
  page: number | null;
  section: string | null;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

type Citation = {
  page: number | null;
  excerpt: string;
  score: number;
};

type HistoryRow = {
  role: "user" | "assistant";
  content: string;
};

type StreamEvent =
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

const SYSTEM_PROMPT = `You answer questions about the 2026-2027 UWC Costa Rica Student & Family Handbook.

Voice: blunt and direct. The product is "am I fucked" — tell the user where they stand.

Format:
- Start with one short verdict sentence ("Bottom line: …").
- Then short sections. Open each with a **bold claim**, then the rule in the same paragraph.
- Use a markdown list when there are several conditions or exceptions.
- Cite pages as [p. N] immediately after the claim they support. Multiple pages: [p. 117, p. 118].

Rules:
- Use ONLY the retrieved excerpts. If they are not enough, say so.
- Surface exceptions, thresholds, grace periods, and deadlines that are actually in the text.
- Do not invent loopholes, workarounds, or consequences that are not in the excerpts.
- This is not official advice. One short line at the end is enough.`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const encoder = new TextEncoder();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Use POST { question }" }, 405);
  }

  let question = "";
  let conversationId: string | null = null;
  try {
    const body = await req.json() as {
      question?: unknown;
      conversation_id?: unknown;
    };
    question = typeof body.question === "string" ? body.question.trim() : "";
    conversationId =
      typeof body.conversation_id === "string" && UUID_RE.test(body.conversation_id)
        ? body.conversation_id
        : null;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!question) return json({ error: "question is required" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const chatModel = Deno.env.get("CHAT_MODEL") ??
    "qwen/qwen3.8-27b:free";

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase env is not configured" }, 500);
  }

  const token = bearerToken(req.headers.get("Authorization"));
  if (!token) return json({ error: "Sign in to ask." }, 401);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await runAsk({
          send,
          question,
          conversationId,
          supabaseUrl,
          serviceRoleKey,
          openrouterKey,
          chatModel,
          token,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders });
});

async function runAsk(options: {
  send: (event: StreamEvent) => void;
  question: string;
  conversationId: string | null;
  supabaseUrl: string;
  serviceRoleKey: string;
  openrouterKey: string | undefined;
  chatModel: string;
  token: string;
}): Promise<void> {
  const { send, question } = options;
  const supabase = createClient(options.supabaseUrl, options.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(
    options.token,
  );
  if (userError || !userData.user) {
    throw new Error("Sign in to ask.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile || profile.role !== "student") {
    throw new Error("Students only.");
  }

  let activeConversationId = options.conversationId;
  if (activeConversationId) {
    const { data: existing, error: existingError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", activeConversationId)
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("Thread not found.");
  } else {
    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({
        auth_user_id: userData.user.id,
        title: titleFromQuestion(question),
      })
      .select("id")
      .single();
    if (createError || !created) {
      throw new Error(createError?.message ?? "Could not start a thread.");
    }
    activeConversationId = created.id;
  }

  send({ type: "thread", conversation_id: activeConversationId });

  if (!options.openrouterKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const { data: historyRows, error: historyError } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", activeConversationId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (historyError) throw new Error(historyError.message);

  const history: ChatMessage[] = ((historyRows ?? []) as HistoryRow[]).reverse();

  let chatReply: string | null = null;
  try {
    const gate = await gateMessage(question, history, {
      apiKey: options.openrouterKey,
      model: options.chatModel,
    });
    if (gate.mode === "chat") chatReply = gate.reply;
  } catch {
    chatReply = null;
  }

  if (chatReply) {
    send({ type: "token", text: chatReply });
    await persistTurn(supabase, activeConversationId, question, chatReply, []);
    send({
      type: "done",
      conversation_id: activeConversationId,
      answer: chatReply,
      citations: [],
    });
    return;
  }

  send({ type: "status", label: "Embedding your question" });
  const embedding = await embedText(question);

  send({ type: "search", query: question });
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: 8,
  });

  if (error) throw new Error(error.message);

  const matches = (data ?? []) as MatchRow[];
  const citations: Citation[] = [];

  for (const row of matches) {
    const excerpt = row.content.slice(0, 280);
    citations.push({
      page: row.page,
      excerpt,
      score: row.similarity,
    });
    send({
      type: "match",
      page: row.page,
      section: row.section,
      excerpt,
      score: row.similarity,
    });
  }

  const noMatchAnswer =
    "The document I have does not cover this. I cannot tell you if you are fucked from these pages alone.\n\nNot official advice.";

  const context = matches
    .map((row, index) => {
      const page = row.page ? `p. ${row.page}` : "unknown page";
      return `[${index + 1}] (${page}, similarity ${row.similarity.toFixed(3)})\n${row.content}`;
    })
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((row) => ({
      role: row.role,
      content: row.content,
    })),
    {
      role: "user",
      content: matches.length === 0
        ? `No handbook excerpts matched.\n\nQuestion: ${question}`
        : `Excerpts:\n${context}\n\nQuestion: ${question}`,
    },
  ];

  let answer = "";
  if (matches.length === 0) {
    send({ type: "status", label: "No handbook pages matched" });
    answer = noMatchAnswer;
    send({ type: "token", text: answer });
  } else {
    send({ type: "status", label: "Writing the answer" });
    for await (
      const token of chatStream(messages, {
        apiKey: options.openrouterKey,
        model: options.chatModel,
      })
    ) {
      answer += token;
      send({ type: "token", text: token });
    }
    if (!answer) throw new Error("OpenRouter returned an empty answer");
  }

  await persistTurn(supabase, activeConversationId, question, answer, citations);

  send({
    type: "done",
    conversation_id: activeConversationId,
    answer,
    citations,
  });
}

async function persistTurn(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  question: string,
  answer: string,
  citations: Citation[],
): Promise<void> {
  const { error: userInsertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: question,
    citations: [],
  });
  if (userInsertError) throw new Error(userInsertError.message);

  const { error: assistantInsertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: answer,
    citations,
  });
  if (assistantInsertError) throw new Error(assistantInsertError.message);

  const { error: touchError } = await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (touchError) throw new Error(touchError.message);
}

function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function titleFromQuestion(question: string): string {
  const compact = question.replace(/\s+/g, " ").trim();
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
