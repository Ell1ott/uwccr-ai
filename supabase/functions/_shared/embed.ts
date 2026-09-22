const session = new Supabase.ai.Session("gte-small");

export async function embedText(text: string): Promise<number[]> {
  const embedding = await session.run(text, {
    mean_pool: true,
    normalize: true,
  });

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("gte-small returned an empty embedding");
  }

  return embedding as number[];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await embedText(text));
  }
  return embeddings;
}
