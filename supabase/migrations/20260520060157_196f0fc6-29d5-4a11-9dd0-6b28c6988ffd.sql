
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age int,
  school_grade text,
  country text,
  curriculum_type text,
  onboarded boolean not null default false,
  xp int not null default 0,
  level int not null default 1,
  streak_days int not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Threads
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Новый диалог',
  topic text,
  mode text not null default 'teach', -- hint | teach | exam
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.threads enable row level security;
create index threads_user_idx on public.threads(user_id, updated_at desc);
create policy "threads_select_own" on public.threads for select using (auth.uid() = user_id);
create policy "threads_insert_own" on public.threads for insert with check (auth.uid() = user_id);
create policy "threads_update_own" on public.threads for update using (auth.uid() = user_id);
create policy "threads_delete_own" on public.threads for delete using (auth.uid() = user_id);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null, -- user | assistant | system
  parts jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index messages_thread_idx on public.messages(thread_id, created_at);
create policy "messages_select_own" on public.messages for select using (auth.uid() = user_id);
create policy "messages_insert_own" on public.messages for insert with check (auth.uid() = user_id);
create policy "messages_delete_own" on public.messages for delete using (auth.uid() = user_id);

-- Student memory
create table public.student_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  mastery_level int not null default 0, -- 0..100
  mistake_count int not null default 0,
  last_notes text,
  updated_at timestamptz not null default now(),
  unique(user_id, topic)
);
alter table public.student_memory enable row level security;
create policy "memory_select_own" on public.student_memory for select using (auth.uid() = user_id);
create policy "memory_insert_own" on public.student_memory for insert with check (auth.uid() = user_id);
create policy "memory_update_own" on public.student_memory for update using (auth.uid() = user_id);
