import { embedText } from "../_shared/embed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Use POST { texts }" }, 405);
  }

  const provided = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!isServiceRoleJwt(provided)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json() as { text?: unknown; texts?: unknown };
    const text = typeof body.text === "string"
      ? body.text
      : Array.isArray(body.texts) && typeof body.texts[0] === "string"
        ? body.texts[0]
        : "";

    if (!text.trim()) return json({ error: "text is required" }, 400);

    const embedding = await embedText(text);
    return json({ embeddings: [embedding] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

function isServiceRoleJwt(token: string): boolean {
  if (!token) return false;

  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy && token === legacy) return true;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      if (Object.values(parsed).includes(token)) return true;
    } catch {
      // ignore malformed secret map
    }
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
