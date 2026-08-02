-- Impede cadastrar a mesma função duas vezes (case-insensitive).
create unique index funcoes_nome_key on public.funcoes (lower(nome));
