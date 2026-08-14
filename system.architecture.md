# Green Project Engenharia — System Architecture

> Objetivo deste documento: descrever o sistema com detalhe suficiente pra
> qualquer IA (ou dev) reconstruir a aplicação do zero sem acesso ao código
> original — schema completo, regras de negócio, fluxos, convenções e
> decisões de design. Escrito em português (idioma do domínio/negócio);
> nomes de tabelas/colunas/rotas são citados literalmente.

## 1. O que é o sistema

Aplicação interna (painel) + site público da **Greenproject Engenharia
Mecânica**, empresa que presta serviço de **ensaio de opacidade** (medição
de fumaça preta em veículos/máquinas a diesel, conforme normas
IBAMA/CONAMA) e emite laudos técnicos. O sistema cobre:

1. **Site público**: institucional, catálogo de serviços, autenticação.
2. **Painel interno** (login obrigatório): agenda/CRM, cadastro de
   clientes e veículos, execução do ensaio técnico, emissão de laudo em
   PDF, orçamento automático, e um módulo de RH (DP).
3. **Verificação pública sem login**: página de laudo (`/laudo/[codigo]`)
   e de proposta comercial (`/proposta/[token]`), pra quem recebe o link
   conferir o documento sem precisar de conta.

Modelo **single-tenant** (uma empresa só, sem multi-empresa/organização).

## 2. Stack técnica

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Middleware | `src/proxy.ts` (Next 16 renomeou `middleware.ts` → `proxy.ts` — ver `AGENTS.md` do projeto, que avisa que essa versão tem breaking changes vs. o Next.js "clássico") |
| Banco/Auth/Storage | Supabase (Postgres + Auth + Storage), acessado via `@supabase/ssr` e `@supabase/supabase-js` |
| Estilo | Tailwind CSS v4 (`@import "tailwindcss"` em `globals.css`, sem `tailwind.config.js`), + `shadcn` como fonte dos componentes de UI, + `tw-animate-css` |
| Componentes de UI base | `@base-ui/react` (Dialog, Select, Tabs, Checkbox, Popover, Dropdown, Input, Button primitives) — **não** é Radix |
| Editor rich-text | `@tiptap/react` + `@tiptap/starter-kit` |
| PDF | `jspdf` + `jspdf-autotable` (geração), `pdf-lib` (merge de PDFs existentes), `pdfjs-dist` (parsing) |
| Datas | `date-fns` v4 (+ locale `ptBR`) |
| Ícones | `lucide-react` |
| Validação de doc. | funções próprias (CPF/CNPJ) em `src/lib/utils/documento.ts` — sem lib externa |
| Toast (instalado, não usado) | `sonner` |
| Email | `nodemailer` via SMTP da Brevo (`src/lib/email/enviar.ts`, `enviarEmail`) — usado pelo formulário público `/contato` (envia pra `COMPANY.email`) e pelo envio do laudo emitido pro cliente (`src/lib/laudo/enviar-email.ts`, manual ou automático na validação, ver seção 8.4/8.4.1); o reset de senha continua sendo o e-mail transacional nativo do Supabase Auth, não passa por aqui |

Não há back-end separado: toda lógica de servidor é **Server Components**
+ **Server Actions** (`"use server"`) do Next.js, rodando contra o
Supabase.

## 3. Variáveis de ambiente (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Brevo — usado por /contato e pelo envio de laudo por e-mail no painel (src/lib/email/enviar.ts)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=
BREVO_SMTP_PASSWORD=
EMAIL_FROM="Green Project Engenharia <engenharia@greenproject.com.br>"

# Usado só pra montar o link wa.me (não é uma API de WhatsApp de verdade)
WHATSAPP_NUMERO=5531997901568

# Usado pra montar links absolutos (verificação de laudo/proposta, reset de senha)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`next.config.ts` só ajusta `experimental.serverActions.bodySizeLimit` pra
`10mb` (upload de fotos/PDF de ensaio).

## 4. Clientes Supabase (`src/lib/supabase/`)

Três variantes, **nunca** misturar:

- **`server.ts`** (`createClient`) — cliente async ligado aos cookies da
  request (Server Components/Server Actions), respeita RLS como o usuário
  logado.
- **`client.ts`** (`createClient`) — cliente de browser (Client
  Components), respeita RLS como o usuário logado.
- **`admin.ts`** (`createAdminClient`) — service role, **bypassa RLS**.
  Regra do projeto: só usar dentro de uma Server Action, **depois** de um
  check manual de permissão (`requireAuth`/`requireRole`). É o cliente
  usado pra: qualquer escrita que envolva lógica que RLS não expressa bem,
  todo upload de Storage, e toda leitura pública por código/token (nunca
  existe policy de `select` pra `anon` nas tabelas de laudo/proposta —
  a "segurança" ali é o filtro exato por código aleatório, feito no
  servidor).
- **`middleware.ts`** (`updateSession`) — chamado pelo `proxy.ts` em toda
  request, refresca o cookie de sessão do Supabase Auth.

## 5. Autenticação e controle de acesso

- Login é feito via Supabase Auth (e-mail+senha). Não há cadastro
  público — contas só são criadas pelo módulo de DP (seção 9).
- `src/lib/auth/session.ts`:
  - `getSession()` — pega o `auth.users` atual, faz join com
    `usuarios_perfis` (`id, nome, role, acesso_sistema`). Se
    `acesso_sistema === false`, **trata como se não houvesse sessão**
    (retorna `null`) — é assim que o toggle de "acesso ao sistema" da
    pessoa bloqueia o login sem precisar desativar a conta no Supabase Auth.
  - `requireAuth()` — chama `getSession()`, redireciona pra `/login` se
    `null`.
  - `requireRole(roles[])` — chama `requireAuth()`, redireciona pra
    `/acesso-negado` se o `role` não estiver na lista.
  - `requireArea(area: KpiSecaoKey)` — gate alternativo, **não** baseado no
    `role` fixo da conta: resolve acesso pelo mesmo mecanismo de
    cargo/pessoa de `getSecoesVisiveis` (seção 6.18). Usado só por
    `/painel/site/**` e `/painel/servicos/**` (ver seção 10) — a gerência
    pode liberar essa área pra outros cargos via toggle em Configurações,
    sem tocar em código.
- `src/lib/auth/permissions.ts`:
  - `Role = "tecnico" | "escritorio" | "gerencia"`, com hierarquia
    numérica (`10/50/80`) usada por `getRoleLevel`.
  - Funções nomeadas de permissão (usar sempre estas, nunca comparar
    string de role direto): `canVerAgendaCompleta`, `canGerenciarClientes`,
    `canGerenciarEquipamentos`, `canGerenciarEspecificacoesMotor`,
    `canImportarPdfSyscon`, `canRevisarELiberarLaudo`,
    `canGerenciarUsuarios`, `canGerenciarResponsaveisTecnicos` — todas
    `>= escritorio` exceto liberar laudo/gerenciar usuários/responsáveis
    técnicos, que são `gerencia`-only. **Não existe `canGerenciarSite`** —
    acesso a `/painel/site` é o único caso que usa `requireArea` (acima)
    em vez de uma função de permissão fixa por role.
  - `usuarios_perfis.is_superadmin` (migration 0022): flag adicional sobre
    a conta gerência, não um novo nível de role — permite "vestir" a sessão
    de outro usuário (impersonação) pra validar o que cada papel vê.
  - `getLoginDestination(role)` — pra onde redirecionar após login
    (técnico/escritório → `/painel/agenda`, gerência → `/painel`).
- RLS no Postgres é a **linha de defesa real** (não é só o app-level
  check) — toda tabela tem `enable row level security` + policies restritas
  por `public.get_my_role()` (função `security definer` que lê
  `usuarios_perfis`, evitando recursão de RLS ao ser chamada de dentro de
  policies da própria `usuarios_perfis`).
- `/acesso-negado` — página simples de "sem permissão".
- **Superadmin / impersonação** (`usuarios_perfis.is_superadmin`,
  `src/lib/auth/impersonation.ts`): flag adicional sobre uma conta
  `gerencia` (não é um nível novo na hierarquia de `Role` — RLS continua
  vendo essa conta como `gerencia`). Quem tem a flag ganha um dropdown na
  sidebar (`identity-switcher.tsx`, só renderizado quando
  `is_superadmin || impersonando`) pra **trocar a sessão real do servidor**
  pra a de qualquer outro usuário com `acesso_sistema = true` — não é uma
  simulação de UI, dali em diante toda RLS/Server Action roda como aquele
  usuário de fato:
  - `assumirIdentidade(usuarioId)` guarda o `refresh_token` da sessão
    original num cookie httpOnly (`gp_impersonator_refresh`, só na
    primeira troca — trocar de um impersonado pra outro não sobrescreve),
    gera um magic link pro usuário-alvo via
    `admin.auth.admin.generateLink()` e troca a sessão com
    `supabase.auth.verifyOtp({ token_hash, type: "magiclink" })`.
  - `voltarAoAdmin()` lê o cookie e restaura a sessão original com
    `supabase.auth.refreshSession({ refresh_token })`.
  - Autorização de `assumirIdentidade`/`listarUsuariosParaImpersonar`: ou
    `perfil.is_superadmin`, ou o cookie de impersonação já existir (prova
    que uma sessão de superadmin iniciou a troca).
  - Mesma flag também libera `/painel/sugestoes` (`requireSuperadmin()`,
    caixa de sugestões pro desenvolvedor — ver seção 6.22), via um segundo
    helper (não reaproveita `requireRole`, que só olha o `Role` fixo).

## 6. Schema do banco (Postgres/Supabase)

Convenções usadas em toda tabela: `id uuid primary key default
gen_random_uuid()`, RLS sempre ligado, updated_at mantido por trigger
`public.set_updated_at()` quando a tabela tem esse campo.

### 6.1 `usuarios_perfis` (staff — quem loga no painel)
```
id uuid PK references auth.users(id) on delete cascade
nome text not null
role text not null check in ('tecnico','escritorio','gerencia')
funcao_id uuid references funcoes(id) on delete set null
cpf text
telefone text            -- reaproveitado como "WhatsApp" na UI de DP
data_admissao date
acesso_sistema boolean not null default true
created_at timestamptz
```
Policies: qualquer staff logado lê todos os perfis (`get_my_role() is not
null`); só `gerencia` faz insert/update/delete.
`public.get_my_role()` — `security definer`, lê essa tabela por `auth.uid()`.

### 6.2 `funcoes` (cargos — definem o nível de acesso)
```
id uuid PK
nome text not null
descricao text            -- HTML gerado pelo editor Tiptap
nivel_acesso text not null check in ('tecnico','escritorio','gerencia')
created_at timestamptz
```
Índice único **case+acento-insensível**: `unique index on
(public.nome_normalizado(nome))`, onde `nome_normalizado(text) returns
text language sql immutable as $$ select lower(public.unaccent($1)) $$`
(extensão `unaccent` habilitada). Isso é o que impede cadastrar "Técnico
de Campo" duas vezes com variação de acento/maiúscula.
Policies: staff lê tudo; só `gerencia` escreve.

### 6.3 `responsaveis_tecnicos` (quem assina os laudos)
```
id uuid PK, nome text not null, formacao text, registro_conselho text,
contato text, imagem_assinatura_path text, created_at
```
Staff lê; só `gerencia` gerencia.

### 6.4 `clientes`
```
id uuid PK
tipo text check in ('pj','pf')          -- nullable (pendente até completar)
cnpj_cpf text                            -- nullable, unique quando preenchido
nome text not null
endereco text, telefone text, email text
dados_receita jsonb                      -- resposta bruta da BrasilAPI (pj)
status text not null default 'completo' check in ('pendente','completo')
created_at, updated_at (trigger)
```
`status='pendente'` existe pro fluxo de captação rápida pela Agenda (seção
8): cria um cliente só com nome+telefone, sem CNPJ/CPF ainda. Índice único
em `cnpj_cpf` permite múltiplos `NULL` (comportamento padrão do Postgres).
Staff lê; `escritorio+` insere/atualiza.

### 6.5 `fontes_anfavea` (schema presente, **não usado no app hoje**)
```
id uuid PK, marca text unique, url_tabela_pdf text not null,
hash_ultimo_conteudo text, verificado_em timestamptz,
atualizacao_disponivel boolean default false, created_at
```
Pensado pra um futuro monitor automático das tabelas ANFAVEA (marcha
lenta/rotação de corte por marca/motor) — nenhuma rota do app lê/escreve
aqui ainda. Reconstruir: pode pular esta tabela na v1 sem perder
funcionalidade, ou mantê-la como está (reservada).

### 6.6 `especificacoes_motor`
```
id uuid PK, marca text not null, identificacao_motor text not null,
marcha_lenta_min/max numeric, rotacao_corte_min/max numeric,
limite_opacidade numeric,
fonte_id uuid references fontes_anfavea(id) on delete set null,
origem text default 'manual' check in ('importado_anfavea','manual'),
status text default 'confirmado' check in ('pendente_revisao','confirmado'),
created_at
```
Unique em `(marca, identificacao_motor)`. Preenchida manualmente no
cadastro do veículo (upsert por marca+motor — ver 6.7/ação
`salvarVeiculo`), não há importação ANFAVEA automática implementada.

### 6.7 `veiculos_maquinas`
```
id uuid PK
cliente_id uuid not null references clientes(id) on delete cascade
tipo_ativo text not null check in ('veiculo','maquina_equipamento')
identificador text not null unique   -- placa OU nº de série
marca text, modelo text, identificacao_motor text, combustivel text, ano int
chassi text, renavam text            -- só veiculo
patrimonio_cliente text              -- só maquina_equipamento
foto_documento_path text
especificacao_motor_id uuid references especificacoes_motor(id) on delete set null
created_at, updated_at (trigger)
```
Staff lê; `escritorio+` insere/atualiza.

### 6.8 `equipamentos_teste` (opacímetro/tacômetro da empresa)
```
id uuid PK, tipo text check in ('opacimetro','tacometro'), modelo text not null,
numero_serie text not null unique, fabricante text, numero_inmetro text,
data_afericao date, validade date, pdf_certificado_calibracao_path text,
selo_imagem_path text,  -- 0029, opcional
criado_por/atualizado_por uuid references usuarios_perfis(id) on delete set null,
atualizado_em timestamptz, created_at
```
(`criado_por`/`atualizado_por`/`atualizado_em` vieram de uma migration
posterior, `0002`.) Staff lê; `escritorio+` gerencia tudo.

`selo_imagem_path` (migration `0029`) — selo de verificação do fabricante
do equipamento (ex.: "Smoke Check 2000 — Opacímetro Portátil"), imagem
opcional anexada em `/painel/equipamentos` junto com o certificado de
calibração (mesmo campo `FileDropInput`, `accept="image/*"`, path
`equipamentos/{id}/selo-imagem.{ext}`). Usada só no PDF do laudo (seção
8.6) — não temos esse arquivo em nenhum outro lugar do sistema, então sem
o upload manual essa parte da página 2 simplesmente não aparece (não é
inventada).

