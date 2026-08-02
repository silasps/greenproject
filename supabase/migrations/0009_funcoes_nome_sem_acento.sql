-- Considera "Técnico de Campo" e "tecnico de campo" (sem acento/maiúsculas)
-- como o mesmo nome pra fins de duplicidade.
create extension if not exists unaccent;

create or replace function public.nome_normalizado(nome text)
returns text
language sql
immutable
as $$
  select lower(public.unaccent($1));
$$;

drop index if exists funcoes_nome_key;
create unique index funcoes_nome_key on public.funcoes (public.nome_normalizado(nome));
