drop index if exists public.chunks_embedding_hnsw;

drop function if exists public.match_chunks(extensions.vector, float, int);

alter table public.chunks
  alter column embedding type extensions.vector(384);

create index chunks_embedding_hnsw
  on public.chunks
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_chunks (
  query_embedding extensions.vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  page int,
  section text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    chunks.id,
    chunks.content,
    chunks.page,
    chunks.section,
    chunks.metadata,
    (1 - (chunks.embedding <=> query_embedding))::float as similarity
  from public.chunks
  where 1 - (chunks.embedding <=> query_embedding) > match_threshold
  order by chunks.embedding <=> query_embedding
  limit least(match_count, 200);
$$;

revoke all on function public.match_chunks(extensions.vector, float, int) from public, anon, authenticated;
grant execute on function public.match_chunks(extensions.vector, float, int) to service_role;