### 6.9 `agendamentos` (agenda + pipeline comercial — o núcleo do painel)
Tabela **polimórfica**: um registro é ou um teste de opacidade agendado,
ou um evento livre de agenda (tipo Google Calendar).
```
id uuid PK
tipo text not null default 'teste_opacidade' check in ('teste_opacidade','evento')
cliente_id uuid references clientes(id) on delete cascade      -- nullable
veiculo_id uuid references veiculos_maquinas(id) on delete cascade -- nullable
tecnico_id uuid references usuarios_perfis(id) on delete set null
data_hora timestamptz not null
data_hora_fim timestamptz               -- nullable (migration 0010); form sempre preenche, padrão 1h de duração
status text default 'agendado' check in ('agendado','em_andamento','concluido','cancelado')
categoria_id uuid references categorias_agenda(id) on delete set null   -- migration 0012, ver 6.17
-- campos de EVENTO:
titulo text, descricao text, criado_por uuid references usuarios_perfis(id) on delete set null
-- campos de TESTE via captação rápida (ver seção 8):
nome_contato text, telefone_contato text, whatsapp_contato text
tipo_teste text default 'opacidade' check in ('opacidade')
tipo_servico_id uuid references tipos_servico(id) on delete set null  -- migration 0019
cep text, endereco text, numero text
proposta_id uuid references propostas(id) on delete set null
created_at, updated_at (trigger)
constraint agendamentos_campos_por_tipo check (
  (tipo='evento' and titulo is not null)
  or (tipo='teste_opacidade' and nome_contato is not null and telefone_contato is not null)
)
```
`telefone_contato` continua `not null` pro tipo teste (constraint acima) —
o form de criação (seção 8.2) garante isso preenchendo com o WhatsApp
quando o campo de telefone fica em branco (só um dos dois é exigido na UI).
RLS (função helper `public.pode_ver_agendamento(id) returns boolean
security definer`, reaproveitada também na tabela de participantes):
- **select**: `teste_opacidade` → `escritorio`/`gerencia` veem tudo,
  técnico só o que `tecnico_id = auth.uid()`. `evento` → só quem
  `criado_por = auth.uid()` ou está em `agendamento_participantes` —
  **evento pessoal não aparece nem pra gerência**, é o único caso do
  sistema onde gerência não vê tudo.
- **insert**: `teste_opacidade` só `escritorio`/`gerencia`; `evento`
  qualquer staff logado, mas só com `criado_por = auth.uid()`.
- **update**: mesma regra do insert.

### 6.10 `agendamento_participantes` (participantes de um evento)
```
id uuid PK, agendamento_id uuid not null references agendamentos(id) on delete cascade,
usuario_id uuid not null references usuarios_perfis(id) on delete cascade,
created_at, unique(agendamento_id, usuario_id)
```
select: `pode_ver_agendamento(agendamento_id)`. Insert/update/delete: só
quem é `criado_por` do agendamento pai.

### 6.11 `tipos_servico` (preço por tipo de serviço, selecionável no agendamento)
```
id uuid PK, nome text not null, valor numeric not null default 0,
ativo boolean not null default true, created_at
```
Seed inicial: `('Opacidade', 0)`. Staff lê; só `gerencia` gerencia. Ao
criar um teste na Agenda, escolher o tipo já preenche "Valor do serviço".

### 6.12 `configuracoes_orcamento` (singleton — 1 linha só)
```
id boolean PK default true check(id)   -- trava a 1 linha só
valor_km numeric not null default 0
fator_correcao_distancia numeric not null default 1.4
updated_at timestamptz
```
(`valor_servico_padrao` existiu numa versão anterior e foi removido —
o preço do serviço migrou pra `tipos_servico`, por tipo, em vez de um
único valor global.) Staff lê; só `gerencia` atualiza (`update ... where
id = true`).

### 6.13 `propostas` (orçamento formal, com link público)
```
id uuid PK
cliente_id uuid references clientes(id) on delete set null
veiculo_id uuid references veiculos_maquinas(id) on delete set null
agendamento_id uuid references agendamentos(id) on delete set null
km_ida_volta numeric not null
valor_km numeric not null
pedagio numeric not null default 0
alimentacao numeric not null default 0
valor_servico numeric not null default 0
valor_total numeric not null
token text not null unique             -- identificador público (URL /proposta/[token])
status text not null default 'enviada' check in ('enviada','aceita','expirada')
otp_hash text, otp_expira_em timestamptz    -- reservado, não implementado (ver seção 8)
evidencia_aceite jsonb                 -- {ip, userAgent, aceito_em} (aceite público) ou
                                        -- {via:"staff", canal, detalhe, aceito_por, aceito_em} (aceitarPropostaComoStaff)
expires_at timestamptz
pdf_path text                          -- preenchido só depois do cadastro completo
created_at
```
**Fórmula do valor total** (única fonte de verdade:
`src/lib/orcamento/calcular.ts`):
```
valor_total = (km_ida_volta * valor_km) + pedagio + alimentacao + valor_servico
```
Staff lê; `escritorio+` gerencia. Aceite público não tem policy de select
pra `anon` — feito via `createAdminClient()` filtrando por `token` exato.

### 6.14 `testes_opacidade`
```
id uuid PK, agendamento_id uuid not null references agendamentos(id) on delete cascade,
veiculo_id uuid not null references veiculos_maquinas(id) on delete cascade,
equipamento_id uuid references equipamentos_teste(id) on delete set null,
numero_teste text,
foto_frente_path/foto_traseira_path/foto_painel_path/foto_etiqueta_path text,
foto_etiqueta_numero_path text,     -- migration 0020, zoom só no número (conferência)
pdf_ensaio_original_path text,
resultado text check in ('aprovado','reprovado'),
media_m1 numeric,
status text default 'aguardando_execucao'
  check in ('aguardando_execucao','aguardando_pdf_syscon','aguardando_revisao','aprovado'),
created_at, updated_at (trigger)
```
select: `escritorio`/`gerencia` tudo, ou técnico dono do agendamento pai.
insert: qualquer staff logado. update: mesma regra do select — **os campos
nunca ficam travados por etapa**, o único bloqueio de verdade é o botão
"Liberar laudo" (checado na aplicação, não no banco).

### 6.15 `testes_opacidade_medicoes` (uma linha por ciclo de aceleração)
```
id uuid PK, teste_id uuid not null references testes_opacidade(id) on delete cascade,
ciclo_aceleracao integer not null,
opacidade_m1 numeric,          -- vem do PDF do Syscon
rotacao_corte numeric,         -- referência de especificacoes_motor
tempo_segundos numeric not null default 4,
created_at, unique(teste_id, ciclo_aceleracao)
```
select: mesma regra herdada via join com `testes_opacidade`/`agendamentos`.
insert/update/delete: qualquer staff logado.

### 6.16 `laudos` (documento final, emitido uma vez)
```
id uuid PK, teste_id uuid not null unique references testes_opacidade(id) on delete cascade,
numero text not null,          -- ex. "828/26" (sequencial/ano, ver 8.3)
revisao integer not null default 0,
codigo_publico text not null unique,   -- ex. "ABCD-EFGH-JKLM"
pdf_path text not null,        -- bucket "laudos"
responsavel_tecnico_id uuid not null references responsaveis_tecnicos(id),
emitido_em timestamptz not null default now()
```
Staff lê. **Sem policy de insert/update pra `authenticated`** — só é
criado via Server Action com `createAdminClient()`, depois de checar
`canRevisarELiberarLaudo`. Verificação pública em `/laudo/[codigo]`
também usa `createAdminClient()` com filtro exato — sem policy pra `anon`.

### 6.17 `categorias_agenda` (assunto/cor do evento, compartilhado pela equipe)
```
id uuid PK, nome text not null unique, cor text not null,
criado_por uuid references usuarios_perfis(id) on delete set null, created_at
```
Sem "dono": **qualquer staff logado pode ver e criar** (select/insert
liberado pra `auth.uid() is not null`, sem policy de update/delete — uma
categoria nunca é editada/apagada pela UI, só criada). `cor` é um hex
livre, mas a UI só oferece uma paleta fixa de 8 cores
(`src/app/painel/agenda/cores.ts`, `CORES_AGENDA`) no criador. Todo
evento sem categoria escolhida cai automaticamente numa **categoria
pessoal** (nome = nome da pessoa, cor derivada por hash do `usuario_id` —
sempre a mesma cor pra a mesma pessoa), criada sob demanda na primeira vez
(`obterOuCriarCategoriaPessoal` em `agenda/actions.ts`) — na prática,
**todo evento sempre tem uma categoria**.

### 6.18 `funcoes_kpis` / `usuarios_kpis` (visibilidade dos cards do dashboard)
```
-- funcoes_kpis
id uuid PK, funcao_id uuid not null references funcoes(id) on delete cascade,
kpi_secao text not null, visivel boolean not null, created_at,
unique(funcao_id, kpi_secao)

-- usuarios_kpis (mesma forma, por pessoa em vez de por cargo)
id uuid PK, usuario_id uuid not null references usuarios_perfis(id) on delete cascade,
kpi_secao text not null, visivel boolean not null, created_at,
unique(usuario_id, kpi_secao)
```
Resolução em `src/lib/kpis/visibilidade.ts` (`getSecoesVisiveis`):
override por pessoa (`usuarios_kpis`) vence override por cargo
(`funcoes_kpis`), que vence o **nível padrão do catálogo**
(`src/lib/kpis/catalogo.ts`, `KPI_SECOES` — chave, label, ícone, cor,
`nivelPadrao`, `href`). Ausência de linha em qualquer camada = "segue a
camada de baixo". Staff lê tudo (`get_my_role() is not null`); só
`gerencia` escreve em `funcoes_kpis`; em `usuarios_kpis` cada um lê a
própria linha (`usuario_id = auth.uid()`) além de `gerencia` ler todas, e
só `gerencia` escreve. UI: cargo em Configurações → aba "Visibilidade e
acesso" (`kpis-por-cargo-form.tsx`); pessoa em DP →
`dp/[id]/kpis-pessoa-form.tsx` (exceção pontual sem mudar o cargo). Os
cards resultantes (`KpiCard`, `src/components/kpi-card.tsx`) aparecem no
dashboard (`/painel/page.tsx`) — ver nota na seção 12, esse item **saiu**
de "fora de escopo".

**`KpiSecaoDef.tipo: "kpi" | "acesso"`** separa as duas coisas que esse
catálogo hoje faz: `"kpi"` é card de métrica na tela inicial do painel
(as 5 seções originais); `"acesso"` controla se a pessoa consegue abrir
uma área inteira do sistema (hoje só `"site"`, ver abaixo). Os dois
formulários de toggle (`kpis-por-cargo-form.tsx`,
`dp/[id]/kpis-pessoa-form.tsx`) filtram por `tipo`
(`KPI_SECOES_DASHBOARD`/`KPI_SECOES_ACESSO`, exportados de
`catalogo.ts`) e renderizam dois grupos separados — em DP, dois cards
**colapsáveis** (`src/components/ui/collapsible.tsx`, wrapper de
`@base-ui/react/collapsible`, mesmo padrão dos outros primitivos em
`components/ui/`; ambos começam fechados e usam `keepMounted` no painel
pra continuar submetendo os dois grupos juntos com o card fechado —
`salvarUsuarioKpis`/`salvarFuncaoKpis` continuam recebendo **um único
FormData com as duas seções**, então nunca viraram dois `<form>`
separados). A resolução em `getSecoesVisiveis` é idêntica pros dois
tipos — só a apresentação/gravação nos formulários muda:

- **`tipo: "kpi"`** — radio de 3 estados (`SecaoRadios`, tanto em
  `kpis-por-cargo-form.tsx` quanto em `kpis-pessoa-form.tsx`): "Seguir
  cargo" apaga o override (volta a herdar), "Sempre mostrar"/"Sempre
  esconder" grava explícito. É um ajuste pontual em cima do padrão do
  cargo — pensado pra exceção, não pra configuração permanente.
- **`tipo: "acesso"`** — checkbox direto (`SecaoCheckboxes` em
  `kpis-pessoa-form.tsx`, mesmo visual de `GrupoCheckboxes` em
  `kpis-por-cargo-form.tsx`), **sem** estado "seguir cargo": marcado ou
  desmarcado grava sempre um valor explícito em `usuarios_kpis`, igual ao
  que já acontecia por cargo em `funcoes_kpis`/`salvarFuncaoKpis`. Não dá
  pra "resetar" pra seguir o cargo por essa UI — é a mesma limitação que
  já existia no toggle por cargo, só replicada por pessoa.

**Chaves com `tipo: "acesso"`** não viram card do dashboard
(`/painel/page.tsx` não tem `case` pra elas — nenhum fetch, nenhum
`KpiCard` renderizado). Existem só pra reaproveitar a mesma resolução de
acesso (pessoa > cargo > nível padrão) como controle de acesso a uma área
inteira do painel, via `requireArea(key)` (seção 5) em vez de um
`canGerenciarX` fixo. `nivelPadrao` de cada uma reproduz **exatamente** o
`requireRole` que a área já tinha hardcoded antes — zero mudança de
comportamento até a gerência mexer num toggle:

| key | área | `nivelPadrao` |
| --- | --- | --- |
| `site` | `/painel/site/**`, `/painel/servicos/**` | gerencia |
| `testes` | `/painel/testes`, `/painel/testes/vencendo` (lista completa — `/painel/testes/[id]` continua só `requireAuth`, técnico vê o próprio teste) | escritorio |
| `clientes` | `/painel/clientes/**` | escritorio |
| `equipamentos` | `/painel/equipamentos/**` | escritorio |
| `responsaveis_tecnicos` | `/painel/responsaveis-tecnicos/**` | gerencia |

**Departamento Pessoal e Configurações ficaram de fora de propósito** —
continuam com `requireRole(["gerencia"])`/`canGerenciarUsuarios` fixo, não
viram `KpiSecaoKey`. DP cria conta, reseta senha e muda role/cargo de
qualquer pessoa; Configurações é onde os próprios toggles de acesso são
concedidos. Delegar essas duas áreas abriria escalada de privilégio (uma
exceção mal pensada daria a alguém sem gerência o poder de se conceder
mais acesso). Se um dia isso mudar, é decisão deliberada, não just mais
uma entrada no catálogo.

`canVerAgendaCompleta`/`canGerenciarEquipamentos`/
`canGerenciarResponsaveisTecnicos` (`src/lib/auth/permissions.ts`) foram
removidas — ficaram sem uso depois que as áreas que elas gateavam
migraram pra `requireArea`. `canGerenciarClientes` continua existindo
porque é reaproveitada dentro de Agenda/Testes (`agenda/actions.ts`,
`agenda/page.tsx`, `testes/actions.ts`) pra decidir quem pode
agendar/gerenciar teste pra qualquer cliente — permissão de ação dentro
de um fluxo, diferente de "pode abrir `/painel/clientes`" (que agora é
`requireArea("clientes")`). Essas duas coisas usam o mesmo nome de função
por coincidência histórica, não a mesma regra — não foram unificadas.

