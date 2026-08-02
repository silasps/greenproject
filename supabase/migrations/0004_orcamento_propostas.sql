-- Cliente "pendente": criado já no primeiro atendimento (só nome+telefone),
-- completado depois com CNPJ/CPF quando o cadastro é finalizado.
alter table public.clientes
  alter column cnpj_cpf drop not null,
  alter column tipo drop not null,
  add column status text not null default 'completo' check (status in ('pendente', 'completo'));

-- Liga a proposta ao agendamento que a originou e guarda o PDF emitido
-- depois que o cadastro do cliente/veículo é completado.
alter table public.propostas
  add column agendamento_id uuid references public.agendamentos(id) on delete set null,
  add column pdf_path text;

-- Valores padrão da fórmula de orçamento (R$/km, valor do serviço, fator
-- de correção da distância em linha reta) — só gerência edita.
create table public.configuracoes_orcamento (
  id boolean primary key default true check (id),
  valor_km numeric not null default 0,
  valor_servico_padrao numeric not null default 0,
  fator_correcao_distancia numeric not null default 1.4,
  updated_at timestamptz not null default now()
);

insert into public.configuracoes_orcamento (id) values (true);

alter table public.configuracoes_orcamento enable row level security;

create policy "staff le configuracoes_orcamento"
  on public.configuracoes_orcamento for select
  using (public.get_my_role() is not null);

create policy "gerencia edita configuracoes_orcamento"
  on public.configuracoes_orcamento for update
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');
