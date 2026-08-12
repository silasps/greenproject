-- Liga um responsável técnico (quem assina laudos) a uma conta de acesso
-- (usuarios_perfis) — opcional, já que alguns responsáveis são externos
-- e nunca logam no sistema. Isso permite descobrir "o usuário logado é um
-- engenheiro autorizado a liberar laudo?" sem depender do cargo em texto
-- livre (funcoes.nome), e pré-selecionar o próprio nome no formulário de
-- liberação, mantendo a lista aberta pra declarar outro responsável.
alter table public.responsaveis_tecnicos
  add column usuario_id uuid unique references public.usuarios_perfis(id) on delete set null;
