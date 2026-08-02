-- Fotos extras opcionais do campo (além das 4 fixas: frente, traseira/teste
-- sendo feito, painel, etiqueta) — lista de caminhos no bucket arquivos-internos.
alter table public.testes_opacidade
  add column fotos_extras jsonb not null default '[]';
