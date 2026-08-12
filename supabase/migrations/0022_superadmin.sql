-- Superadmin: uma flag adicional sobre a conta gerência, não um novo nível
-- na hierarquia de role — quem tem essa flag pode "vestir" a sessão real de
-- qualquer outro usuário (impersonação) pra validar o que cada papel vê,
-- sem precisar saber a senha dele. As policies de usuarios_perfis não
-- mudam: o superadmin continua com role = 'gerencia', então já cai nas
-- policies existentes; a impersonação troca a sessão pro usuário-alvo, e
-- as RLS dele se aplicam normalmente a partir daí.
alter table public.usuarios_perfis
  add column is_superadmin boolean not null default false;
