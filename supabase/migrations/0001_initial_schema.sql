-- Green Project Engenharia — schema inicial (Fase 1: Opacidade)
--
-- Convenções:
--   * single-tenant (uma empresa só) — sem org_id.
--   * RLS habilitado em toda tabela; get_my_role() é a função SECURITY
--     DEFINER usada nas policies (evita RLS recursiva ao consultar
--     usuarios_perfis dentro de uma policy de usuarios_perfis).
--   * Tabelas públicas (laudo/proposta por código/token) NÃO têm policy
--     de SELECT para "anon" — a busca pública é feita no servidor via
--     createAdminClient() com um filtro exato (eq codigo_publico / token),
--     nunca expondo a tabela inteira para leitura anônima.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- usuarios_perfis — staff da empresa (login no painel)
-- ─────────────────────────────────────────────────────────────────
create table public.usuarios_perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role text not null check (role in ('tecnico', 'escritorio', 'gerencia')),
  created_at timestamptz not null default now()
);

create or replace function public.get_my_role()
returns text as $$
  select role from public.usuarios_perfis where id = auth.uid();
$$ language sql stable security definer set search_path = public;

alter table public.usuarios_perfis enable row level security;

create policy "staff pode ver todos os perfis"
  on public.usuarios_perfis for select
  using (public.get_my_role() is not null);

create policy "gerencia gerencia perfis"
  on public.usuarios_perfis for all
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');

-- ─────────────────────────────────────────────────────────────────
-- responsaveis_tecnicos — quem assina os laudos
-- ─────────────────────────────────────────────────────────────────
create table public.responsaveis_tecnicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  formacao text,
  registro_conselho text, -- ex. "CREA-MG 211875D"
  contato text,
  imagem_assinatura_path text,
  created_at timestamptz not null default now()
);

alter table public.responsaveis_tecnicos enable row level security;

create policy "staff le responsaveis_tecnicos"
  on public.responsaveis_tecnicos for select
  using (public.get_my_role() is not null);

create policy "gerencia gerencia responsaveis_tecnicos"
  on public.responsaveis_tecnicos for all
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');

-- ─────────────────────────────────────────────────────────────────
-- clientes
-- ─────────────────────────────────────────────────────────────────
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pj', 'pf')),
  cnpj_cpf text not null,
  nome text not null, -- razão social (pj) ou nome completo (pf)
  endereco text,
  telefone text,
  email text,
  dados_receita jsonb, -- resposta bruta da BrasilAPI, quando pj
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index clientes_cnpj_cpf_key on public.clientes (cnpj_cpf);

create trigger clientes_set_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

alter table public.clientes enable row level security;

create policy "staff le clientes"
  on public.clientes for select
  using (public.get_my_role() is not null);

create policy "escritorio+ gerencia clientes"
  on public.clientes for insert
  with check (public.get_my_role() in ('escritorio', 'gerencia'));

create policy "escritorio+ atualiza clientes"
  on public.clientes for update
  using (public.get_my_role() in ('escritorio', 'gerencia'));

