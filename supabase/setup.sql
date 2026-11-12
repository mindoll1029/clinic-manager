-- 보건실 침대 현황 · 시연용 Supabase 설정
-- Supabase 대시보드 → SQL Editor → New query에 이 파일 전체를 붙여 넣고 Run을 누릅니다. 여러 번 실행해도 됩니다.
--
-- 모든 기기(태블릿·PC)가 이 표의 한 줄(id = room 이름)을 함께 읽고 씁니다.
-- 주의: 시연용이라 웹페이지의 공개 키(anon)로 누구나 읽고 쓸 수 있습니다.
--       실제 학생 이름·학번은 넣지 마세요. 실제 운영은 PRD 7장의 표·서버 함수 구조로 바꿉니다.

create table if not exists public.clinic_state (
  id         text primary key,          -- room 이름 (js/config.js의 room)
  data       jsonb not null,            -- 침대·명단·사용 기록·설정 전체
  rev        bigint not null default 0, -- 바뀔 때마다 1씩 오른다 (동시에 바꾼 기기끼리 덮어쓰지 않게)
  updated_at timestamptz not null default now()
);

alter table public.clinic_state enable row level security;

grant select, insert, update on public.clinic_state to anon, authenticated;

drop policy if exists "demo read"   on public.clinic_state;
drop policy if exists "demo insert" on public.clinic_state;
drop policy if exists "demo update" on public.clinic_state;
create policy "demo read"   on public.clinic_state for select to anon, authenticated using (true);
create policy "demo insert" on public.clinic_state for insert to anon, authenticated with check (true);
create policy "demo update" on public.clinic_state for update to anon, authenticated using (true) with check (true);

-- 실시간 알림: 이 표가 바뀌면 열려 있는 모든 화면에 알린다
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clinic_state'
  ) then
    alter publication supabase_realtime add table public.clinic_state;
  end if;
end $$;
