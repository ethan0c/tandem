create table if not exists public.library_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  media_key text not null check (media_key ~ '^(anime|manga):[0-9]{1,10}$'),
  entry jsonb not null check (jsonb_typeof(entry) = 'object'),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, media_key)
);
alter table public.library_entries enable row level security;
revoke all on public.library_entries from anon;
grant select, insert, update, delete on public.library_entries to authenticated;
create policy "Read own library" on public.library_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own library" on public.library_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own library" on public.library_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own library" on public.library_entries for delete to authenticated using ((select auth.uid()) = user_id);

-- Prevent a delayed offline write from replacing a newer cloud revision.
create or replace function public.keep_latest_library_entry() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.updated_at < old.updated_at then return old; end if;
  return new;
end;
$$;
create trigger keep_latest_library_entry before update on public.library_entries for each row execute function public.keep_latest_library_entry();
