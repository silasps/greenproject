-- Evento livre (tipo Google Agenda) como um novo "tipo" de agendamento,
-- com participantes internos em vez do tecnico_id único. O teste de
-- opacidade (tipo padrão) continua funcionando exatamente como antes.
alter table public.agendamentos
  add column tipo text not null default 'teste_opacidade' check (tipo in ('teste_opacidade', 'evento')),
  add column titulo text,
  add column descricao text,
  add column criado_por uuid references public.usuarios_perfis(id) on delete set null,
  -- Primeiro atendimento: nome/telefone de contato bastam pra agendar o
  -- teste. cliente_id/veiculo_id só são preenchidos quando o cadastro
  -- completo acontece (depois do orçamento aceito).
  add column nome_contato text,
  add column telefone_contato text,
  add column tipo_teste text default 'opacidade' check (tipo_teste in ('opacidade')),
  add column cep text,
  add column endereco text,
  add column numero text,
  add column proposta_id uuid references public.propostas(id) on delete set null,
  alter column cliente_id drop not null,
  alter column veiculo_id drop not null,
  add constraint agendamentos_campos_por_tipo check (
    (tipo = 'teste_opacidade' and nome_contato is not null and telefone_contato is not null)
    or (tipo = 'evento' and titulo is not null)
  );

create table public.agendamento_participantes (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios_perfis(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (agendamento_id, usuario_id)
);

alter table public.agendamento_participantes enable row level security;

-- Helper único de visibilidade, reaproveitado nas policies de agendamentos
-- e de agendamento_participantes (evita duplicar a regra nas duas tabelas).
create or replace function public.pode_ver_agendamento(p_agendamento_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.agendamentos a
    where a.id = p_agendamento_id
      and (
        (a.tipo = 'teste_opacidade' and (public.get_my_role() in ('escritorio', 'gerencia') or a.tecnico_id = auth.uid()))
        or
        (a.tipo = 'evento' and (a.criado_por = auth.uid() or exists (
          select 1 from public.agendamento_participantes p
          where p.agendamento_id = a.id and p.usuario_id = auth.uid()
        )))
      )
  );
$$ language sql stable security definer set search_path = public;

-- Substitui a policy de select antiga (só cobria teste de opacidade)
-- por uma que cobre os dois tipos via helper acima.
drop policy "visibilidade de agendamentos por role" on public.agendamentos;
create policy "visibilidade de agendamentos por tipo"
  on public.agendamentos for select
  using (public.pode_ver_agendamento(id));

-- Insert: teste continua só escritorio/gerencia; evento qualquer staff
-- logado, mas só criando pra si mesmo (criado_por = auth.uid()).
drop policy "escritorio+ gerencia cria/edita agendamentos" on public.agendamentos;
create policy "cria agendamento por tipo"
  on public.agendamentos for insert
  with check (
    (tipo = 'teste_opacidade' and public.get_my_role() in ('escritorio', 'gerencia'))
    or (tipo = 'evento' and criado_por = auth.uid())
  );

-- Update: mantém a regra de teste; evento só quem criou.
drop policy "escritorio+ gerencia atualiza agendamentos" on public.agendamentos;
create policy "atualiza agendamento por tipo"
  on public.agendamentos for update
  using (
    (tipo = 'teste_opacidade' and public.get_my_role() in ('escritorio', 'gerencia'))
    or (tipo = 'evento' and criado_por = auth.uid())
  );

create policy "ve participantes de agendamentos visiveis"
  on public.agendamento_participantes for select
  using (public.pode_ver_agendamento(agendamento_id));

create policy "criador do evento gerencia participantes"
  on public.agendamento_participantes for all
  using (exists (select 1 from public.agendamentos a where a.id = agendamento_id and a.criado_por = auth.uid()))
  with check (exists (select 1 from public.agendamentos a where a.id = agendamento_id and a.criado_por = auth.uid()));
