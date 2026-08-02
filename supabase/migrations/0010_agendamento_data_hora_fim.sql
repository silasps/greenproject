-- Horário de término do agendamento (evento ou teste) — opcional pra não
-- quebrar registros existentes; o formulário passa a preencher sempre,
-- com padrão de 1h de duração.
alter table public.agendamentos
  add column data_hora_fim timestamptz;
