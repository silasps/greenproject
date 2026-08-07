-- Guarda o tipo de serviço escolhido no agendamento — hoje esse dado só
-- existia como estado local do formulário (usado pra montar o texto do
-- WhatsApp) e se perdia depois de criado. Base pra mostrar o nome do
-- serviço na tela do teste e na proposta pública.
alter table public.agendamentos
  add column tipo_servico_id uuid references public.tipos_servico(id) on delete set null;
