-- Caixa de sugestões: qualquer pessoa logada no painel pode mandar uma
-- sugestão/relato de bug pro desenvolvedor a partir de qualquer página do
-- sistema — a página de origem é capturada automaticamente (pagina). Só
-- quem tem a flag is_superadmin (0022_superadmin.sql) enxerga a lista;
-- não é um canal de suporte com histórico visível pra quem enviou, é só
-- uma caixa de entrada pro desenvolvedor.

-- Mesmo padrão de get_my_role() (0001_initial_schema.sql): função
-- SECURITY DEFINER pra evitar RLS recursiva ao checar a flag dentro de
-- uma policy de outra tabela.
create or replace function public.get_my_is_superadmin()
returns boolean as $$
  select coalesce(is_superadmin, false) from public.usuarios_perfis where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create table public.sugestoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios_perfis(id) on delete cascade,
  pagina text not null,
  mensagem text not null,
  -- navigator.userAgent, capturado no envio — ajuda a reproduzir um bug
  -- relatado (mobile x desktop, navegador) sem precisar perguntar depois.
  user_agent text,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table public.sugestoes enable row level security;

create policy "staff envia sugestao"
  on public.sugestoes for insert
  with check (public.get_my_role() is not null and usuario_id = auth.uid());

create policy "superadmin le e gerencia sugestoes"
  on public.sugestoes for all
  using (public.get_my_is_superadmin())
  with check (public.get_my_is_superadmin());