### 6.19 `auditoria_log` (log de auditoria — só ações críticas)
```
id uuid PK, usuario_id uuid references usuarios_perfis(id) on delete set null,
acao text not null, entidade text not null, entidade_id uuid,
detalhes jsonb, created_at timestamptz not null default now()
```
Escopo deliberadamente pequeno (não é trigger de banco pra todo
INSERT/UPDATE/DELETE — decisão consciente, ver histórico da conversa):
gravado via `registrarAuditoria()` (`src/lib/auditoria/registrar.ts`)
chamado à mão dentro de cada server action sensível — hoje `excluirTeste`,
`liberarLaudo`, `aceitarPropostaComoStaff`, `salvarCliente` (só no update).
Nunca deixa a ação principal falhar por erro de log. Só `gerencia` lê
(`select`); não tem UI de consulta ainda, só a tabela.

### 6.20 `servicos` (conteúdo de "Serviços" do site público — CMS da gerência)
```
id uuid PK, slug text unique not null, titulo/resumo/headline/subheadline text not null,
normas/beneficios/entregaveis text[] not null default '{}',
cover_image_url/cover_image_alt text not null, cover_destaque_mosaico boolean not null default false,
galeria jsonb not null default '[]',       -- [{ url, alt, destaque_mosaico }]
metodologia jsonb not null default '[]',   -- [{ titulo, descricao, imagem_url?, imagem_alt? }]
ordem integer not null default 0, publicado boolean not null default true,
exibir_na_home boolean not null default false,  -- 0024, controla a home separado de `ordem`
criado_por/atualizado_por uuid references usuarios_perfis(id),
criado_em/atualizado_em timestamptz not null default now()
```
Substitui o array hardcoded que existia em `src/lib/content/servicos.ts` —
gerenciado em `/painel/servicos` (acesso via `requireArea("site")`, ver
seção 10), alcançado a partir do hub `/painel/site`.
`galeria`/`metodologia` são jsonb (mesmo padrão de `propostas.custos_extras`
e `testes_opacidade.fotos_extras`, seção 6.13/6.14) em vez de tabelas
filhas, porque sempre são lidos/gravados como uma unidade só. RLS: SELECT
liberado pra qualquer staff logado (`get_my_role() is not null`), mutação
só `gerencia`. **A leitura pública (visitante anônimo do site) não usa
RLS** — segue o mesmo padrão de `laudo`/`proposta` (seção 7.1): lê via
`createAdminClient()` no servidor, filtrando `publicado = true`
explicitamente na query (`src/lib/content/servicos.ts:getServicos`/
`getServicoBySlug`/`getMosaicImages`). `slug` é gerado do título ao criar e
fica travado depois (o form não permite editar), pra não quebrar URL/SEO
publicado. Upload de foto (capa, galeria, foto de cada etapa da
metodologia) comprime pra WebP no navegador (`comprimirParaWebp`, mesma
função usada no wizard de teste) antes de subir pro bucket `servicos`.
Como o conteúdo agora é dinâmico, `/servicos/[slug]` deixou de ter
`generateStaticParams` (senão um serviço novo exigiria redeploy pra
existir). **Isso sozinho não bastava**: `(public)/layout.tsx` busca
`servicos`/`dados_empresa` via `createAdminClient()` (não é `fetch()`
nativo, então o Next não detecta a rota como dinâmica sozinho) e o Next
prerenderizava `/`, `/servicos`, `/sitemap.xml` etc. como HTML estático no
build — uma edição no painel não aparecia no site até o próximo deploy.
Corrigido com `export const dynamic = "force-dynamic"` em
`(public)/layout.tsx` (cobre todo o site público, já que o layout busca
dado dinâmico em toda página) e em `src/app/sitemap.ts`. `exibir_na_home`
(migration 0024) é independente de `ordem`: a home mostra os serviços
marcados com a estrela em `/painel/servicos`, não simplesmente os 3
primeiros da lista.

Na home, o bloco "Nossos serviços" (`marketing/servicos-carousel.tsx`,
`ServicosCarousel`) é sempre um carrossel — `embla-carousel-react` +
`embla-carousel-autoplay` (`loop: true`, `duration: 35` pra transição
suave, autoplay a cada 5s com `stopOnInteraction: false`, então a rolagem
automática retoma sozinha depois que a pessoa mexe manualmente). Mostra 1
card por vez no mobile, 2 no tablet (`sm`), 3 no desktop (`lg`) — mesmos
breakpoints das classes `basis-full`/`sm:basis-1/2`/`lg:basis-1/3`. As
setas de navegação são decididas em **CSS puro** (3 variantes, uma por
breakpoint, cada uma condicionada só a `servicos.length` — sem depender de
detectar o tamanho de tela em JS ali) pra não piscar durante a hidratação;
só o autoplay realmente precisa saber o breakpoint em JS
(`useSyncExternalStore` + `matchMedia`, mesmo padrão do relógio da sidebar
do painel), e ativa sempre que sobra serviço fora da vista na tela atual —
não só no mobile.

### 6.21 `dados_empresa` (singleton — 1 linha só)
```
id boolean PK check (id),   -- sempre `true`, trava a tabela em 1 linha
razao_social/cnpj/endereco/telefone text not null,
whatsapp text not null,     -- 0025: dígitos com DDI 55, links tel:/wa.me
dias_alerta_vencimento integer[] not null default '{60,30}',
updated_at timestamptz not null default now()
```
Criada na migration 0015 pro rodapé do PDF de laudo/orçamento
(`src/lib/laudo/gerar-pdf.ts`), com edição em Configurações → aba
"Empresa" (seção 8.8). A migration 0025 acrescentou `whatsapp` — mesmo
telefone da empresa, só que em formato de dígitos (`5531997901568`) em vez
de texto formatado (`(31) 99790-1568`), porque o site público precisa das
duas formas (texto pro cabeçalho/rodapé, dígitos pros links `tel:`/`wa.me`
via `linkWhatsapp()`). RLS: SELECT pra qualquer staff, UPDATE só
`gerencia`. Leitura pública segue o padrão de `servicos`/`laudo`/`proposta`
— `getDadosEmpresa()` (`src/lib/legal/dados-empresa.ts`, retorna
razaoSocial/cnpj/endereco/telefone/whatsapp) usa `createAdminClient()`,
sem RLS pro visitante anônimo. **Dois lugares gravam a mesma linha**: o
form completo em Configurações → Empresa (razão social/CNPJ/endereço/
telefone) e o form simples em `/painel/site` (seção 10, só telefone/
whatsapp — um único campo digitado, o server action `salvarContato` deriva
as duas colunas com `formatTelefone`/`onlyDigits` de
`src/lib/utils/mascaras.ts`, pra nunca ficarem dessincronizadas). Não é
duplicação de dado, é a mesma tabela vista por duas telas com propósitos
diferentes.

`COMPANY` (`src/lib/legal/company-info.ts`) continua com cópia estática de
razão social/CNPJ/endereço (usada em `/termos`, `/privacidade`, `/contato`,
rodapé do site, rodapé de `/sobre` etc. — **não** foram migrados pra
`dados_empresa` nessa rodada, só o rodapé do PDF do laudo
`gerar-pdf.ts` foi tratado, porque `dados_empresa` foi criada
originalmente pra isso; ver seção 10.1 sobre a decisão de deixar o rodapé
legal de `/sobre` estático de propósito) — **não tem telefone/whatsapp**
(removidos de propósito: mudam com frequência, então viraram
`getDadosEmpresa()`, único lugar que os fornece).

### 6.22 `sugestoes` (caixa de sugestões pro desenvolvedor)
```
id uuid PK
usuario_id uuid not null references usuarios_perfis(id) on delete cascade
pagina text not null      -- pathname de onde foi enviada (usePathname())
mensagem text not null
user_agent text           -- navigator.userAgent, capturado no envio
status text not null default 'nova' check in ('nova','em_andamento','feita','ignorada')
observacao text           -- nota livre do superadmin, opcional
criado_em timestamptz not null default now()
```
Migrations `0030` (tabela + `get_my_is_superadmin()`) e `0031` (troca o
`lida boolean` original por `status`/`observacao` — backfill: quem já
estava `lida = true` virou `em_andamento`, o resto `nova`). Botão
flutuante (`Lightbulb`, canto inferior direito, `z-30` — fica atrás de
qualquer overlay de tela cheia como o `campo-wizard.tsx`, `z-50`) em todo
`/painel`, renderizado em `painel/layout.tsx` pra **qualquer pessoa
logada**, não só quem gerencia: `sugestao-button.tsx` abre um dialog com
textarea, captura `pagina` (`usePathname()`) e `user_agent`
automaticamente e chama `enviarSugestao` (`sugestoes/actions.ts`,
`requireAuth()` — sem checar role, é uma caixa de sugestões geral).

**Só quem tem a flag `is_superadmin`** (seção 5, mesma flag da
impersonação — não é área configurável por cargo/pessoa via
`requireArea`) enxerga a lista, em `/painel/sugestoes`
(`requireSuperadmin()`, helper em `src/lib/auth/session.ts`). RLS reforça
isso independente do app: `get_my_is_superadmin()` (função `security
definer`, espelha `get_my_role()`) — quem envia só consegue `insert` da
própria linha (`usuario_id = auth.uid()`), e só superadmin tem
`select`/`update`/`delete`. **Não é um canal de suporte com histórico
visível pra quem enviou** — depois de mandada, a sugestão só existe pro
desenvolvedor; quem mandou não consegue ver nem a própria de novo.
Testado via `set local role authenticated` + `set local
request.jwt.claims` simulando `auth.uid()` de um técnico e de um
superadmin direto no Postgres (dentro de uma transação com `rollback`),
não só pela app.

**`/painel/sugestoes` é um quadro em colunas (estilo kanban), uma por
`status`** (`status-info.ts` centraliza rótulo/cor de cada etapa, `page.
tsx` agrupa por coluna): Nova → Em andamento → Feita → Ignorada, com
contador por coluna. Trocar de coluna é via `Select` dentro do card
(`atualizarStatusSugestao`), não drag-and-drop. Cada card também tem um
campo de observação (`Textarea` controlado + botão "Salvar
observação"/"Cancelar" que só aparece quando o texto muda,
`salvarObservacaoSugestao`) — nota livre só pro desenvolvedor, ex. por
que foi ignorada ou o que foi feito. Contador de `status = 'nova'` vira
badge no item "Sugestões" da sidebar — `painel/layout.tsx` conta antes de
renderizar, só quando `perfil.is_superadmin` (evita a query pra todo
mundo). Trocar status/observação/excluir não chamam `router.refresh()`
explícito — mesmo padrão de `publicar-toggle.tsx` (seção 6.20): chamar a
Server Action direto (não via `<form action>`) já dispara o refresh da
árvore de Server Components depois que `revalidatePath` roda dentro dela.

### Migrations, em ordem (útil pra recriar o histórico exato)
1. `0001_initial_schema.sql` — tudo de 6.1 a 6.16 (menos as colunas
   adicionadas depois).
2. `0002_equipamentos_auditoria.sql` — `criado_por`/`atualizado_por`/
   `atualizado_em` em `equipamentos_teste`.
3. `0003_eventos_agenda.sql` — transforma `agendamentos` em polimórfica
   (tipo evento/teste), cria `agendamento_participantes`, helper
   `pode_ver_agendamento`, reescreve as policies de `agendamentos`.
4. `0004_orcamento_propostas.sql` — `clientes.status`, `cnpj_cpf`/`tipo`
   viram nullable, `propostas.agendamento_id`/`pdf_path`, cria
   `configuracoes_orcamento` (com `valor_servico_padrao` na época).
5. `0005_dp_pessoas.sql` — cria `funcoes` (sem `nivel_acesso` ainda),
   adiciona `funcao_id`/`cpf`/`telefone`/`data_admissao`/`acesso_sistema`
   em `usuarios_perfis`.
6. `0006_tipos_servico_whatsapp.sql` — `agendamentos.whatsapp_contato`,
   cria `tipos_servico` (seed "Opacidade"), remove
   `configuracoes_orcamento.valor_servico_padrao`.
7. `0007_funcao_define_acesso.sql` — `funcoes.nivel_acesso`.
8. `0008_funcoes_unicas.sql` — unique index em `lower(funcoes.nome)`.
9. `0009_funcoes_nome_sem_acento.sql` — troca o unique index por
   `public.nome_normalizado(nome)` (lower + `unaccent`), habilitando a
   extensão `unaccent`.
10. `0010_agendamento_data_hora_fim.sql` — `agendamentos.data_hora_fim`.
11. `0011_kpis_visibilidade.sql` — cria `funcoes_kpis` e `usuarios_kpis`
    (ver 6.18).
12. `0012_categorias_agenda.sql` — cria `categorias_agenda`, adiciona
    `agendamentos.categoria_id` (ver 6.17).
    (0013–0017 existem no repo mas não estão documentados aqui ainda.)
18. `0018_auditoria_log.sql` — cria `auditoria_log` (ver 6.19).
19. `0019_agendamento_tipo_servico.sql` — `agendamentos.tipo_servico_id`
    (ver 6.9) — persiste o tipo de serviço escolhido no agendamento, antes
    só existia como estado local do form.
20. `0020_foto_etiqueta_numero.sql` — `testes_opacidade.foto_etiqueta_numero_path`
    (ver 6.14) — 5ª foto do wizard de campo (seção 8.5), zoom só no número
    do teste pra conferência visual.
21. `0021_responsavel_tecnico_usuario.sql` — `responsaveis_tecnicos.usuario_id`
    (fk pra `usuarios_perfis`, opcional) — liga um responsável técnico a
    uma conta de acesso quando ele também loga no sistema.
22. `0022_superadmin.sql` — `usuarios_perfis.is_superadmin` (ver seção 5).
23. `0023_servicos_cms.sql` — cria `servicos` (ver 6.20), com seed dos 7
    serviços que já existiam em `src/lib/content/servicos.ts`.
24. `0024_servicos_exibir_na_home.sql` — `servicos.exibir_na_home` (ver
    6.20), com os mesmos 3 serviços que já apareciam na home marcados por
    padrão (zero mudança de comportamento no momento da migration).
25. `0025_dados_empresa_whatsapp.sql` — `dados_empresa.whatsapp` (ver
    6.21), backfill a partir do número já usado no site.
26. `0026_pagina_sobre.sql` — cria `pagina_sobre` (ver 10.1), seed com o
    texto que já existia hardcoded em `(public)/sobre/page.tsx`.
27. `0027_pagina_sobre_rich_text.sql` — funde `como_trabalhamos_1`/`_2`
    (ver 10.1) num campo `como_trabalhamos` de HTML só, migrando o
    conteúdo existente sem perder texto.
28. `0028_hero_slides.sql` — cria `hero_slides` (ver 10.2), seed dos 7
    slides que já existiam hardcoded em `marketing/hero.tsx`.
29. `0029_equipamento_selo_imagem.sql` — `equipamentos_teste.selo_imagem_path`
    (ver 6.8) — selo do fabricante usado no PDF do laudo (seção 8.6).
