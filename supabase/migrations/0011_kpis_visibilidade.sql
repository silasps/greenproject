-- Visibilidade das seções de KPI do dashboard (/painel), configurável pela
-- gerência: por cargo (funcoes_kpis) e, como exceção, por pessoa
-- (usuarios_kpis, que tem prioridade sobre o cargo). Ausência de linha =
-- "seguir o padrão" — o catálogo de seções (chave/nível padrão) vive em
-- código (src/lib/kpis/catalogo.ts), só a visibilidade concedida fica aqui.

create table public.funcoes_kpis (
  id uuid primary key default gen_random_uuid(),
  funcao_id uuid not null references public.funcoes(id) on delete cascade,
  kpi_secao text not null,
  visivel boolean not null,
  created_at timestamptz not null default now(),
  unique (funcao_id, kpi_secao)
);

alter table public.funcoes_kpis enable row level security;

create policy "staff le funcoes_kpis"
  on public.funcoes_kpis for select
  using (public.get_my_role() is not null);

create policy "gerencia gerencia funcoes_kpis"
  on public.funcoes_kpis for all
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');

create table public.usuarios_kpis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios_perfis(id) on delete cascade,
  kpi_secao text not null,
  visivel boolean not null,
  created_at timestamptz not null default now(),
  unique (usuario_id, kpi_secao)
);

alter table public.usuarios_kpis enable row level security;

create policy "staff le proprio usuarios_kpis"
  on public.usuarios_kpis for select
  using (usuario_id = auth.uid() or public.get_my_role() = 'gerencia');

create policy "gerencia gerencia usuarios_kpis"
  on public.usuarios_kpis for all
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');
