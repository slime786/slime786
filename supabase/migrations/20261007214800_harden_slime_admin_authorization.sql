create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  note text null
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select, insert, update, delete on table public.admin_users to service_role;

alter table public.slime_admin_audit_log
  add column if not exists actor_id uuid null references auth.users(id) on delete set null;

create index if not exists slime_admin_audit_log_actor_created_idx
  on public.slime_admin_audit_log(actor_id, created_at desc);

revoke all on table public.slime_admin_audit_log from anon, authenticated;
grant select, insert, update on table public.slime_admin_audit_log to service_role;

comment on table public.admin_users is
  'Backend-only allow-list for privileged SLIME786 administration. No anon/authenticated grants.';
comment on column public.slime_admin_audit_log.actor_id is
  'Authenticated administrator who initiated the audited action.';