30. `0030_sugestoes.sql` — cria `sugestoes` (ver 6.22) e a função
    `get_my_is_superadmin()`.
31. `0031_sugestoes_status.sql` — troca `sugestoes.lida` (boolean) por
    `status`/`observacao` (ver 6.22), com backfill.

### Storage buckets (criados fora de migration — via dashboard/CLI, não SQL)
- **`laudos`** — público, sem limite de tamanho/mime. `${codigo_publico}.pdf`.
- **`propostas`** — público, mesma config de `laudos`. `${token}.pdf`.
- **`servicos`** — público, mime restrito a `image/webp|jpeg|png`, limite
  10MB/arquivo. Fotos de capa/galeria/metodologia da tabela `servicos`
  (seção 6.20), enviadas pelo painel já em WebP. Também guarda as fotos do
  Hero (seção 10.2) sob o prefixo `hero/` — reaproveitado em vez de criar
  bucket próprio só pra isso.
- **`arquivos-internos`** — **privado**, acesso via signed URL
  (`src/lib/storage/upload.ts:signedUrl`, expira em 1h por padrão). Guarda
  fotos do ensaio, PDF original do Syscon, certificados de calibração,
  imagem de assinatura do responsável técnico, selo do equipamento — nada
  disso é público. `upload.ts` também exporta `baixarArquivoInterno`
  (baixa como `Buffer`) e `detectarTipoArquivo` (sniff por assinatura de
  bytes — `%PDF`/JPEG/PNG/RIFF+WEBP, não confia na extensão do path);
  usados pelo gerador de laudo (seção 8.6) e pela tela de editar
  equipamento, que mostra o certificado/selo já salvos como prévia
  (`FileDropInput` com `previaAtualUrl` — e `previaAtualEhImagem={false}`
  quando o certificado é mesmo um PDF, já que aí não dá pra usar
  `<Image>`) em vez de uma área de upload vazia.

## 7. Estrutura de rotas (App Router)

```
src/app/
  layout.tsx                         # root layout (toploader, cookie banner)
  acesso-negado/page.tsx
  (public)/                          # layout com header/footer institucional (marketing — ver seção 7.1)
    layout.tsx                       # monta as fontes IBM Plex escopadas a .public-shell
    page.tsx                         # home institucional (Hero, serviços, FAQ, avaliações...)
    servicos/page.tsx , servicos/[slug]/page.tsx   # conteúdo vem do banco (tabela servicos, ver 6.20) —
                                       # renderização dinâmica, não SSG
    sobre/page.tsx                   # institucional, texto estático
    contato/page.tsx (+ contact-form.tsx, actions.ts)  # formulário → e-mail via Brevo
    login/page.tsx (+ login-form.tsx)
    esqueci-senha/page.tsx (+ forgot-password-form.tsx)
    redefinir-senha/page.tsx (+ reset-password-form.tsx)
    termos/ , privacidade/ , cookies/  # texto puro
    retestagem/[token]/page.tsx (+ actions.ts)  # solicitação pública de retestagem (ver tabelas
                                       # contatos_retestagem/solicitacoes_retestagem — schema
                                       # ainda não documentado nas migrations 0013–0017, seção 6)
  (documento-publico)/               # layout mínimo próprio (mx-auto, SEM header/footer do site
                                      # institucional) — proposta/laudo são documentos formais, não
                                      # páginas de marketing; moveram de (public)/ pra cá
    layout.tsx
    laudo/[codigo]/page.tsx           # verificação pública de laudo
    proposta/[token]/page.tsx (+ actions.ts)  # verificação/aceite público de proposta
  painel/                            # tudo aqui exige login (layout.tsx faz requireAuth)
    layout.tsx                       # requireAuth + monta navItems + <AgendaNavProvider><Sidebar/>{children}<SugestaoButton/></AgendaNavProvider>
    sidebar.tsx , agenda-nav-context.tsx , logout-button.tsx , loading.tsx
    sugestao-button.tsx               # botão flutuante — qualquer pessoa logada, todo /painel (ver 6.22)
    page.tsx                         # dashboard: cards de KPI (ver 6.18), visibilidade por cargo/pessoa
    agenda/                          # ver seção 8
    clientes/                       # CRUD cliente + veículos/máquinas do cliente
    equipamentos/                   # CRUD equipamentos_teste
    responsaveis-tecnicos/          # CRUD responsaveis_tecnicos
    testes/[testeId]/               # execução do ensaio (ver seção 8.3)
    site/                           # hub "Gerenciamento do site" (ver seção 10), gerencia-only
    servicos/                       # CRUD da tabela servicos (ver 6.20) — aberto a partir de /painel/site,
                                     # não tem item próprio na sidebar
    dp/                              # RH — ver seção 9
    configuracoes/                  # abas: Orçamento (valor/km, fator, tipos de serviço) | Visibilidade e acesso (KPIs por cargo) | Empresa (razão social/CNPJ/endereço/telefone, ver 6.21/8.8)
    sugestoes/                      # inbox de sugestões (ver 6.22) — só na sidebar quando is_superadmin
```

Todo diretório de página tem seu `loading.tsx` (usa
`src/components/skeletons.tsx`: `ListPageSkeleton`, `DetailPageSkeleton`,
`FormPageSkeleton`) — **convenção obrigatória do projeto**, sem isso a
navegação entre páginas parece travada (Next.js não tem o que mostrar
enquanto busca dados do Server Component de destino).

### 7.1 Site público — marketing (`src/app/(public)/`, `src/components/marketing/`)

Reformulado a partir do site institucional antigo (WordPress/Elementor,
`greenproject.com.br`) — várias decisões abaixo replicam ou adaptam o que
já existia lá.

- **Tipografia própria, escopada** — `(public)/layout.tsx` carrega IBM
  Plex Sans / Sans Condensed / Mono via `next/font/google` e expõe as
  variáveis CSS só dentro de `.public-shell` (classe na raiz do layout).
  `globals.css` redefine `--font-sans`/`--font-heading`/`--font-mono`
  dentro desse escopo — o `/painel` continua em Geist, sem mudar. Regra
  do projeto: qualquer estilo pensado só pro site público deve ficar
  escopado a `.public-shell`, nunca mudar token global.
- **`src/lib/content/servicos.ts`** — desde a migration 0023 (ver 6.20),
  lê a tabela `servicos` no Postgres (`getServicos`, `getServicoBySlug`,
  `getMosaicImages`), **não é mais um array hardcoded**. Gerenciado pela
  gerência em `/painel/servicos` (`canGerenciarSite`, ver seção 10), com
  upload de foto convertido pra WebP no navegador. Seed inicial (migration 0023)
  reproduziu os **7 serviços** que existiam no array antigo; Opacidade e
  Líquido Penetrante tinham fotos 100% reais de campo (3 cada). Transporte
  Escolar, Treinamento PEMT e Apreciação de Risco NR-12 têm cover real mas
  foram criados a partir do texto das páginas antigas (adaptado, não
  copiado literal). **Reclassificação de Sinistros** e **Vistoria de
  Máquinas em Mineradoras** ainda usam fotos de banco de imagens (mesmas
  do site antigo) — a empresa nunca teve foto de campo própria pra esses
  dois; a gerência pode trocar a qualquer momento pelo painel, sem deploy.
  **`getMosaicImages` intercala 1 foto por serviço a cada rodada** (não
  pega as N primeiras na ordem de `ordem`) — bug corrigido depois que a
  gerência relatou que marcar destaque num "4º serviço" não tinha efeito:
  com Opacidade e Líquido Penetrante sozinhos já somando 5 fotos marcadas
  (o limite do mosaico), qualquer outro serviço nunca ganhava vaga. Não
  era a marcação sendo desfeita — ela persistia certinho no banco — só
  nunca aparecia. O round-robin garante que todo serviço com pelo menos
  1 foto marcada entra antes de qualquer serviço "duplicar" com uma 2ª.
- **`Hero` (`marketing/hero.tsx`)** — carrossel de fundo com 1 slide por
  serviço (`SLIDES`, mesmo array que gera os cards), migração
  automática a cada `SLIDE_INTERVAL_MS` (5s), pausada se
  `prefers-reduced-motion`. Cada slide anima `x` (translação
  direita→esquerda) + `opacity` via `motion`/framer-motion, texto do
  serviço num painel escuro com blur sobreposto (garante contraste
  independente da foto de fundo). Slides com `cta` (todos os 7 hoje, já
  que todos têm página própria) mostram descrição curta + botão "Saiba
  mais" linkando pro `/servicos/[slug]`.
  - **Armadilha resolvida**: como os 7 slides ficam todos montados no DOM
    ao mesmo tempo (só a opacidade/posição muda, pra não recarregar
    imagem a cada troca), qualquer `<div>` decorativo por cima (os
    degradês de overlay, o painel de conteúdo do texto principal) precisa
    de `pointer-events-none` explícito — senão ele intercepta o clique do
    botão "Saiba mais" mesmo estando visualmente "vazio" ali. Regra: todo
    elemento puramente decorativo (`aria-hidden`) ou área vazia de um
    container `w-full`/`inset-0` empilhado por cima de conteúdo
    clicável **precisa** de `pointer-events-none`.
- **`ReviewsSection` (`marketing/reviews-section.tsx`)** — widget de
  avaliações do Trustindex (`cdn.trustindex.io/loader.js?<id>`, mesmo ID
  de conta do site antigo). Só carrega o script (`next/script`,
  `strategy="lazyOnload"`) se o visitante aceitou "todos os cookies" no
  banner (`getCookieConsent()`/evento `gp-cookie-consent-changed` de
  `cookie-consent-banner.tsx`) — senão mostra um convite pra ativar.
  `globals.css` esconde `body > .ti-widget`/`.ti-widget-container`: a
  conta do Trustindex também tem um widget "flutuante" (bolha de review
  recente) que o script sempre pendura direto no `<body>`, independente
  de onde o embed foi colocado — a regra CSS mira só esse (filho direto
  de `body`), não afeta o carrossel normal (que fica aninhado dentro da
  seção).
- **WhatsApp como CTA principal** — `linkWhatsapp(telefone, texto)` e
  `montarTextoOrcamentoWhatsapp` (`src/lib/orcamento/texto-whatsapp.ts`,
  já usados no painel — seção 8.4) são reaproveitados no site público:
  botão flutuante (`whatsapp-float-button.tsx`, todas as páginas),
  hero, CTA final da home e `/contato`. Número vem de
  `COMPANY.whatsapp` (`src/lib/legal/company-info.ts`, lê
  `WHATSAPP_NUMERO`).
- **Sem botão "Entrar" visível** — decisão deliberada: login é só pra
  equipe/dono, não faz sentido cliente ver. `/login` continua acessível
  por URL direta, só não tem mais link no header público
  (`public-header.tsx`).
- **Logo** (`public/brand/logo.png`) precisa ser genuinamente
  transparente (não branco opaco disfarçado) — já houve bug assim antes;
  ao trocar o arquivo, checar `identify -format "%[opaque]"` e limpar
  `.next/dev/cache/images` se o navegador continuar mostrando a versão
  antiga (cache do otimizador de imagem do Next, não do arquivo em si).

## 8. Módulo Agenda (`src/app/painel/agenda/`) — o coração do sistema

### 8.1 Calendário — estado local, sem round-trip a cada navegação
- `page.tsx` (Server Component): lê `searchParams.view`/`searchParams.data`
  só pra saber **o que buscar no primeiro load**. Em vez de buscar só o
  intervalo da visão (como a visão Ano já fazia), busca **o ano inteiro**
  de `dataRef` de uma vez (`query.ts`, `buscarAgendamentosDoAno` — mesma
  função usada depois no client) e passa pra `agenda-calendario.tsx` como
  `agendamentosDoAno`/`anoInicial`.
- `agenda-calendario.tsx` (Client Component, `AgendaCalendario`) é dono de
  **todo** o estado de navegação: `visao`/`dataRef` em `useState` (não
  mais em `searchParams`), e um cache `{ [ano]: AgendamentoItem[] }`
  também em `useState`, seedado com o ano inicial. Trocar de
  dia/semana/mês/ano dentro do **mesmo ano já carregado** é só um
  `useMemo` local — zero rede. Só busca de novo (`garantirAno`, client
  Supabase) quando a navegação cruza pra um ano ainda não cacheado, e
  guarda o resultado pra nunca mais buscar aquele ano. A URL continua
  espelhando `?view=&data=` (deep link/compartilhamento), mas via
  `window.history.replaceState` direto — **nunca** `router.push`/`replace`
  do Next, porque isso re-executaria o Server Component da página a cada
  clique de período (foi o bug original que motivou essa reescrita).
  Depois de criar/editar/excluir algo, `recarregarTudo()` refaz
  `buscarAgendamentosDoAno` pra **todos** os anos já em cache (client-side,
  sem navegação) em vez de tentar calcular exatamente o que mudou.
- Feriados vêm de `src/lib/feriados.ts` — **calculados por algoritmo**
  (fixos + móveis via cálculo de Páscoa/Computus), não cadastrados
  manualmente — e desde essa reescrita são computados **no client**
  (função pura, sem custo de fetch) em vez de vir como prop do servidor.
- Multi-dia: um evento com `data_hora`/`data_hora_fim` em dias diferentes
  aparece **em cada dia do intervalo** (expansão via `eachDayOfInterval`,
  capada em 60 dias por segurança), não só no dia inicial — vale tanto pro
  grid (Mês/Semana/Dia) quanto pras bolinhas do mini calendário (8.1.1) e
  pro filtro "Agenda do período" (que usa sobreposição de intervalo, não
  só a data de início).
- Toolbar (dentro de `AgendaCalendario`, `sticky top-0`) em 3 linhas:
  título "Agenda {ano} – {período}" (ano/rótulo tiram o ano quando o
  período já mostra, ver `rotuloPeriodo`); depois abas
  Dia/Semana/Mês/Ano + navegação `‹ Hoje ›` (o botão "Hoje" sempre manda
  pra visão **Dia**, não só muda a data, senão não dava nenhum retorno
  visual claro se já se estava na visão errada); depois busca + "Ver
  lista" (scroll suave até a seção "Agenda do período") + Imprimir +
  Criar. "Hoje" (dia real) é destacado em **azul** em todo canto do
  calendário (mini calendário, Mês, Semana, Ano) — cor reservada só pra
  isso, distinta do verde da marca (usado pra "selecionado"/ações). Visão
  Dia mostra uma **linha vermelha do horário atual** (só quando `dataRef`
  é hoje), reativa a cada 30s via `useSyncExternalStore` (mesmo padrão do
  relógio da sidebar, 8.1.1 — evita warning de hidratação porque o
  snapshot do servidor é `null` e bate com o primeiro render do client).

