-- Substitui o simples "lida"/"não lida" por um fluxo de etapas
-- (nova → em_andamento → feita/ignorada), mais um campo de observação
-- livre pro desenvolvedor anotar contexto (por que foi ignorada, o que
-- foi feito, etc.) — pedido pra acompanhar sugestões de verdade, não só
-- marcar como vista.

alter table public.sugestoes
  add column status text not null default 'nova'
    check (status in ('nova', 'em_andamento', 'feita', 'ignorada')),
  add column observacao text;

-- Backfill: quem já estava marcada como lida vira "em_andamento" (alguém
-- já olhou, mas não dá pra saber se foi resolvida) — o resto continua "nova".
update public.sugestoes set status = 'em_andamento' where lida = true;

alter table public.sugestoes drop column lida;
