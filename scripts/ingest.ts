import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";
import { chunkPages } from "./lib/chunk.ts";

const BATCH_SIZE = 1;
const MAX_RETRIES = 5;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env`);
  return value;
}

async function loadEnv() {
  const path = resolve(process.cwd(), ".env");
  try {
    const raw = await readFile(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      process.env[key] = value;
    }
  } catch {
    // rely on already-exported env
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedOne(
  text: string,
  options: { url: string; serviceRoleKey: string },
): Promise<number[]> {
  let lastError = "embed function failed";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(`${options.url.replace(/\/$/, "")}/functions/v1/embed`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.serviceRoleKey}`,
        apikey: options.serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = (await response.json()) as { embeddings?: number[][] };
      const embedding = data.embeddings?.[0];
      if (!embedding) throw new Error("embed function returned an unexpected payload");
      return embedding;
    }

    const detail = await response.text();
    lastError = `embed function failed (${response.status}): ${detail}`;
    if (response.status !== 546 && response.status !== 429 && response.status !== 504) {
      throw new Error(lastError);
    }

    await sleep(500 * attempt);
  }

  throw new Error(lastError);
}

async function main() {
  await loadEnv();

  const pdfPath = resolve(
    process.cwd(),
    process.env.PDF_PATH ?? "data/2026-2027 UWC Costa Rica Handbook.pdf",
  );
  const supabaseUrl = required("SUPABASE_URL");
  const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");

  const bytes = new Uint8Array(await readFile(pdfPath));
  const pdf = await getDocumentProxy(bytes);
  const extracted = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
  const chunks = chunkPages(pages);

  if (chunks.length === 0) {
    throw new Error(`No text extracted from ${pdfPath}`);
  }

  console.log(`Extracted ${chunks.length} chunks from ${pdfPath}`);
  console.log(`Upserting into ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: wipeError } = await supabase.from("chunks").delete().gt("id", 0);
  if (wipeError) throw new Error(`Failed to clear chunks: ${wipeError.message}`);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = [
      await embedOne(batch[0]!.content, { url: supabaseUrl, serviceRoleKey }),
    ];

    const rows = batch.map((chunk, index) => ({
      content: chunk.content,
      page: chunk.page,
      section: chunk.section,
      embedding: embeddings[index],
      metadata: { source: "2026-2027 UWC Costa Rica Handbook.pdf" },
    }));

    const { error } = await supabase.from("chunks").insert(rows);
    if (error) throw new Error(`Failed to insert chunks: ${error.message}`);

    console.log(`Indexed ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}`);
  }

  console.log("Ingest complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
