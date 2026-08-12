-- A home mostrava sempre os 3 primeiros serviços por `ordem` — a gerência
-- pediu controle explícito de quais serviços aparecem lá, independente da
-- ordem/posição na lista completa de /servicos.
alter table public.servicos
  add column exibir_na_home boolean not null default false;

-- Preserva o comportamento atual da home (mesmos 3 que já apareciam).
update public.servicos
set exibir_na_home = true
where slug in ('opacidade-fumaca-preta', 'liquido-penetrante', 'vistoria-transporte-escolar');