### 8.1.1 Mini calendário + categorias na sidebar (`AgendaNavContext`)
`Sidebar` (em `layout.tsx`) e `AgendaCalendario` (na página) são
**irmãos**, não pai/filho — precisam de estado compartilhado pra o mini
calendário da sidebar refletir/alterar o dia selecionado na Agenda em
tempo real. Ponte: `src/app/painel/agenda-nav-context.tsx`
(`AgendaNavProvider`, envolve `<Sidebar/>{children}` em `layout.tsx`):
- `estado` (dataRef, dias com evento, callback de seleção, callback de
  "garantir ano carregado") — **registrado por `AgendaCalendario`** via
  `useEffect` a cada mudança, lido pela `Sidebar`. `null` fora da Agenda.
- `categoriasOcultas`/`alternarCategoriaOculta` — o inverso: a `Sidebar`
  altera, `AgendaCalendario` lê (filtra `agendamentosVisiveis` antes de
  qualquer outro cálculo). Só de sessão (não persiste — evitar
  `localStorage` no `useState` inicial, que divergiria do HTML do server).
- `categoriasVersao`/`notificarCategorias` — contador que
  `AgendaCalendario` incrementa dentro de `recarregarTudo()`, pra avisar a
  lista de categorias da sidebar (componente separado, com seu próprio
  fetch) que uma categoria nova pode ter sido criada (ex.: a pessoal
  automática) e precisa recarregar.

Quando `pathname` começa com `/painel/agenda`, `Sidebar` troca a lista de
navegação normal por: link "← Voltar ao menu" (pra `/painel`, com
`useTransition` pra dar feedback instantâneo — spinner no lugar do ícone —
já que o clique some da tela até o servidor responder, e navegação no
painel paga um round-trip de auth real por request no middleware),
`MiniCalendario` (`agenda/mini-calendario.tsx` — navega mês
independente da visão principal; clicar num dia sempre manda pra visão
Dia) e `CategoriasFiltro` (`agenda/categorias-filtro.tsx` — lista as
`categorias_agenda`, cada uma com uma caixinha colorida que
mostra/esconde ela no calendário, e um "+" que cria uma nova na hora,
nome + cor da paleta fixa).

### 8.1.2 Busca (`agenda/busca-agenda.tsx`)
Lupa na toolbar: digitar (debounce 300ms, mín. 2 chars) busca **direto no
banco** (`agendamentos.select(...).or("titulo.ilike...,nome_contato.ilike...")`,
client Supabase — não fica presa aos anos já carregados no cache local).
Mostra até 15 resultados (título ou nome do contato + data); clicar num
resultado chama `irPara("dia", data)`, não abre o item direto.

### 8.2 Criar/editar: evento livre × teste de opacidade (mesmo formulário)
`evento-form.tsx`, dentro do modal (`criar-modal.tsx` — aberto por
"Criar", clique num dia vazio, ou clique num horário vazio na visão
Dia/Semana): pills "Evento"/"Teste" (Teste só visível/marcável por quem
`canGerenciarClientes`) alternam dois conjuntos de campos no **mesmo**
`<form>`, organizados em seções com ícone da marca à esquerda (padrão
visual do modal, componente interno `Secao`):

- **Evento** → cria `agendamentos.tipo='evento'`. Campos: título;
  **início/fim** (data+hora separados, não um único `datetime-local` — fim
  some junto quando o usuário muda o início, sempre 1h de duração por
  padrão, até o usuário mexer no fim manualmente); checkbox **"Dia
  inteiro"** (esconde os campos de hora, submete `00:00`/`23:59` por baixo
  — nenhuma coluna nova, é só convenção de horário); **"Repetir"**
  (não se repete / diária / semanal / todo dia útil / mensal / anual +
  "até quando") — ao salvar, `criarEvento` **materializa cada ocorrência
  como uma linha própria** em `agendamentos` (não existe conceito de
  "série" no banco — editar/excluir depois é sempre uma ocorrência por
  vez), capado em 52 ocorrências por criação; categoria (`CategoriaPicker`,
  8.2.1); descrição; participantes (`AttendeePicker`). Qualquer staff
  logado pode criar.
- **Teste** (pipeline comercial, só `escritorio+`): nome do contato,
  WhatsApp **e/ou** telefone (só um dos dois é obrigatório — WhatsApp
  primeiro no formulário por ser o principal meio de contato; o server
  action usa o WhatsApp como telefone quando o campo de telefone fica em
  branco, pra satisfazer a constraint do banco que exige
  `telefone_contato`), início/fim + "Dia inteiro" (mesmos campos do
  Evento; **sem** "Repetir" aqui — decisão deliberada, repetir um teste
  implicaria decidir se gera cliente/proposta novos por ocorrência ou
  reaproveita, e isso ainda não foi definido), categoria, então:
  1. Tipo de serviço (`Select` de `tipos_servico` — ao trocar, preenche
     "Valor do serviço" com o valor daquele tipo).
  2. CEP (máscara `00000-000`) — **busca o endereço automaticamente assim
     que completa os 8 dígitos** (não espera `onBlur`), via BrasilAPI
     (`src/lib/geo/cep.ts`, `https://brasilapi.com.br/api/cep/v2/{cep}`,
     grátis/sem chave). Preenche logradouro/bairro/cidade/UF num campo de
     endereço editável.
  3. Se a BrasilAPI devolveu latitude/longitude do CEP: calcula a
     distância **em linha reta** (haversine,
     `src/lib/geo/distancia.ts`) entre essas coordenadas e uma constante
     `COORDENADAS_EMPRESA` (geocodificada uma vez, a partir do endereço
     fixo da empresa), multiplicado por 2 (ida+volta) e pelo
     `fator_correcao_distancia` de `configuracoes_orcamento` (aproxima de
     rota real; BrasilAPI nem sempre devolve coordenada — quando não
     devolve, um campo de km manual aparece). Distância exibida formatada
     em pt-BR (`2.260,4 Km`).
  4. Orçamento ao vivo: `valor_km`/`valor_servico` pré-preenchidos (mas
     editáveis) com `MoedaInput` (8.2.2 — mesmo componente em todo campo
     de dinheiro do sistema), `pedagio`/`alimentacao` sempre digitados na
     hora, total recalculado a cada mudança (`calcularValorTotal`).
  - **Ao salvar** (Server Action `criarEvento` em `agenda/actions.ts`,
    ramo teste):
    1. Cria `clientes` com `status='pendente'` (só nome+telefone).
    2. Cria `agendamentos` (`tipo='teste_opacidade'`, liga ao cliente
       pendente, guarda contato/endereço/tipo de serviço/categoria).
    3. Cria `propostas` (token aleatório de 12 chars, mesma lógica de
       `gerarCodigoPublico` do laudo) com os valores calculados.
    4. Liga `agendamentos.proposta_id`.
    5. Redireciona pra `/painel/agenda/{id}` (a "central" do agendamento).

Nenhuma das duas ações de criar **evento** redireciona mais (só a de
teste, que tem uma página própria pra ir) — evento fecha o modal e chama
`recarregarTudo()`, porque redirecionar pra `/painel/agenda` sem
query params resetava a visão/data que o usuário estava vendo (o mesmo
motivo por trás de tirar `router.push` da navegação em 8.1).

#### 8.2.1 Categoria (`categorias_agenda`, ver 6.17)
`CategoriaPicker` (`agenda/categoria-picker.tsx`): bolinhas de cor
clicáveis (categorias existentes, busca client-side ao montar) + "×" pra
"sem categoria" + "+ Nova categoria" (nome + paleta fixa
`CORES_AGENDA`, `agenda/cores.ts` — insert direto client-side, sem
Server Action). Se o form for salvo sem nenhuma categoria escolhida,
`criarEvento`/`atualizarEvento` chamam `obterOuCriarCategoriaPessoal`
(get-or-create pelo nome da pessoa, cor por hash do `usuario_id`) — **todo
evento sempre acaba com uma categoria**, nunca fica em branco.

#### 8.2.2 `MoedaInput` (`src/components/moeda-input.tsx`)
Campo de valor "estilo caixa eletrônico": só aceita dígitos digitados,
tratados como centavos — digitar 1, 2, 5 vira 0,01 → 0,12 → 1,25 (extrai
todos os dígitos do valor exibido a cada `onChange`, ignora onde estava o
cursor). Prop `value`/`onChange` continuam em decimal (`"1.25"`, não
centavos) pra bater com `Number(formData.get(...))` no server; o valor
decimal vai num `<input type="hidden">` interno, então participa do
`FormData` do form ao redor normalmente. **Usado em todo campo monetário
do sistema** (é regra, não só da Agenda — ver 10.10): valor por km,
valor do serviço, pedágio, alimentação (dentro do modal de teste),
"Valor padrão por km" e "Valor" de cada tipo de serviço (Configurações,
seção 8.8).

### 8.3 Ver/editar/excluir um evento — modal, não página
Clicar num evento (chip no Mês, card na Semana/Dia, faixa multi-dia, ou
linha em "Agenda do período") abre `ver-evento-modal.tsx`
(`VerEventoModal`) **no lugar** de navegar — só o tipo `teste_opacidade`
ainda vai pra uma página própria (`agenda/[id]/page.tsx`, seção 8.4, que
tem o pipeline comercial inteiro). O modal abre **travado** (resumo:
quadrado da cor da categoria + título + período, sem os campos de
formulário) com ícones de lápis (editar) e lixeira (excluir,
`ConfirmDeleteButton`) no canto — só aparecem pra quem `criado_por` é a
própria pessoa. "Editar" troca pro formulário de verdade (mesmos campos
do criar, sem repetir/dia-inteiro-toggle) com Salvar/Cancelar.
`atualizarEvento`/`excluirEvento` (`agenda/actions.ts`) **não
redirecionam** (mesma lógica da nota no fim de 8.2) — só `revalidatePath`;
quem fecha o modal e atualiza o cache local é o client
(`onAlterado={recarregarTudo}`). A página `agenda/[id]/page.tsx` pro tipo
`evento` continua existindo só como **visualização de link direto**
(sem editar/excluir ali) — na prática só é alcançada digitando/salvando a
URL, o fluxo normal é sempre pelo modal.

### 8.3.1 Grade Semana/Dia: cards posicionados por horário
Reescrita pra virar uma grade de horário de verdade (`ColunaDia` — usada
tanto pela visão Dia, uma coluna, quanto pela Semana, 7 colunas lado a
lado com um eixo de hora comum, `GutterHoras`): cada evento vira um card
`absolute`, `top`/`height` calculados a partir do horário real
(`ALTURA_HORA_PX = 56` por hora, `layoutEventosDoDia`), não uma lista
dentro da hora. Sobreposição: `layoutEventosDoDia` agrupa em "clusters"
de eventos que se tocam no tempo e empacota cada um numa coluna (mesmo
algoritmo greedy do Google Agenda — primeira coluna livre, ou abre uma
nova), todos ficam lado a lado e clicáveis. Eventos multi-dia **ou**
"dia inteiro" (`ehDiaInteiro`/`vaiNaFaixaSuperior`) não entram nesse
grid — viram uma **faixa** no topo (`BannerMultiDia`), com `clip-path`
em forma de seta nas pontas que continuam pro dia anterior/seguinte
(sem seta = arredondado, com seta = ponta reta) — na Semana, cada faixa
ocupa as colunas certas via CSS Grid (`gridColumn`) e empilha em linhas
extra quando duas se sobrepõem (`empilharFaixas`, mesma ideia de
clusters, só que por linha em vez de coluna).

### 8.4 Central do teste (`agenda/[id]/page.tsx`)
- Se `tipo='evento'`: só o fallback de link direto citado em 8.3 (leitura
  simples — título, data, descrição, participantes). O fluxo normal de
  ver/editar/excluir evento é o modal.