-- ─────────────────────────────────────────────────────────────────
-- fontes_anfavea — uma linha por marca/tabela ANFAVEA usada
-- ─────────────────────────────────────────────────────────────────
create table public.fontes_anfavea (
  id uuid primary key default gen_random_uuid(),
  marca text not null unique,
  url_tabela_pdf text not null,
  hash_ultimo_conteudo text,
  verificado_em timestamptz,
  atualizacao_disponivel boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.fontes_anfavea enable row level security;

create policy "staff le fontes_anfavea"
  on public.fontes_anfavea for select
  using (public.get_my_role() is not null);

create policy "escritorio+ gerencia fontes_anfavea"
  on public.fontes_anfavea for all
  using (public.get_my_role() in ('escritorio', 'gerencia'))
  with check (public.get_my_role() in ('escritorio', 'gerencia'));

-- ─────────────────────────────────────────────────────────────────
-- especificacoes_motor — marcha lenta / rotação de corte / limite de opacidade
-- ─────────────────────────────────────────────────────────────────
create table public.especificacoes_motor (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  identificacao_motor text not null,
  marcha_lenta_min numeric,
  marcha_lenta_max numeric,
  rotacao_corte_min numeric,
  rotacao_corte_max numeric,
  limite_opacidade numeric,
  fonte_id uuid references public.fontes_anfavea(id) on delete set null,
  origem text not null default 'manual' check (origem in ('importado_anfavea', 'manual')),
  status text not null default 'confirmado' check (status in ('pendente_revisao', 'confirmado')),
  created_at timestamptz not null default now()
);

create unique index especificacoes_motor_marca_motor_key
  on public.especificacoes_motor (marca, identificacao_motor);

alter table public.especificacoes_motor enable row level security;

create policy "staff le especificacoes_motor"
  on public.especificacoes_motor for select
  using (public.get_my_role() is not null);

create policy "escritorio+ gerencia especificacoes_motor"
  on public.especificacoes_motor for all
  using (public.get_my_role() in ('escritorio', 'gerencia'))
  with check (public.get_my_role() in ('escritorio', 'gerencia'));

-- ─────────────────────────────────────────────────────────────────
-- veiculos_maquinas
-- ─────────────────────────────────────────────────────────────────
create table public.veiculos_maquinas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo_ativo text not null check (tipo_ativo in ('veiculo', 'maquina_equipamento')),
  identificador text not null, -- placa (veiculo) ou número de série do fabricante (máquina)
  marca text,
  modelo text,
  identificacao_motor text,
  combustivel text,
  ano integer,
  chassi text, -- só veiculo
  renavam text, -- só veiculo
  patrimonio_cliente text, -- só maquina_equipamento
  foto_documento_path text,
  especificacao_motor_id uuid references public.especificacoes_motor(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index veiculos_maquinas_identificador_key on public.veiculos_maquinas (identificador);
create index veiculos_maquinas_cliente_id_idx on public.veiculos_maquinas (cliente_id);

create trigger veiculos_maquinas_set_updated_at
  before update on public.veiculos_maquinas
  for each row execute function public.set_updated_at();

alter table public.veiculos_maquinas enable row level security;

create policy "staff le veiculos_maquinas"
  on public.veiculos_maquinas for select
  using (public.get_my_role() is not null);

create policy "escritorio+ gerencia veiculos_maquinas"
  on public.veiculos_maquinas for insert
  with check (public.get_my_role() in ('escritorio', 'gerencia'));

create policy "escritorio+ atualiza veiculos_maquinas"
  on public.veiculos_maquinas for update
  using (public.get_my_role() in ('escritorio', 'gerencia'));

-- ─────────────────────────────────────────────────────────────────
-- equipamentos_teste (opacímetro/tacômetro)
-- ─────────────────────────────────────────────────────────────────
create table public.equipamentos_teste (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('opacimetro', 'tacometro')),
  modelo text not null,
  numero_serie text not null,
  fabricante text,
  numero_inmetro text,
  data_afericao date,
  validade date,
  pdf_certificado_calibracao_path text,
  created_at timestamptz not null default now()
);

create unique index equipamentos_teste_numero_serie_key on public.equipamentos_teste (numero_serie);

alter table public.equipamentos_teste enable row level security;

create policy "staff le equipamentos_teste"
  on public.equipamentos_teste for select
  using (public.get_my_role() is not null);

create policy "escritorio+ gerencia equipamentos_teste"
  on public.equipamentos_teste for all
  using (public.get_my_role() in ('escritorio', 'gerencia'))
  with check (public.get_my_role() in ('escritorio', 'gerencia'));

-- ─────────────────────────────────────────────────────────────────
-- propostas — orçamento formal enviado por link com token + OTP
-- ─────────────────────────────────────────────────────────────────
create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  veiculo_id uuid references public.veiculos_maquinas(id) on delete set null,
  km_ida_volta numeric not null,
  valor_km numeric not null,
  pedagio numeric not null default 0,
  alimentacao numeric not null default 0,
  valor_servico numeric not null default 0,
  valor_total numeric not null,
  token text not null,
  status text not null default 'enviada' check (status in ('enviada', 'aceita', 'expirada')),
  otp_hash text,
  otp_expira_em timestamptz,
  evidencia_aceite jsonb, -- ip, user-agent, timestamp, hash do conteúdo
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index propostas_token_key on public.propostas (token);

alter table public.propostas enable row level security;

create policy "staff le propostas"
  on public.propostas for select
  using (public.get_my_role() is not null);

create policy "escritorio+ gerencia propostas"
  on public.propostas for all
  using (public.get_my_role() in ('escritorio', 'gerencia'))
  with check (public.get_my_role() in ('escritorio', 'gerencia'));

-- Nota: o aceite público (por token) é feito via server action usando
-- createAdminClient() + filtro exato por token — não há policy de
-- select/update para "anon" nesta tabela.

-- ─────────────────────────────────────────────────────────────────
-- agendamentos
-- ─────────────────────────────────────────────────────────────────
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  veiculo_id uuid not null references public.veiculos_maquinas(id) on delete cascade,
  tecnico_id uuid references public.usuarios_perfis(id) on delete set null,
  data_hora timestamptz not null,
  status text not null default 'agendado' check (status in ('agendado', 'em_andamento', 'concluido', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agendamentos_tecnico_id_idx on public.agendamentos (tecnico_id);
create index agendamentos_data_hora_idx on public.agendamentos (data_hora);

create trigger agendamentos_set_updated_at
  before update on public.agendamentos
  for each row execute function public.set_updated_at();

alter table public.agendamentos enable row level security;

-- Técnico só vê os próprios agendamentos; escritório/gerência vêem todos.
create policy "visibilidade de agendamentos por role"
  on public.agendamentos for select
  using (
    public.get_my_role() in ('escritorio', 'gerencia')
    or tecnico_id = auth.uid()
  );

create policy "escritorio+ gerencia cria/edita agendamentos"
  on public.agendamentos for insert
  with check (public.get_my_role() in ('escritorio', 'gerencia'));

create policy "escritorio+ gerencia atualiza agendamentos"
  on public.agendamentos for update
  using (public.get_my_role() in ('escritorio', 'gerencia'));

-- ─────────────────────────────────────────────────────────────────
-- testes_opacidade
-- ─────────────────────────────────────────────────────────────────
create table public.testes_opacidade (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  veiculo_id uuid not null references public.veiculos_maquinas(id) on delete cascade,
  equipamento_id uuid references public.equipamentos_teste(id) on delete set null,
  numero_teste text,
  foto_frente_path text,
  foto_traseira_path text,
  foto_painel_path text,
  foto_etiqueta_path text,
  pdf_ensaio_original_path text,
  resultado text check (resultado in ('aprovado', 'reprovado')),
  media_m1 numeric,
  status text not null default 'aguardando_execucao'
    check (status in ('aguardando_execucao', 'aguardando_pdf_syscon', 'aguardando_revisao', 'aprovado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index testes_opacidade_agendamento_id_idx on public.testes_opacidade (agendamento_id);
create index testes_opacidade_status_idx on public.testes_opacidade (status);

create trigger testes_opacidade_set_updated_at
  before update on public.testes_opacidade
  for each row execute function public.set_updated_at();

alter table public.testes_opacidade enable row level security;

create policy "visibilidade de testes por role"
  on public.testes_opacidade for select
  using (
    public.get_my_role() in ('escritorio', 'gerencia')
    or exists (
      select 1 from public.agendamentos a
      where a.id = agendamento_id and a.tecnico_id = auth.uid()
    )
  );

create policy "staff cria testes"
  on public.testes_opacidade for insert
  with check (public.get_my_role() is not null);

-- Qualquer membro do staff associado ao teste pode editar em qualquer
-- etapa (campos nunca ficam travados — ver plano). O único bloqueio real
-- é o botão "Liberar", validado na aplicação antes de gravar resultado
-- final e chamar a criação do laudo.
create policy "staff atualiza testes"
  on public.testes_opacidade for update
  using (
    public.get_my_role() in ('escritorio', 'gerencia')
    or exists (
      select 1 from public.agendamentos a
      where a.id = agendamento_id and a.tecnico_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- testes_opacidade_medicoes — tabela filha (uma linha por ciclo de aceleração)
-- ─────────────────────────────────────────────────────────────────
create table public.testes_opacidade_medicoes (
  id uuid primary key default gen_random_uuid(),
  teste_id uuid not null references public.testes_opacidade(id) on delete cascade,
  ciclo_aceleracao integer not null,
  opacidade_m1 numeric, -- vem do pdf do Syscon
  rotacao_corte numeric, -- vem de especificacoes_motor, só referência
  tempo_segundos numeric not null default 4, -- padrão de mercado
  created_at timestamptz not null default now()
);

create unique index testes_opacidade_medicoes_ciclo_key
  on public.testes_opacidade_medicoes (teste_id, ciclo_aceleracao);

alter table public.testes_opacidade_medicoes enable row level security;

create policy "visibilidade de medicoes por role"
  on public.testes_opacidade_medicoes for select
  using (
    public.get_my_role() in ('escritorio', 'gerencia')
    or exists (
      select 1 from public.testes_opacidade t
      join public.agendamentos a on a.id = t.agendamento_id
      where t.id = teste_id and a.tecnico_id = auth.uid()
    )
  );

create policy "staff gerencia medicoes"
  on public.testes_opacidade_medicoes for all
  using (public.get_my_role() is not null)
  with check (public.get_my_role() is not null);

-- ─────────────────────────────────────────────────────────────────
-- laudos — só criados/atualizados pela aplicação via service role,
-- após a checagem de canRevisarELiberarLaudo (gerência libera o teste).
-- ─────────────────────────────────────────────────────────────────
create table public.laudos (
  id uuid primary key default gen_random_uuid(),
  teste_id uuid not null references public.testes_opacidade(id) on delete cascade,
  numero text not null, -- ex. "828/26"
  revisao integer not null default 0,
  codigo_publico text not null,
  pdf_path text not null,
  responsavel_tecnico_id uuid not null references public.responsaveis_tecnicos(id),
  emitido_em timestamptz not null default now()
);

create unique index laudos_codigo_publico_key on public.laudos (codigo_publico);
create unique index laudos_teste_id_key on public.laudos (teste_id);

alter table public.laudos enable row level security;

create policy "staff le laudos"
  on public.laudos for select
  using (public.get_my_role() is not null);

-- Sem policy de insert/update para authenticated: a emissão acontece só
-- via server action com createAdminClient() (bypassa RLS), depois de
-- checar canRevisarELiberarLaudo(role) na aplicação.
-- A verificação pública em /laudo/[codigo] também usa createAdminClient()
-- com filtro exato por codigo_publico — não há policy de select para "anon".
