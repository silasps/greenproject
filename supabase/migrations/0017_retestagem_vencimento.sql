-- Retestagem: validade do laudo (1 ano), alertas de vencimento e agendamento
-- público via link no e-mail. Ver plano em /painel/testes/vencendo.

alter table public.dados_empresa
  add column dias_alerta_vencimento integer[] not null default '{60,30}';

-- ─────────────────────────────────────────────────────────────────
-- veiculos_validade — laudo mais recente por veículo + validade (1 ano).
-- security_invoker: roda com as policies de RLS de quem consulta, não do
-- dono da view — respeita as mesmas policies de veiculos_maquinas/laudos.
-- ─────────────────────────────────────────────────────────────────
create view public.veiculos_validade
  with (security_invoker = true) as
select distinct on (v.id)
  v.id as veiculo_id,
  v.cliente_id,
  l.id as laudo_id,
  l.emitido_em,
  (l.emitido_em + interval '1 year') as validade
from public.veiculos_maquinas v
join public.testes_opacidade t on t.veiculo_id = v.id
join public.laudos l on l.teste_id = t.id
order by v.id, l.emitido_em desc;

-- ─────────────────────────────────────────────────────────────────
-- contatos_retestagem — histórico de avisos de vencimento (automático por
-- e-mail via cron, ou manual pelo botão de WhatsApp) — evita reenvio e
-- mostra pro staff se um cliente já foi avisado demais.
-- ─────────────────────────────────────────────────────────────────
create table public.contatos_retestagem (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos_maquinas(id) on delete cascade,
  laudo_id uuid not null references public.laudos(id) on delete cascade,
  canal text not null check (canal in ('email', 'whatsapp')),
  dias_antes integer,
  token text unique,
  enviado_em timestamptz not null default now(),
  enviado_por uuid references public.usuarios_perfis(id) on delete set null
);

create index contatos_retestagem_veiculo_id_idx on public.contatos_retestagem (veiculo_id);
create index contatos_retestagem_laudo_id_idx on public.contatos_retestagem (laudo_id);

alter table public.contatos_retestagem enable row level security;

create policy "staff le contatos_retestagem"
  on public.contatos_retestagem for select
  using (public.get_my_role() is not null);

create policy "staff registra contatos_retestagem"
  on public.contatos_retestagem for insert
  with check (public.get_my_role() is not null);

-- Sem policy pra "anon": a leitura pública por token (página /retestagem/[token])
-- usa createAdminClient() com filtro exato, mesmo padrão de /laudo/[codigo].

-- ─────────────────────────────────────────────────────────────────
-- solicitacoes_retestagem — pedido de agendamento feito pelo cliente a
-- partir do link público recebido por e-mail.
-- ─────────────────────────────────────────────────────────────────
create table public.solicitacoes_retestagem (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  veiculo_id uuid not null references public.veiculos_maquinas(id) on delete cascade,
  mensagem text,
  status text not null default 'pendente' check (status in ('pendente', 'agendado', 'descartada')),
  created_at timestamptz not null default now()
);

create index solicitacoes_retestagem_status_idx on public.solicitacoes_retestagem (status);

alter table public.solicitacoes_retestagem enable row level security;

create policy "staff le solicitacoes_retestagem"
  on public.solicitacoes_retestagem for select
  using (public.get_my_role() is not null);

create policy "staff atualiza solicitacoes_retestagem"
  on public.solicitacoes_retestagem for update
  using (public.get_my_role() is not null);

-- Sem policy de insert/select pra "anon": a inserção pública (formulário em
-- /retestagem/[token]) usa createAdminClient(), mesmo padrão do aceite de
-- proposta por token.
