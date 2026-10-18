create table public.fusion_track_links (
 id uuid primary key default gen_random_uuid(),
 label text not null default 'החבר שלי',
 participant_hash text not null unique check (length(participant_hash)=64),
 admin_hash text not null unique check (length(admin_hash)=64),
 revoked boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.fusion_track_events (
 seq bigint generated always as identity primary key,
 event_id uuid not null unique,
 link_id uuid not null references public.fusion_track_links(id),
 session_id uuid not null,
 kind text not null check(kind in ('visit','project_start','project_resume','step_complete','step_skip','step_back','hint','project_complete','home')),
 lesson_id text,
 step integer check(step between 1 and 2000),
 client_at timestamptz not null,
 received_at timestamptz not null default now()
);
create index fusion_track_events_link_seq on public.fusion_track_events(link_id,seq desc);
create index fusion_track_events_link_received on public.fusion_track_events(link_id,received_at desc);
alter table public.fusion_track_links enable row level security;
alter table public.fusion_track_events enable row level security;
revoke all on public.fusion_track_links,public.fusion_track_events from anon,authenticated;
revoke all on sequence public.fusion_track_events_seq_seq from anon,authenticated;
grant all on public.fusion_track_links,public.fusion_track_events to service_role;
grant usage,select on sequence public.fusion_track_events_seq_seq to service_role;
create function public.fusion_track_summary(target uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
  'events',count(*),'visits',count(*) filter(where kind='visit'),
  'steps',count(*) filter(where kind='step_complete'),
  'skips',count(*) filter(where kind='step_skip'),
  'last_seen',max(received_at),
  'completed',count(*) filter(where kind='project_complete'))
 from public.fusion_track_events where link_id=target;
$$;
revoke all on function public.fusion_track_summary(uuid) from public,anon,authenticated;
grant execute on function public.fusion_track_summary(uuid) to service_role;
