-- Track prompt-cache token usage so we can measure savings and bill correctly.
alter table public.ai_coach_logs
  add column if not exists cache_read_input_tokens integer not null default 0,
  add column if not exists cache_creation_input_tokens integer not null default 0;
