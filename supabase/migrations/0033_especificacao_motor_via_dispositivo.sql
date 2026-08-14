-- Técnico pode declarar "já configurei os limites no aparelho/app do
-- Syscon" em vez de digitar de novo no nosso sistema — desbloqueia
-- "Concluir campo" confiando que o PDF do opacímetro vai trazer os
-- limites na importação. Se não vier, a trava de liberarLaudo continua
-- pegando (ver src/lib/laudo/limites-teste.ts).
alter table public.testes_opacidade
  add column especificacao_motor_via_dispositivo boolean not null default false;