- Se `tipo='teste_opacidade'`: mostra contato, endereço, proposta (valor,
  status, botão **"Enviar por WhatsApp"** — deep link `wa.me/{DDI+numero}`
  usando `whatsapp_contato` ou `telefone_contato`, com fallback pro
  `wa.me/?text=` genérico se não tiver número — **nunca** integração de
  API paga de WhatsApp, é sempre um link `wa.me`), e link pra "Ver página
  pública" (`/proposta/{token}`).
  - **Card de contato é editável in-line** (`contato-agendamento-card.tsx`,
    lápis visível só pra quem tem `canGerenciarClientes` — mesmo gate de
    `podeGerenciar` no resto da página): clique abre nome/telefone/
    WhatsApp num form curto, `atualizarContatoAgendamento` (`agenda/
    actions.ts`) grava só esses 3 campos (`.eq("tipo", "teste_opacidade")`
    por segurança). Corrige erro de digitação sem reabrir o fluxo inteiro
    de agendamento — não mexe em data, endereço, veículo ou proposta.
    Mesma regra de obrigatoriedade da criação: telefone **ou** WhatsApp,
    não os dois.
  - Se `escritorio+` e cliente ainda `pendente`: link "Completar cadastro
    do cliente" → tela de edição de cliente já existente (`clientes/[id]/
    editar`) — preencher CNPJ/CPF válido ali já marca o cliente como
    `status='completo'` (é o próprio `salvarCliente` que seta isso, sem
    tela nova).
  - Depois de completo, sem veículo ainda vinculado: seletor dos veículos
    do cliente (ação `vincularVeiculo`) ou link pra cadastrar um novo.
  - Depois de veículo vinculado: botões **"Emitir proposta em PDF"**
    (`emitirPropostaPdf` — gera PDF análogo ao do laudo, sobe pro bucket
    `propostas`) e **"Iniciar execução do teste"** (`iniciarExecucaoTeste`
    → cria/acha a linha em `testes_opacidade` e redireciona pra
    `/painel/testes/{testeId}`, começando o fluxo da seção 8.4 — ou seja,
    "executar" só é possível depois que cliente+veículo estão completos).

### 8.5 Execução do teste (`painel/testes/[testeId]/`)
Fluxo em 3 etapas, sem bloqueio rígido de campo entre elas — com uma
exceção deliberada (especificação do motor, ver abaixo) além do botão
final de "Liberar":
1. **Campo** (`campo-wizard.tsx` → `salvarCampo`): fluxo em tela cheia
   (`fixed inset-0`, cobre até a sidebar), um passo por vez — pensado pra
   reduzir erro humano no celular. Tela de preparo: escolhe o equipamento
   e resolve a **especificação do motor** (marcha lenta/rotação de
   corte/limite de opacidade) — três desfechos possíveis, via
   `CardEspecificacaoMotor`: já cadastrada no veículo (nada a fazer),
   cadastrar ali mesmo (mini-form próprio, `EspecificacaoMotorFields`
   reaproveitado do `VeiculoForm`, chama `salvarEspecificacaoMotorDoTeste`
   — vincula ao veículo via `especificacoes_motor` e já preenche os
   limites deste teste), ou declarar "já configurei no aparelho/app do
   Syscon" (`marcarEspecificacaoMotorViaDispositivo`, marca
   `testes_opacidade.especificacao_motor_via_dispositivo` — é só uma
   promessa, conferida depois no backfill de `importarPdfSyscon` e, por
   último, na trava de `liberarLaudo`). **"Concluir campo" fica desabilitado**
   (e `salvarCampo` rejeita no servidor, mesma checagem espelhada) até um
   dos três estar resolvido — motivo: esses limites só existiam antes se
   alguém já tivesse cadastrado o motor dentro do app/dispositivo do
   Syscon, um cadastro paralelo sem histórico neste sistema; virou etapa
   explícita do processo, feita pelo escritório (cadastro do veículo,
   `VeiculoForm`) ou pelo técnico em campo. Depois disso: 5 fotos
   obrigatórias em sequência (frente/traseira/painel/etiqueta
   completa/etiqueta só o número — convertidas pra WebP no browser antes
   do upload, `src/lib/utils/image-to-webp.ts`) pro bucket privado
   `arquivos-internos`, barra de progresso no topo. Os 5 `FileDropInput`
   ficam todos montados o tempo todo (só escondidos via CSS fora do passo
   atual) — mantém o arquivo escolhido sem duplicar estado; a etiqueta do
   número existe só pra conferência visual (o número continua digitado à
   mão). Tela final de conferência junta as 5 fotos + número do teste +
   fotos extras opcionais (e o card de especificação do motor de novo, se
   ainda não resolvido) antes de enviar. Status vira `aguardando_pdf_syscon`.
2. **Importar PDF do Syscon** (`import-syscon-form.tsx` →
   `importarPdfSyscon`, só quem `canImportarPdfSyscon`): sobe o PDF
   exportado pelo equipamento Syscon, `src/lib/syscon/parse-ensaio.ts`
   faz o parsing (extrai número do ensaio, opacidade por ciclo, média
   K m⁻¹, resultado aprovado/reprovado), confere se o número bate com o
   digitado em campo, grava as `testes_opacidade_medicoes`. Também extrai
   os limites que o próprio opacímetro já traz no PDF pra aquele ensaio
   ("Limite Marcha Lenta: 800 - 900", "Limite Rotação Corte: 4100 - 4300",
   "Limite Opacidade: 1,19", "Km Atual: 51319") e grava em
   `testes_opacidade` (`limite_marcha_lenta_min/max`,
   `limite_rotacao_corte_min/max`, `limite_opacidade`, `km_atual` —
   migration `0032_limites_teste_syscon.sql`); se o PDF não trouxer algum
   (ex.: cadastro no Syscon ficou incompleto), cai pro cadastro do veículo
   (`especificacoes_motor`, mesma regra de `resolverLimitesTeste` — ver
   `src/lib/laudo/limites-teste.ts`), populado desde a etapa de Campo (ver
   item 1). Usa o limite de rotação de corte como `rotacao_corte` de cada
   `testes_opacidade_medicoes` também (o PDF não traz esse valor por
   ciclo, só o limite geral do ensaio). Status vira `aguardando_revisao`.
   **`liberarLaudo` bloqueia** (erro explícito) se `resolverLimitesTeste`
   (PDF + cadastro do veículo, nenhuma das duas fontes) não resolver todos
   os 5 valores — sem eles não dá pra emitir o laudo; `devolverRevisao`
   limpa tudo de novo pra reimportar (inclusive
   `especificacao_motor_via_dispositivo`, volta a `false`).
3. **Validar teste / liberar laudo** (`page.tsx`, `RevisaoSection` →
   `liberar-form.tsx` → `liberarLaudo`, só `canRevisarELiberarLaudo` =
   gerência): a tela "aguardando revisão" mostra uma **prévia do
   documento** (`laudo-preview-card.tsx`, `LaudoPreviewCard` — todos os
   campos do laudo de referência do cliente: dados do veículo/proprietário
   em grade com borda (contratante, CNPJ/CPF, marca/modelo, placa, ano,
   chassi, renavam, combustível, endereço, telefone), fotos grandes do
   ensaio com legenda, tabela de medições, dados do opacímetro (incluindo
   o certificado de calibração do INMETRO já anexado no cadastro do
   equipamento — `equipamentos_teste.pdf_certificado_calibracao_path`,
   mesmo arquivo mesclado no PDF final pelo `gerar-pdf.ts` — mostrado
   clicável via `PdfPreview` com `size="lg"`), texto de conclusão idêntico
   ao do PDF — ver `src/lib/laudo/texto-conclusao.ts`,
   fonte única compartilhada com `gerar-pdf.ts`) com um link "Editar dados
   de campo" que pula pro card `campo-edit-form.tsx` já existente acima
   (`href="#dados-campo"`, sem duplicar o form; some quando
   `mostrarEditar=false`, ver 8.4.1). A mesma `LaudoPreviewCard` é
   reaproveitada no laudo já emitido — não é recomputada do zero em cada
   lugar; só ali (`props` opcionais `numero`/`dataEmissao`/`responsavel`)
   é que mostra o bloco "Responsável técnico" (nome, formação, registro no
   conselho, contato de `responsaveis_tecnicos`), porque só depois de
   liberado o `responsavel_tecnico_id` é definitivo — antes disso ainda
   está sendo escolhido no form abaixo. Escolhido o responsável técnico, o
   botão **"Validar
   teste"** abre um diálogo de confirmação (`LiberarForm`, componente
   client) mostrando o resultado (APROVADO/REPROVADO) e perguntando se
   quer já mandar cópia por e-mail pro cliente:
   - **"Não, só validar"** — chama `liberarLaudo` com
     `enviar_email=false`.
   - **"Sim, validar e enviar"** (desabilitado se o cliente não tem
     e-mail cadastrado) — mesma chamada com `enviar_email=true`.

   `liberarLaudo` gera `numero` sequencial (`"{count+1}/{ano de 2
   dígitos}"`, contando linhas de `laudos` — não é à prova de race
   condition, é aceitável pro volume da empresa), gera `codigo_publico`
   aleatório (12 chars, alfabeto sem caracteres ambíguos, agrupado em
   blocos de 4 com `-`), monta o PDF (`src/lib/laudo/gerar-pdf.ts`, ver
   8.5), sobe pro bucket `laudos`, insere a linha em `laudos`, marca
   `testes_opacidade.status='aprovado'` e `agendamentos.status='concluido'`.
   Se `enviar_email=true`, tenta enviar em seguida via
   `enviarLaudoPorEmail` (`src/lib/laudo/enviar-email.ts`, mesmo helper
   usado pelo botão manual "Enviar por e-mail" da seção 8.4.1) — **best
   effort**: falha de envio (ex.: sem e-mail cadastrado) não desfaz a
   liberação, já que o laudo já foi emitido de verdade; o diálogo mostra
   se o envio deu certo ou não, e o botão manual continua disponível
   depois pra tentar de novo.

Com o laudo liberado, `EnviarLaudoEmailButton` (`testes/[testeId]/`) chama
a Server Action `enviarLaudoEmail` (`testes/actions.ts`) e manda o PDF por
e-mail pro cliente via Brevo (`enviarEmail`, seção 2/3) — complementa o
envio por WhatsApp que já existia pra proposta (seção 8.4), agora cobrindo
o laudo em si pelos dois canais.

Dados de campo (número do teste, equipamento, fotos) ficam editáveis
depois de enviados, enquanto o laudo não é liberado — `campo-edit-form.tsx`
→ `editarCampo` (não mexe em `status`, fotos são opcionais na edição, só
troca a que vier preenchida — upload sobrescreve o mesmo path de sempre).
Bloqueado quando `status='aprovado'` (laudo já é documento oficial
emitido). Acessível também pelos subpassos da execução em
`agenda/[id]/page.tsx` (ver nota do stepper na seção 11.14).

Fotos em qualquer tela de teste (dados de campo, arquivos extras da
revisão) aparecem como miniatura clicável de 64px
(`FotosPreviewGrid`/`FotoPreview`, `src/components/foto-preview.tsx`) que
abre um modal grande — nunca link de texto abrindo em nova aba. A prévia
do laudo (acima) usa a mesma `FotoPreview` com `size="lg"` (grade de 3
colunas, foto grande com legenda embaixo) pra imitar o layout de 3 fotos
da capa do PDF — não a miniatura pequena, que ali ficaria ilegível.

### 8.4.1 Laudo emitido — compartilhar com o cliente (`EmitidoSection`, `page.tsx`)
Depois de liberado, a tela mostra nº do laudo, validade (1 ano da
emissão, `diasRestantes`/badge de vencimento) e botões: **Enviar por
WhatsApp** (`wa.me`, mesmo padrão da seção 8.4), **Enviar por e-mail**
(`enviar-laudo-email-button.tsx` → `enviarLaudoEmail`, usa o mesmo
`enviarLaudoPorEmail` do envio automático na validação — via Brevo,
`src/lib/email/enviar.ts`; exige `clientes.email` preenchido, senão
mostra erro), **Visualizar laudo** (`visualizar-laudo-button.tsx`,
`VisualizarLaudoButton` — Client Component só com o botão/diálogo em
volta; recebe a `LaudoPreviewCard` (Server Component) já renderizada via
`children`, sem precisar rebuscar dados no client, e mostra o mesmo
documento da revisão, só que com `mostrarEditar={false}` — pra ver o
laudo sem precisar baixar o PDF), **Baixar PDF** e link pra "Página de
verificação" (`/laudo/{codigo_publico}`).

Da tela "aguardando revisão", `DevolverRevisaoButton` →
`devolverRevisao` (só `canRevisarELiberarLaudo` = gerência) devolve o
teste pro escritório (`aguardando_pdf_syscon`, reimportar PDF) ou pro
técnico (`aguardando_execucao`, refazer campo) quando algo está errado —
sempre descarta `resultado`/`media_m1`/`pdf_ensaio_original_path` e as
`testes_opacidade_medicoes`, já que um PDF novo vai substituir tudo isso
de qualquer jeito.

