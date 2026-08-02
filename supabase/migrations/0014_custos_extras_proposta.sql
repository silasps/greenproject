-- Custos avulsos que a pessoa quer incluir no orçamento (ex.: pernoite em
-- hotel) — lista livre de {descricao, valor}, soma no valor_total.
alter table public.propostas
  add column custos_extras jsonb not null default '[]';
