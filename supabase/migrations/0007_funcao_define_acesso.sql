-- A função (cargo) passa a definir o nível de acesso da pessoa — não são
-- mais duas escolhas separadas no cadastro.
alter table public.funcoes
  add column nivel_acesso text not null default 'tecnico' check (nivel_acesso in ('tecnico', 'escritorio', 'gerencia'));
