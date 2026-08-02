-- Rastreabilidade de quem cadastrou/editou cada equipamento.
alter table public.equipamentos_teste
  add column criado_por uuid references public.usuarios_perfis(id) on delete set null,
  add column atualizado_por uuid references public.usuarios_perfis(id) on delete set null,
  add column atualizado_em timestamptz;
