-- Área de DP: cargos (funções) + dados de RH em cima do usuarios_perfis
-- que já existe (cadastrar uma pessoa no DP já cria a conta de acesso; a
-- gerência liga/desliga o acesso com acesso_sistema, sem apagar o histórico).
create table public.funcoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  created_at timestamptz not null default now()
);

alter table public.funcoes enable row level security;

create policy "staff le funcoes"
  on public.funcoes for select
  using (public.get_my_role() is not null);

create policy "gerencia gerencia funcoes"
  on public.funcoes for all
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');

alter table public.usuarios_perfis
  add column funcao_id uuid references public.funcoes(id) on delete set null,
  add column cpf text,
  add column telefone text,
  add column data_admissao date,
  add column acesso_sistema boolean not null default true;
