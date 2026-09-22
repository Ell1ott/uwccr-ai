# am-i-fucked

Ask a question about the UWC Costa Rica handbook. Get a blunt, page-cited answer.

Students sign in with their school Google account (same `uwccr` Supabase project as the schedule app). Threads are saved per student.

- **Site:** Vite + React, Google login, chat
- **Embed:** Supabase Edge `gte-small`
- **Store:** hosted Supabase pgvector + `conversations` / `messages`
- **Generate:** OpenRouter [`qwen/qwen3.8-27b:free`](https://openrouter.ai/qwen/qwen3.8-27b:free)

## Prerequisites

1. Node 22+
2. [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) linked to **uwccr**
3. A free [OpenRouter](https://openrouter.ai) API key
4. The handbook at `data/2026-2027 UWC Costa Rica Handbook.pdf`

## Setup

```bash
npm install
cp .env.example .env
```

Put your OpenRouter key and the uwccr **service role** key in `.env`. For the website, copy the publishable/anon key into `.env.local`:

```bash
cp .env.example .env.local
```

Then fill:

- `VITE_SUPABASE_URL=https://wexytifqxnbjflsnpvlx.supabase.co`
- `VITE_SUPABASE_ANON_KEY=` (anon / publishable key, never the service role)

Ingest secrets (one-time):

```bash
supabase secrets set OPENROUTER_API_KEY=your_key --project-ref wexytifqxnbjflsnpvlx
```

## Website

```bash
npm run dev
```

Opens on `http://localhost:5173` (Vite may pick `5174` if that port is busy). Only roster students (`profiles.role = student`) can chat.

Google login redirects to `/login`. Add these as **additional** redirect URLs on the hosted `uwccr` project — do not change `site_url` (that belongs to the schedule app):

- `http://localhost:5173/login`
- `http://127.0.0.1:5173/login`
- `http://localhost:5174/login`
- `http://127.0.0.1:5174/login`
- `https://<your-vercel-host>/login`

Vercel env for a deploy: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Optional: `VITE_HANDBOOK_PDF_URL` if the handbook is hosted outside `/handbook.pdf`.

## Ingest the PDF

This only needs Node. Embeddings run on the hosted `embed` function.

```bash
npm run ingest
```

Serve the same file to the site so citation chips can open a page:

```bash
cp "data/2026-2027 UWC Costa Rica Handbook.pdf" public/handbook.pdf
```

`public/*.pdf` is gitignored. For a deploy, either copy that file into the build or set `VITE_HANDBOOK_PDF_URL`.

## Ask

`POST /functions/v1/ask` now requires a student JWT.

```bash
curl -s https://wexytifqxnbjflsnpvlx.supabase.co/functions/v1/ask \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $STUDENT_ACCESS_TOKEN" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -d '{"question":"If I miss classes, when am I in trouble?"}'
```

Response shape:

```json
{
  "conversation_id": "…",
  "answer": "... [p. 4] ...",
  "citations": [{ "page": 4, "excerpt": "...", "score": 0.81 }]
}
```

Pass `conversation_id` on follow-ups to keep the thread. Override the model with `CHAT_MODEL` (e.g. `supabase secrets set CHAT_MODEL=…`) if you hit rate limits.

## Layout

- `src/` — Vite app (login + chat)
- `data/2026-2027 UWC Costa Rica Handbook.pdf` — source document
- `scripts/ingest.ts` — parse, chunk, call `embed`, upsert
- `supabase/functions/embed` — gte-small embeddings
- `supabase/functions/ask` — retrieve + generate + persist
