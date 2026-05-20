-- P1: learning engine foundation for AI math tutor.

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  grade_level text,
  curriculum_type text not null default 'general',
  parent_skill_id uuid references public.skills(id) on delete set null,
  prerequisite_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_skill_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  mastery_score numeric not null default 0,
  confidence_score numeric not null default 0,
  attempts_count integer not null default 0,
  correct_attempts integer not null default 0,
  last_practiced_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, skill_id),
  constraint student_skill_mastery_score_range check (mastery_score >= 0 and mastery_score <= 100),
  constraint student_skill_confidence_range check (confidence_score >= 0 and confidence_score <= 1),
  constraint student_skill_attempts_non_negative check (attempts_count >= 0 and correct_attempts >= 0 and correct_attempts <= attempts_count)
);

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'lesson',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_xp integer not null default 0,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint learning_sessions_mode_check check (mode in ('diagnostic', 'lesson', 'review', 'exam', 'chat')),
  constraint learning_sessions_xp_non_negative check (total_xp >= 0)
);

create table if not exists public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete set null,
  session_id uuid references public.learning_sessions(id) on delete set null,
  thread_id uuid references public.threads(id) on delete set null,
  prompt text not null,
  student_answer text,
  expected_answer text,
  is_correct boolean,
  mistake_type text,
  difficulty integer not null default 2,
  ai_feedback text,
  time_spent_sec integer,
  created_at timestamptz not null default now(),
  constraint exercise_attempts_difficulty_range check (difficulty >= 1 and difficulty <= 5),
  constraint exercise_attempts_time_non_negative check (time_spent_sec is null or time_spent_sec >= 0),
  constraint exercise_attempts_mistake_type_check check (
    mistake_type is null or mistake_type in (
      'correct', 'calculation_error', 'concept_gap', 'sign_error', 'fraction_error',
      'equation_balance_error', 'reading_comprehension', 'incomplete_solution', 'unknown'
    )
  )
);

create table if not exists public.diagnostic_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.learning_sessions(id) on delete set null,
  curriculum_type text,
  grade_level text,
  weak_skill_codes text[] not null default '{}',
  strong_skill_codes text[] not null default '{}',
  recommended_path jsonb not null default '[]'::jsonb,
  score numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint diagnostic_results_score_range check (score >= 0 and score <= 100)
);

create index if not exists skills_code_idx on public.skills(code);
create index if not exists student_skill_mastery_user_idx on public.student_skill_mastery(user_id);
create index if not exists student_skill_mastery_next_review_idx on public.student_skill_mastery(user_id, next_review_at);
create index if not exists learning_sessions_user_started_idx on public.learning_sessions(user_id, started_at desc);
create index if not exists exercise_attempts_user_created_idx on public.exercise_attempts(user_id, created_at desc);
create index if not exists diagnostic_results_user_created_idx on public.diagnostic_results(user_id, created_at desc);

alter table public.skills enable row level security;
alter table public.student_skill_mastery enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.exercise_attempts enable row level security;
alter table public.diagnostic_results enable row level security;

drop policy if exists "skills are readable" on public.skills;
create policy "skills are readable" on public.skills for select to authenticated using (true);

drop policy if exists "own mastery select" on public.student_skill_mastery;
create policy "own mastery select" on public.student_skill_mastery for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own mastery insert" on public.student_skill_mastery;
create policy "own mastery insert" on public.student_skill_mastery for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own mastery update" on public.student_skill_mastery;
create policy "own mastery update" on public.student_skill_mastery for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own sessions select" on public.learning_sessions;
create policy "own sessions select" on public.learning_sessions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own sessions insert" on public.learning_sessions;
create policy "own sessions insert" on public.learning_sessions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own sessions update" on public.learning_sessions;
create policy "own sessions update" on public.learning_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own attempts select" on public.exercise_attempts;
create policy "own attempts select" on public.exercise_attempts for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own attempts insert" on public.exercise_attempts;
create policy "own attempts insert" on public.exercise_attempts for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own diagnostic results select" on public.diagnostic_results;
create policy "own diagnostic results select" on public.diagnostic_results for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own diagnostic results insert" on public.diagnostic_results;
create policy "own diagnostic results insert" on public.diagnostic_results for insert to authenticated with check (auth.uid() = user_id);

insert into public.skills (code, title, grade_level, curriculum_type, prerequisite_codes)
values
  ('arithmetic_basic', 'Базовая арифметика', '3-7', 'general', '{}'),
  ('fractions', 'Дроби', '5-8', 'general', '{arithmetic_basic}'),
  ('negative_numbers', 'Отрицательные числа', '6-8', 'general', '{arithmetic_basic}'),
  ('linear_equations', 'Линейные уравнения', '7-10', 'general', '{negative_numbers,fractions}'),
  ('quadratic_equations', 'Квадратные уравнения', '8-11', 'general', '{linear_equations}'),
  ('geometry_basic', 'Базовая геометрия', '6-10', 'general', '{}'),
  ('word_problems', 'Текстовые задачи', '5-10', 'general', '{}'),
  ('functions_graphs', 'Функции и графики', '8-12', 'general', '{linear_equations}')
on conflict (code) do update
set title = excluded.title,
    grade_level = excluded.grade_level,
    curriculum_type = excluded.curriculum_type,
    prerequisite_codes = excluded.prerequisite_codes,
    updated_at = now();
