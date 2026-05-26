-- Normalized persistence for the project timeline app.
--
-- The old app shape stored the whole Project object in projects.data. These
-- columns/tables let the app update project settings, milestones, and reports
-- independently so small edits no longer rewrite the entire project history.

alter table public.projects
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists goal text,
  add column if not exists client_name text,
  add column if not exists client_logo text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists sprint_length integer not null default 1,
  add column if not exists current_milestone_progress jsonb not null default '{}'::jsonb,
  add column if not exists timeline_window_start integer not null default 1,
  add column if not exists float_project_id integer,
  add column if not exists updated_at timestamptz not null default now();

alter table public.projects
  alter column data drop not null;

update public.projects
set
  name = coalesce(name, data->>'name'),
  description = coalesce(description, data->>'description'),
  goal = coalesce(goal, data->>'goal'),
  client_name = coalesce(client_name, data->>'clientName'),
  client_logo = coalesce(client_logo, data->>'clientLogo'),
  start_date = coalesce(start_date, nullif(data->>'startDate', '')::date),
  end_date = coalesce(end_date, nullif(data->>'endDate', '')::date),
  sprint_length = coalesce((data->>'sprintLength')::integer, sprint_length),
  current_milestone_progress = coalesce(data->'currentMilestoneProgress', current_milestone_progress),
  timeline_window_start = coalesce((data->>'timelineWindowStart')::integer, timeline_window_start),
  float_project_id = coalesce((data->>'floatProjectId')::integer, float_project_id),
  updated_at = coalesce(updated_at, now())
where data is not null;

create table if not exists public.project_milestones (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  name text not null default '',
  start_week integer,
  end_week integer,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists project_milestones_project_id_sort_idx
  on public.project_milestones(project_id, sort_order);

insert into public.project_milestones (id, project_id, name, start_week, end_week, sort_order)
select
  milestone->>'id',
  p.id,
  coalesce(milestone->>'name', ''),
  nullif(milestone->>'startWeek', '')::integer,
  nullif(milestone->>'endWeek', '')::integer,
  ordinality::integer - 1
from public.projects p
cross join lateral jsonb_array_elements(coalesce(p.data->'milestones', '[]'::jsonb)) with ordinality as items(milestone, ordinality)
where p.data is not null
on conflict (id) do nothing;

create table if not exists public.weekly_reports (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  week_number integer not null,
  report_date date not null,
  is_draft boolean not null default false,
  status text not null default 'on-track',
  confidence_level integer,
  milestone_progress jsonb not null default '{}'::jsonb,
  shown_milestone_ids text[] not null default '{}'::text[],
  insights jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists weekly_reports_project_id_week_idx
  on public.weekly_reports(project_id, week_number);

insert into public.weekly_reports (
  id,
  project_id,
  week_number,
  report_date,
  is_draft,
  status,
  confidence_level,
  milestone_progress,
  shown_milestone_ids,
  insights,
  achievements,
  risks,
  action_items
)
select
  report->>'id',
  p.id,
  coalesce((report->>'weekNumber')::integer, 0),
  coalesce(nullif(report->>'reportDate', '')::date, current_date),
  coalesce((report->>'isDraft')::boolean, false),
  coalesce(report->>'status', 'on-track'),
  nullif(report->>'confidenceLevel', '')::integer,
  coalesce(report->'milestoneProgress', '{}'::jsonb),
  coalesce(ARRAY(select jsonb_array_elements_text(report->'shownMilestoneIds')), '{}'::text[]),
  coalesce(report->'insights', '[]'::jsonb),
  coalesce(report->'achievements', '[]'::jsonb),
  coalesce(report->'risks', '[]'::jsonb),
  coalesce(report->'actionItems', '[]'::jsonb)
from public.projects p
cross join lateral jsonb_array_elements(coalesce(p.data->'reports', '[]'::jsonb)) as items(report)
where p.data is not null
on conflict (id) do nothing;

alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.weekly_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Authenticated users can manage projects'
  ) then
    create policy "Authenticated users can manage projects"
      on public.projects
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_milestones'
      and policyname = 'Authenticated users can manage project milestones'
  ) then
    create policy "Authenticated users can manage project milestones"
      on public.project_milestones
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'weekly_reports'
      and policyname = 'Authenticated users can manage weekly reports'
  ) then
    create policy "Authenticated users can manage weekly reports"
      on public.weekly_reports
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
