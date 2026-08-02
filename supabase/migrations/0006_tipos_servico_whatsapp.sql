-- WhatsApp do contato (pode ser diferente do telefone) — usado pra montar
-- o link wa.me direto com o número, em vez de abrir o seletor genérico.
alter table public.agendamentos
  add column whatsapp_contato text;

-- Valor do serviço passa a ser por tipo (hoje só "Opacidade"), em vez de um
-- único valor solto em configuracoes_orcamento — extensível pra novos
-- serviços sem mexer em código, e a seleção no agendamento já preenche o
-- valor correspondente.
create table public.tipos_servico (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tipos_servico enable row level security;

create policy "staff le tipos_servico"
  on public.tipos_servico for select
  using (public.get_my_role() is not null);

create policy "gerencia gerencia tipos_servico"
  on public.tipos_servico for all
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');

insert into public.tipos_servico (nome, valor) values ('Opacidade', 0);

alter table public.configuracoes_orcamento
  drop column valor_servico_padrao;
