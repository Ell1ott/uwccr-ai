export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
};

export async function chatComplete(
  messages: ChatMessage[],
  options: ChatOptions,
): Promise<string> {
  const response = await openRouterChat(messages, options, false);
  const payload = await response.json() as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (payload.error?.message) throw new Error(payload.error.message);
  const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) throw new Error("OpenRouter returned an empty answer");
  return content;
}

export async function* chatStream(
  messages: ChatMessage[],
  options: ChatOptions,
): AsyncGenerator<string> {
  const response = await openRouterChat(messages, options, true);
  if (!response.body) throw new Error("OpenRouter returned an empty stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const lineEnd = buffer.indexOf("\n");
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);
        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data) as {
            error?: { message?: string };
            choices?: Array<{ delta?: { content?: string } }>;
          };
          if (parsed.error?.message) {
            throw new Error(parsed.error.message);
          }
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (error) {
          if (error instanceof SyntaxError) continue;
          throw error;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function openRouterChat(
  messages: ChatMessage[],
  options: ChatOptions,
  stream: boolean,
): Promise<Response> {
  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:54321",
      "X-OpenRouter-Title": "am-i-fucked",
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      stream,
      ...(options.maxTokens != null ? { max_tokens: options.maxTokens } : {}),
      ...(options.temperature != null ? { temperature: options.temperature } : {}),
    }),
  }).then(async (response) => {
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenRouter chat failed (${response.status}): ${detail}`);
    }
    if (stream && !response.body) {
      throw new Error("OpenRouter returned an empty stream");
    }
    return response;
  });
}
