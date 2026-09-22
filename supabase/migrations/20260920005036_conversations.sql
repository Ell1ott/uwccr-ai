create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = (select auth.uid()) and role = 'student'
  )
$$;

revoke all on function public.is_student() from public, anon;
grant execute on function public.is_student() to authenticated, service_role;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_updated_idx
  on public.conversations (auth_user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy conversations_select
on public.conversations for select to authenticated
using ((select auth.uid()) = auth_user_id and public.is_student());

create policy conversations_insert
on public.conversations for insert to authenticated
with check ((select auth.uid()) = auth_user_id and public.is_student());

create policy conversations_update
on public.conversations for update to authenticated
using ((select auth.uid()) = auth_user_id and public.is_student())
with check ((select auth.uid()) = auth_user_id and public.is_student());

create policy conversations_delete
on public.conversations for delete to authenticated
using ((select auth.uid()) = auth_user_id and public.is_student());

create policy messages_select
on public.messages for select to authenticated
using (
  public.is_student()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.auth_user_id = (select auth.uid())
  )
);

create policy messages_insert
on public.messages for insert to authenticated
with check (
  public.is_student()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.auth_user_id = (select auth.uid())
  )
);

create policy messages_delete
on public.messages for delete to authenticated
using (
  public.is_student()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.auth_user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, delete on public.messages to authenticated;
