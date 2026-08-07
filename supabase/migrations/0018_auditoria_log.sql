-- Log de auditoria — quem fez o quê nas ações mais sensíveis do sistema
-- (excluir teste, liberar laudo, aceitar proposta em nome do cliente,
-- editar cadastro de cliente). Escopo inicial: só ações críticas, não
-- todo INSERT/UPDATE/DELETE do banco (ver system.architecture.md §10.14
-- pra decisão de escopo). Gravado sempre via admin client dentro da
-- própria server action (não é trigger de banco), então "quem fez"
-- (usuario_id) é sempre quem estava logado, não o service role.
create table public.auditoria_log (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios_perfis(id) on delete set null,
  acao text not null,
  entidade text not null,
  entidade_id uuid,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

create index auditoria_log_entidade_idx on public.auditoria_log (entidade, entidade_id);
create index auditoria_log_created_at_idx on public.auditoria_log (created_at desc);

alter table public.auditoria_log enable row level security;

-- Só gerência consulta o log (é ferramenta de supervisão); gravação é
-- sempre via admin client nas server actions, que já ignora RLS.
create policy "gerencia le auditoria_log"
  on public.auditoria_log for select
  using (public.get_my_role() = 'gerencia');