### 8.6 PDF do laudo (`src/lib/laudo/gerar-pdf.ts`)
**Páginas 1 (capa) e 2 (ensaio) são sempre desenhadas por nós**
(`jspdf`/`jspdf-autotable`), com dados vindos do banco — nunca do PDF cru
exportado pelo Syscon. Isso já era a regra pros dados de *medição*
(`src/lib/syscon/parse-ensaio.ts` já tinha o comentário "só lê dados de
medição — não dados cadastrais de cliente/veículo, que já existem nesta
plataforma"), mas até uma rodada anterior a página 2 do PDF final
**mesclava** o arquivo cru do Syscon como veio — e esse arquivo tem sua
própria seção "Dados do Veículo"/"Dados do Cliente" digitada por quem
operou o opacímetro no campo, que pode estar errada ou desatualizada
(reaproveitar o aparelho de um teste anterior sem trocar os dados nele,
por exemplo). Um cliente reclamou de uma divergência assim, e a página 2
passou a ser redesenhada com os mesmos dados cadastrais confiáveis da
capa, mais o que é específico do ensaio.

**A estrutura visual da página 2 imita a organização do relatório do
Syscon** (Dados do Veículo → Dados do Cliente → Dados do Ensaio →
medições → Resultado → Dados do Opacímetro/Software, com títulos em
negrito e divisórias finas — `tituloSecaoEnsaio`/`linhaEnsaio`/
`divisorEnsaio`, helpers locais só usados nessa página) — **não** usa o
estilo de barra verde/grade com borda da capa (`barraSecao`/`blocoGrid`).
Primeira tentativa de corrigir a fonte dos dados trocou a estrutura
inteira pro estilo da capa; pedido explícito da gerência foi manter a
organização antiga (a mesma do Syscon) e só trocar de onde os valores
vêm — layout são dois estilos deliberadamente diferentes dentro do mesmo
documento, não inconsistência.
- Limites (marcha lenta/rotação de corte/opacidade) vêm de
  `testes_opacidade.limite_*` (extraídos do PDF do Syscon na importação,
  ver seção 8.5) — só cai pro cadastro manual do veículo
  (`especificacoes_motor`, via `veiculo.especificacao_motor_id`) se o
  teste ainda não tiver sido (re)importado depois dessa mudança.
- Tabela de medições vem de `testes_opacidade_medicoes` (Aceleração,
  Rotação de corte, Tempo — fixo em 4s, não é parseado do PDF —,
  Opacidade K(m-1)). `rotacao_corte` é preenchido no import com o limite
  de rotação de corte do ensaio (o PDF não traz um valor diferente por
  ciclo).
- Validade = data de emissão + 1 ano (mesma regra da view
  `veiculos_validade`, seção 6.x).
- Dados do opacímetro (modelo/serial/fabricante/validade) vêm de
  `equipamentos_teste`, já carregado em `teste.equipamentos_teste`.
- Altitude, temperatura aferida e RPM tolerado (linhas que existem no
  relatório do Syscon) não têm fonte confiável em nenhum lugar do sistema
  — **omitidos**, não fabricados.
- **Selo do fabricante**, grande e centralizado no espaço em branco entre
  "Dados do Opacímetro/Software" e o rodapé. Opcional, vem de
  `equipamentos_teste.selo_imagem_path` (seção 6.8, migration `0029`); se o
  equipamento não tiver selo cadastrado, essa parte simplesmente não
  aparece (não inventamos a imagem). Chegou a existir um QR code gerado à
  parte (pacote `qrcode`) do lado do selo, apontando pra
  `{siteUrl}/laudo/{codigoPublico}` — **removido a pedido da gerência**,
  que preferiu manter só o selo do laudo original, sem elemento extra
  nosso.
  - **Corta a margem em branco da imagem antes de desenhar** (`sharp(buf).
    trim().png().toBuffer()`) — o arquivo que o usuário sobe no cadastro
    costuma ser um recorte de print feito à mão, com bastante espaço vazio
    ao redor do selo de verdade; sem o corte, aumentar o tamanho do bloco
    só aumentava o vazio, não o selo em si (foi exatamente o que aconteceu
    numa primeira versão maior sem o `trim`).
  - Altura alvo de 70mm, mas cede dinamicamente ao espaço vertical real
    que sobra na página (`pageHeight - yImagemSelo - 20`) e nunca invade o
    rodapé; largura tem um teto de segurança (`pageW - margin*2`) pro caso
    de uma imagem muito mais larga que alta. Sempre centralizado
    horizontalmente.

**Só a página 3 (certificado de calibração) ainda pode ser um documento
de terceiro mesclado tal como é** — não redesenhamos um certificado de
calibração de fábrica, isso não é dado que já exista noutro lugar do
sistema para preferir a versão nossa. Se `equipamentos_teste.
pdf_certificado_calibracao_path` for um PDF de verdade, é mesclado via
`pdf-lib` com um carimbo por cima (`page.drawImage`/`page.drawText`,
`StandardFonts.Helvetica` + `rgb()`, coordenadas em pontos com origem no
canto inferior esquerdo — diferente do `jsPDF`, que usa mm com origem no
canto superior): logo pequeno no topo-esquerdo + "Página X de Y" no
rodapé-direito, sem alterar o conteúdo original do documento.

**Certificado de calibração aceita "PDF ou foto"** no cadastro do
equipamento (`equipamentos/equipamento-form.tsx`, `accept="application/
pdf,image/*"`) — `detectarTipoArquivo` lê os primeiros bytes do arquivo
baixado (assinatura `%PDF`/JPEG/PNG/RIFF+WEBP) em vez de confiar na
extensão salva no path (encontrado um caso real onde o path terminava em
`.pdf` mas o conteúdo era WebP). Se for imagem, vira uma página nossa
(título "CERTIFICADO DE CALIBRAÇÃO DO EQUIPAMENTO" + imagem centralizada,
redimensionada mantendo proporção) desenhada como página 3 do mesmo `doc`
principal — só quando o certificado é um PDF de verdade é que existe
mesclagem via `pdf-lib` depois do `doc.output()`. Se o certificado
estiver ausente/corrompido, a página 3 simplesmente não é criada — nunca
trava a emissão do laudo, só reduz o total de páginas.

**Total de páginas é calculado antes de desenhar a capa**
(`totalPaginas` = 2 (capa + ensaio) + páginas do certificado, se houver),
porque o cabeçalho da capa já precisa mostrar "Página 1 de N" correto —
o certificado é baixado e carregado via `PDFDocument.load` **antes** de
criar o `jsPDF`, só pra saber `getPageCount()` (quando é PDF) ou decidir
que vai virar +1 página nossa (quando é imagem).

**Capa (página 1)**: cabeçalho com caixinha bordada no canto direito
(`caixaCabecalho`) com Nº/Revisão/Data/Página — `revisao` é parâmetro
opcional (default `0`) refletindo `laudos.revisao` (coluna já existe no
banco, sem fluxo de reemissão que a incremente ainda). Os dados do
veículo/proprietário usam `blocoGrid` — grade com borda, rótulo cinza
pequeno em cima e valor embaixo por coluna (Contratante/CNPJ/Telefone,
Marca-Modelo/Placa|Identificador/Ano, Chassi/Renavam/Combustível,
Endereço), medindo quebra de linha de verdade via `doc.splitTextToSize`
antes de fixar a altura da linha — nome de contratante longo que quebra
em 2 linhas não pode ficar cortado por uma célula baixa demais. "Placa"
em vez de "Identificador" quando `veiculos_maquinas.tipo_ativo =
'veiculo'` (senão continua "Identificador", pra não forçar rótulo errado
em máquina/equipamento sem placa). Fotos do ensaio e texto de conclusão
(aprovado/reprovado, citando IN IBAMA 06/2010 e Resolução CONAMA
418/2009) seguem como antes. Assinatura do responsável agora fica dentro
de uma caixa bordada com cabeçalho centralizado (RESPONSÁVEL TÉCNICO +
formação(ões) + nome + CREA) — **não fabricamos carimbo de assinatura
digital ICP-Brasil** (isso exigiria certificado real), é sempre a imagem
cadastrada (`responsaveis_tecnicos.imagem_assinatura_path`) + o nome de
quem assina. Depois da caixa, `blocoGrid` de 3 colunas — Elaborado e
Revisado por / Aprovado por (hoje sempre o mesmo nome — o sistema não
distingue os dois papéis, só tem um `responsavel_tecnico_id` por laudo) /
Identificação do Emissor do Laudo (`responsaveis_tecnicos.formacao`
separado em várias linhas se tiver "/" — ex. "Engenheiro Mecânico /
Engenheiro de Segurança do Trabalho" —, nome, `registro_conselho`,
telefone da empresa via `getDadosEmpresa()`, e-mail/site de `COMPANY`).

Tudo isso (Telefone/Placa/formação/CREA/rodapé de 3 colunas) já existia
na prévia em tela (`testes/[testeId]/laudo-preview-card.tsx`) — só
faltava no PDF gerado de fato, gap fechado depois que a gerência recebeu
reclamação de cliente comparando com um laudo antigo (pré-sistema) que
tinha essas informações. **Laudos já emitidos antes dessa mudança
precisam ser reemitidos manualmente** (reprocessar `gerarLaudoPdf` com o
mesmo `numero`/`codigo_publico`/`revisao` e sobrescrever o arquivo no
bucket `laudos` com `upsert: true`) pra refletir o layout novo — o PDF é
gerado uma vez só, na hora de `liberarLaudo`, e fica estático no storage
depois disso; não há regeneração automática.

### 8.7 PDF da proposta (`src/lib/orcamento/gerar-pdf.ts`)
1 página, mesmo estilo visual (cabeçalho verde da marca, tabela de
valores com `jspdf-autotable`, rodapé com dados da empresa e link
`{siteUrl}/proposta/{token}`).

### 8.8 Configurações (`src/app/painel/configuracoes/`)
Só `gerencia` (`requireRole(["gerencia"])`). `page.tsx` busca tudo em
paralelo (`Promise.all`) e passa pra `configuracoes-tabs.tsx` (Client
Component, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` de
`components/ui/tabs.tsx`, primitiva `@base-ui/react/tabs`), três abas:
- **Orçamento**: `max-w-2xl`, **ancorado à esquerda, não centralizado**
  (settings de app maduro — Stripe/GitHub/Linear — não centraliza uma
  coluna estreita no meio da tela; isso é padrão de form de criar 1
  registro, não de tela de configuração). `ConfiguracoesForm`: um card
  por parâmetro (valor padrão por km, fator de correção de distância —
  usados no cálculo da seção 8.2), **não** um form único — cada card abre
  travado (rótulo + valor) com um lápis (cor da marca) que troca pro
  campo editável (`MoedaInput` pro valor por km) + Salvar/Cancelar; sem
  botão de excluir (são parâmetros fixos do sistema, não itens de lista).
  Cada card salva com sua própria Server Action (`salvarValorKm`,
  `salvarFatorCorrecaoDistancia` — cada uma faz um `update` parcial só da
  própria coluna; **não têm um form combinado**, pra um card não poder
  sobrescrever o valor do outro por engano ao salvar sozinho).
  `TiposServicoLista` (mesma largura): cards separados
  (`rounded-2xl border shadow-sm`, mesmo padrão da lista de Funções em DP,
  seção 9), cada um abre **travado** (nome + valor formatado, ícones de
  lápis/lixeira — aqui faz sentido excluir, é uma lista de itens) — editar
  troca pro `MoedaInput` + Salvar/Cancelar, mesmo padrão do modal de
  evento (8.3). Excluir é **lógico** (`excluirTipoServico`, `ativo=false`)
  — preserva histórico de agendamentos já criados com aquele tipo; a
  lista (aqui e no picker do modal de teste) sempre filtra `ativo=true`.
- **Visibilidade e acesso**: `KpisPorCargoForm` (ver 6.18) — o que cada
  cargo vê por padrão no dashboard. Pra exceção por pessoa, ver
  `dp/[id]/kpis-pessoa-form.tsx` (seção 9). *Ideia registrada, ainda não
  implementada*: reformular esses toggles como "áreas do sistema que a
  pessoa pode acessar" (ex.: "pode ver Departamento Pessoal") em vez de
  seções de KPI cruas, crescendo junto com novas áreas do app e
  derivando os KPIs visíveis a partir do acesso concedido — hoje as duas
  coisas (KPI visível × área acessível) ainda são conceitos separados.
- **Empresa**: razão social, CNPJ, endereço e telefone — mesma tabela
  singleton `dados_empresa` (seção 6.21) usada no rodapé do PDF de laudo/
  orçamento. `DadosEmpresaForm`/`salvarDadosEmpresa`. O telefone aqui é o mesmo
  campo que `/painel/site` (seção 10) edita por um form mais simples,
  focado só no que o site público usa.

## 9. Módulo DP — "Departamento Pessoal" (`src/app/painel/dp/`)

Só `gerencia` acessa (`canGerenciarUsuarios`). Item da sidebar: "DP".

- **Pessoas** (`dp/page.tsx`, `dp/novo`, `dp/[id]/editar`,
  `pessoa-form.tsx`): cadastra uma pessoa = cria a conta de acesso de
  verdade. Campos: nome, e-mail (só na criação), CPF (`DocumentoInput`,
  ver 9.1), WhatsApp (campo `telefone`, mascarado), **Função** (não tem
  seletor de "nível de acesso" separado — a função escolhida já define
  isso, via `funcoes.nivel_acesso`), data de admissão (default = hoje),
  toggle "Acesso ao sistema liberado".
  - Ação `criarPessoa`: `createAdminClient().auth.admin.createUser({
    email, password: <gerada aleatória, 16 chars>, email_confirm: true
    })`, depois insere `usuarios_perfis` com o `role` **lido do banco a
    partir do `funcao_id`** (nunca confia num `role` vindo do form). Se o
    insert falhar, desfaz o `createUser` (evita conta órfã).
  - A senha é gerada na hora e mostrada **uma única vez** na tela seguinte
    (`credenciais-panel.tsx`), com botões pra mandar por **WhatsApp**
    (`wa.me` com mensagem pronta) ou **e-mail** (`mailto:` com
    assunto/corpo prontos) — decisão explícita do usuário, trocando um
    design anterior que usava `resetPasswordForEmail`.
  - Editar pessoa e ligar o acesso que estava desligado: gera senha nova
    (`auth.admin.updateUserById(id, { password })`) e mostra o mesmo
    painel de credenciais.
  - **"Pessoa esqueceu a senha?"** — botão em `dp/[id]/editar` (só
    aparece se `acesso_sistema` já estiver ligado) chama `redefinirSenha`,
    que gera outra senha aleatória, atualiza via `auth.admin.updateUserById`
    e reaproveita o mesmo `credenciais-panel.tsx` — reset avulso, sem
    precisar desligar/religar o acesso.
  - `dp/[id]/kpis-pessoa-form.tsx`: exceção pontual de visibilidade de KPI
    (`usuarios_kpis`, ver 6.18) pra essa pessoa específica, sem mexer no
    cargo dela — mesmos checkboxes de `KpisPorCargoForm` (8.8), só que
    grava com `usuario_id` em vez de `funcao_id`.
- **Funções** (`dp/funcoes/`, `funcao-form.tsx`): nome do cargo,
  **Nível de acesso** (`tecnico|escritorio|gerencia` — isso é o que
  qualquer pessoa com essa função "vira" no sistema), **Descrição das
  responsabilidades** — editor rich-text (ver 9.2), **obrigatória** (o
  server action rejeita HTML "vazio" tipo `<p></p>`).
  - Lista: cards separados (não linhas divididas), descrição truncada em
    2 linhas (`line-clamp-2`), clique abre a tela de detalhe
    (`funcoes/[id]/`) com a descrição completa + botões **Editar**
    (`atualizarFuncao`) e **Excluir** (`excluirFuncao`, com modal de
    confirmação — `ConfirmDeleteButton` genérico).
  - Nome é **único** (índice funcional sobre `lower(unaccent(nome))`) —
    duplicidade vira erro amigável, não erro cru de banco.

### 9.1 `DocumentoInput` (`src/components/documento-input.tsx`)
Componente compartilhado (usado aqui e no form de cliente): mascara
CPF/CNPJ conforme digita, e **só depois que os 11 (CPF) ou 14 (CNPJ)
dígitos foram preenchidos** mostra "válido"/"inválido" (com ícone
verde/vermelho) — nunca antes disso, pra não incomodar no meio da
digitação. Expõe `onValidChange(bool)` pro form desabilitar o submit
enquanto inválido.

### 9.2 `RichTextEditor` (`src/components/rich-text-editor.tsx`)
Tiptap (`StarterKit`), toolbar mínima: **N** (negrito — deliberadamente
não usa o ícone "B" do Lucide, "N" comunica melhor em português),
Itálico, lista com marcadores, lista numerada. Estado ativo dos botões
via `useEditorState` (não `editor.isActive()` direto no JSX — no Tiptap
v3 isso não re-renderiza de forma confiável em toda transação, ex.: sair
de uma lista vazia com Enter duas vezes). Botão ativo = fundo verde da
marca (não cinza sutil). Conteúdo sai como HTML (`editor.getHTML()`) num
`<input type="hidden">` — assim participa do `FormData` do form ao redor
sem precisar de state extra no submit. `richTextClasses` (export nomeado)
é a classe Tailwind usada tanto no editor quanto em qualquer exibição
read-only do HTML salvo (`dangerouslySetInnerHTML` — conteúdo é sempre
autoria interna de `gerencia`, nunca input público).

## 10. Módulo Site (`src/app/painel/site/`)

Hub "Gerenciamento do site" — informações do site institucional que
mudam com frequência sem precisar mexer em código. Só `gerencia`
(`canGerenciarSite`, ver seção 5), item "Site" na sidebar (ícone `Globe`).
Antes desse hub, "Serviços" tinha item próprio na sidebar; agora fica
acessível só a partir daqui, junto de futuras áreas de conteúdo do site.
Toda página de edição desse módulo (o hub, a lista de serviços, editar um
serviço, a página Sobre, os slides do Hero) tem um botão **"Ver no site"**
(`src/components/ver-no-site-button.tsx`, link com `target="_blank"` pro
trecho correspondente do site público — `/` a partir do hub e dos slides
do Hero, `/servicos`/`/servicos/{slug}` a partir de Serviços, `/sobre` a
partir da página Sobre) — sempre visível, sem precisar caçar a URL certa
pra conferir o resultado.

`page.tsx` mostra:
- Um card-link pra `/painel/servicos` (seção 6.20) — CRUD completo dos
  serviços, permanece como página própria por ser grande demais pra caber
  inline aqui.
- Um card-link pra `/painel/site/hero` — slides do carrossel da home (ver
  10.2).
- Um card-link pra `/painel/site/sobre` — textos de `/sobre` (ver abaixo).
- **Informações de contato** (`ContatoForm`, inline na própria página, sem
  navegação extra — deliberadamente simples): **um único campo** de
  telefone, mascarado com `formatTelefone` (`src/lib/utils/mascaras.ts`,
  mesmo padrão usado em `dp/pessoa-form.tsx`). O server action
  `salvarContato` (`src/app/painel/site/actions.ts`) deriva as duas formas
  que o site precisa a partir desse único valor — texto formatado
  (`telefone`) e dígitos com DDI 55 (`whatsapp`) — e grava as duas colunas
  de `dados_empresa` (seção 6.21) numa `update` só. A pessoa nunca edita
  `whatsapp` diretamente, evitando as duas formas ficarem
  dessincronizadas.

Esse telefone/whatsapp alimenta o site inteiro: cabeçalho (`tel:` +
botão de WhatsApp), botão flutuante de WhatsApp, Hero, `FinalCta`,
`/contato`, cada página de serviço e o JSON-LD `LocalBusiness`/`Service`
(seção 7.1) — todos client components relevantes recebem o valor via
props vindas de `(public)/layout.tsx` (que busca uma vez com
`getDadosEmpresa()`, seção 6.21) ou, nas páginas server-only, buscam
direto. Nenhum componente client busca o dado sozinho.

### 10.1 Página Sobre (`/painel/site/sobre`)

Tabela singleton `pagina_sobre` (migration 0026, mesmo truque de
`dados_empresa`/`servicos` — `id boolean primary key default true`):
`headline`, `introducao` (texto simples), `como_trabalhamos` (HTML rico —
ver abaixo) e `diferenciais` jsonb (`[{titulo, descricao}]`, sempre 3
itens). RLS: SELECT staff, UPDATE `gerencia`; leitura pública via
`getPaginaSobre()` (`src/lib/content/pagina-sobre.ts`), mesmo padrão
`createAdminClient()` de `servicos`/`dados_empresa`.

`como_trabalhamos` era 2 colunas de parágrafo fixo (`_1`/`_2`) até a
migration 0027, que uniu num campo só de HTML — a gerência escreve livre e
quebra em quantos parágrafos quiser, com negrito/itálico/sublinhado/listas
via `RichTextEditor` (`src/components/rich-text-editor.tsx`, Tiptap —
mesmo componente já usado em DP → Funções, seção 9.2; ganhou um botão de
sublinhado nessa rodada, extensão `underline` já vem embutida no
`StarterKit` v3, só não tinha botão pra ela). Leitura em `/sobre`:
`dangerouslySetInnerHTML` com `richTextClasses` (mesmo padrão de
`dp/funcoes/[id]/page.tsx`) — seguro porque só `gerencia` escreve esse
campo (RLS), mesmo modelo de confiança do resto do rich text no app.

Os **ícones dos 3 diferenciais são fixos no código**
(`MapPinned`/`ClipboardCheck`/`ShieldCheck`, `ICONES_DIFERENCIAIS` em
`(public)/sobre/page.tsx`) — a gerência não escolhe ícone, só edita
título/descrição de cada card, casados por posição (`diferenciais[0]` usa
sempre o 1º ícone etc.). `SobreForm` (`/painel/site/sobre/sobre-form.tsx`)
não usa lista dinâmica de adicionar/remover (tamanho fixo em 3) — cada
diferencial vira 2 campos indexados no FormData
(`diferencial_0_titulo`/`_descricao` etc.), reconstruídos em array pela
Server Action `salvarPaginaSobre`.

O bloco "Dados da empresa" no rodapé de `/sobre` (razão social/CNPJ/
endereço) **continua estático** (`COMPANY`, não `dados_empresa`) — mesmo
texto usado em `/termos`, `/privacidade`, `/contato` e no rodapé do site;
deixado de fora deliberadamente pra não descasar desses outros lugares
sem mexer neles também (fora do pedido original).

### 10.2 Slides da home (Hero, `/painel/site/hero`)

Tabela `hero_slides` (migration 0028): `servico` (até 40 caracteres),
`descricao` (até 160), `imagem_url`/`imagem_alt`, `posicao`
(`object-position` CSS, ex. `"30% 62%"`), `link_href` e `ordem` — mesmo
padrão de RLS/leitura pública de `servicos` (`getHeroSlides()`,
`src/lib/content/hero-slides.ts`, `createAdminClient()` sem depender de
RLS pro visitante). `Hero` (`src/components/marketing/hero.tsx`) recebe
`slides: HeroSlide[]` via prop em vez do array `SLIDES` hardcoded que
existia antes; `(public)/page.tsx` busca com `getHeroSlides()` e repassa.

**Limites de caracteres são obrigação tripla** (pedido explícito do
usuário — sem isso o card sobreposto na foto do Hero pode ficar alto
demais e atropelar o layout): `HERO_SERVICO_MAX`/`HERO_DESCRICAO_MAX`
(`hero-slides.ts`) valem como `maxLength` no formulário
(`slide-form.tsx`, com contador de caracteres visível), validação na
Server Action (`salvarSlide`, `hero/actions.ts`) e `check` no banco
(migration 0028).

**`link_href` é um `<select>` alimentado por `getServicos()`** (não texto
livre) — a gerência escolhe o serviço de destino do botão "Saiba mais"
entre os já cadastrados em `/painel/servicos`, o que impede link quebrado
por erro de digitação. Componente `Select` do `@base-ui/react` (mesmo
usado em `equipamentos`/DP), controlado (`value`/`onValueChange`) com
`name="link_href"` pra viajar no FormData nativo do form.

**`posicao` não é editável pelo formulário do painel** — simplificação
consciente: os 7 slides herdados do array antigo tinham um recorte
(object-position) ajustado a dedo por slide, e um formulário completo com
esse controle seria mais complexo que o benefício justifica. O valor fica
gravado no banco (usado no `style={{objectPosition}}` do slide) mas troca
de foto sempre usa a posição já salva; ajuste fino de enquadramento
continua sendo tarefa de dev, direto no banco, se algum dia for preciso.

O array antigo tinha duas imagens por slide (recorte próprio pra mobile e
desktop); a tabela nova guarda **uma imagem só** por slide — simplifica o
formulário do painel e o componente `Hero`, ao custo de não ter mais um
recorte dedicado pro mobile (aceitável: o `object-position` salvo já cobre
razoavelmente as duas telas pros 7 slides seed).

**Exclusão é bloqueada se só sobrar 1 slide** (`excluirSlide`, verifica
`count` antes de apagar) — o carrossel da home sempre precisa de pelo
menos um slide pra não ficar vazio.

## 11. Padrões de UI/UX que são regra do projeto (não só deste módulo)

1. **Erro de formulário sempre em modal**, nunca texto vermelho inline.
   Componente compartilhado `src/components/error-modal.tsx`
   (`<ErrorModal erro={string|null} onClose={fn} />`). Padrão: `<form
   action={(fd) => startTransition(() => handleSubmit(fd))}>` onde
   `handleSubmit` faz `try { await action(fd) } catch (e) { if
   (isRedirectError(e)) throw e; setErro(...) }` —
   **`isRedirectError`** (`src/lib/utils/is-redirect-error.ts`) é
   obrigatório nesse catch porque `redirect()` do Next.js funciona
   lançando uma exceção especial (`digest` começando com
   `"NEXT_REDIRECT"`) que não pode ser tratada como erro de validação.
   Quando fechar o modal deve devolver o foco a um campo específico (ex.:
   nome duplicado → foca e seleciona o campo nome de novo), passar um
   `onClose` customizado.
2. **Campos controlados** (`value`+`onChange`, não `defaultValue`)
   sempre que o valor precisa sobreviver a um re-render de erro — React
   rereseta inputs não-controlados depois que uma form action roda,
   mesmo em caso de erro.
3. **`loading.tsx` obrigatório** em toda pasta de página (ver seção 7).
4. **Modal (não página nova) pra criação rápida** quando a ação é
   disparada a partir de uma tela que já tem os dados prontos (padrão da
   Agenda) — e o estado do modal (aberto/fechado, dados que ele precisa)
   deve ser local/sob-demanda, não forçar um refetch de servidor.
5. **Máscaras** (`src/lib/utils/mascaras.ts`: `formatTelefone`,
   `formatCep`, `onlyDigits`) formatam **progressivamente no `onChange`**;
   cuidado com strings vazias — o padrão ingênuo
   `digits.replace(/(\d{0,2})/, "($1")` produz `"("` pra uma string vazia
   (o regex casa zero dígitos); sempre tratar `digits.length === 0`
   retornando `""` antes de aplicar a máscara.
6. **Busca automática ao completar um campo** (CEP) em vez de esperar
   `onBlur` — dá sensação de resposta mais rápida.
7. **Menos consultas, sem round-trip pra estado de UI pura**: nunca
   colocar em `searchParams`/URL um estado que só controla um modal/toggle
   client-side — isso força o Next.js a re-renderizar o Server Component
   da página. Ao buscar múltiplas tabelas independentes no mesmo Server
   Component, usar `Promise.all`. Isso vale até pra estado que **parece**
   precisar de refetch, tipo `view`/`data` da agenda: em vez de deixar a
   URL disparar o Server Component a cada navegação, o dono do estado é o
   client (`useState` + cache local por período já carregado), e a URL só
   é **espelhada** por cima (`window.history.replaceState`, nunca
   `router.push`/`replace`) só pra manter deep link — ver seção 8.1. Regra
   geral: URL como fonte de verdade só quando o primeiro load (sem JS/SSR)
   realmente precisa saber o que buscar; depois disso, client state.
   Mesma lógica pra ações que fecham um modal: **nunca `redirect()`** de
   dentro de uma Server Action chamada por um modal que deve continuar na
   mesma tela — `redirect()` é só pra fluxos que genuinamente trocam de
   página (ex.: criar teste → vai pra central do teste). Ver nota no fim
   da seção 8.2 e a seção 8.3 (evento fecha modal + `recarregarTudo()` em
   vez de `redirect()` + re-render inteiro).
8. **Sidebar escura** (`bg-neutral-900`), item ativo = pill sólida na cor
   da marca (`bg-brand`); resto do painel claro — inspirado em
   Linear/Vercel/Stripe (sidebar escura + conteúdo claro), não um dark
   mode completo. Botões primários em `rounded-full` (pill). Cards em
   `rounded-2xl` + `shadow-sm`. `--radius` base em `globals.css` controla
   toda a escala via `calc()` — mudar só ali propaga pro app inteiro.
   Logo da empresa tem fundo branco sólido (não transparente) — colocar
   ela sobre um fundo escuro precisa de um "chip" branco atrás
   (`rounded-full bg-white`), nunca um filtro CSS tipo `invert` (inverte a
   imagem inteira, não só o traço do logo, virando um retângulo sólido).
9. **"← Voltar" só usa o modal de "abandonar cadastro"
   (`ConfirmLeaveButton`) em telas de formulário** — em telas
   read-only/lista, usar `<Link>` direto, sem confirmação nenhuma.
10. **Campo de dinheiro é sempre `MoedaInput`** (`src/components/
    moeda-input.tsx`, seção 8.2.2), nunca `<Input type="number">` cru —
    regra do projeto inteiro, não só da Agenda.
11. **Card com estado travado/editável** (visualização por padrão, ícones
    de lápis/lixeira; "Editar" libera os campos e troca pra
    Salvar/Cancelar) é o padrão pra editar um item de lista sem navegar
    pra outra página — usado no modal de evento (8.3) e nos tipos de
    serviço (8.8). `ConfirmDeleteButton`
    (`src/components/confirm-delete-button.tsx`) aceita `label` como
    `ReactNode` (não só `string`) e `variant`/`size`/`className`/
    `ariaLabel` opcionais, justamente pra virar um botão só-ícone
    (`variant="ghost" size="icon-sm"`) nesse padrão, além do botão de
    texto original (ex.: Excluir função em DP).
12. **Exclusão lógica quando existe referência histórica** — preferir uma
    coluna `ativo boolean` (já existia em `tipos_servico`) e filtrar
    `eq("ativo", true)` em vez de `delete` de verdade, quando outras
    linhas podem apontar/ter apontado pro registro (ex.: agendamentos
    antigos com aquele tipo de serviço). Delete de verdade só quando não
    há esse risco (ex.: `funcoes`, `categorias_agenda` hoje não expõe
    exclusão pela UI).
13. **Lista de itens (cliente, equipamento, teste, pessoa DP,
    agendamento...) é uma pilha de cards com espaço entre eles**
    (`space-y-3` no container, cada item com sua própria
    `rounded-lg border border-neutral-200 bg-white`), **nunca** um único
    card com `divide-y` separando as linhas por borda interna — a versão
    `divide-y` lê como um bloco só, não como itens distintos. Estado
    vazio ("Nenhum X cadastrado") fica fora dos cards, texto solto. Não
    se aplica a dropdown de autocomplete/busca (ex.:
    `cliente-existente-picker.tsx`), que continua compacto com
    `divide-y` — ali o agrupamento visual é o efeito desejado.
14. **Checklist "passo a passo"** (`agenda/[id]/page.tsx`, componente
    `PassoAPasso`) — lista vertical (uma linha por passo, com o botão de
    ação daquele passo ao lado) em `md:` pra cima; barra horizontal
    compacta (só ícones + legenda do passo atual) no celular, onde rótulo
    embaixo de bolinha quebraria. Cada passo pode ter `subpassos`
    (sub-checklist recuado, ex.: status interno da execução do teste) e um
    `acao` que só aparece quando aquele passo específico está
    disponível — a disponibilidade de cada passo é calculada
    independentemente dos outros (não é uma sequência rígida: ex. dá pra
    iniciar a execução do teste mesmo com a proposta ainda não aceita),
    então mais de uma ação pode aparecer ao mesmo tempo, cada uma junto do
    passo certo — em vez de empilhar todos os botões soltos no fim da
    página.
15. **Mensagem de WhatsApp com endereço: texto puro, sem link do Google
    Maps embutido.** WhatsApp/iMessage detectam endereço em texto puro e
    deixam clicável sozinhos, abrindo o app de mapa que o destinatário já
    usa (Waze, Apple Maps, Google Maps...) — um link `google.com/maps`
    força um app específico e é redundante com essa detecção nativa. Ver
    `montarTextoOrcamentoWhatsapp` em `src/lib/orcamento/texto-whatsapp.ts`.

## 12. Fora de escopo / conhecido como não implementado

Pra quem for reconstruir: estas peças **existem no schema ou foram
cogitadas mas não têm UI/lógica funcionando** — implementar do zero é
opção, não obrigação, pra ter um sistema equivalente ao atual:

- OTP/SMS no aceite de proposta (`propostas.otp_hash`/`otp_expira_em`
  existem, não são usados — aceite é só o token na URL + clique).
- Importação automática de tabelas ANFAVEA (`fontes_anfavea` existe,
  sem leitura/escrita no app).
- Múltiplos tipos de teste além de opacidade (`tipo_teste` já tem o
  `check` pronto pra crescer, só "opacidade" existe).
- "Áreas de acesso" como conceito de primeira classe (nota no fim da
  seção 8.8) — hoje visibilidade de KPI e nível de acesso (`Role`) são
  duas coisas separadas; a ideia de derivar uma da outra (por área do
  sistema, crescendo conforme o app cresce) foi registrada, não
  implementada.
- Repetição de **teste** de opacidade (só evento tem "Repetir", seção
  8.2) — decisão pendente sobre cliente/proposta únicos vs. um por
  ocorrência.
- Editar/excluir um evento do tipo `evento` pela página de link direto
  (`agenda/[id]/page.tsx`) — só o modal (8.3) faz isso; a página é
  read-only.

## 13. Como validar uma reconstrução

1. `npx tsc --noEmit` e `npm run lint` limpos.
2. Aplicar as migrations em ordem (`supabase db push`) — reproduz o
   schema exato desta seção 6.
3. Criar os 3 buckets de Storage manualmente (seção 6, subseção final).
4. Cadastrar uma função (define nível de acesso) → cadastrar uma pessoa
   com aquela função e acesso liberado → confirmar que a senha aparece
   uma vez, o link de WhatsApp/e-mail funciona, e logar com ela.
5. Na Agenda: abrir o modal "Criar" (deve ser instantâneo), marcar "é um
   teste", digitar um CEP válido e confirmar que a distância calcula
   sozinha; salvar e conferir que criou cliente pendente + agendamento +
   proposta com token.
6. Completar o cadastro do cliente, vincular veículo, rodar o fluxo de
   testes/[testeId] até liberar o laudo, e abrir `/laudo/[codigo]`
   deslogado pra conferir a verificação pública.
