-- O PDF exportado pelo Syscon já traz os limites configurados no
-- opacímetro pra aquele ensaio (Limite Marcha Lenta, Limite Rotação
-- Corte, Limite Opacidade) — antes esses dados só existiam manualmente em
-- especificacoes_motor (cadastro do veículo, opcional) e, na prática,
-- ficavam em branco no laudo. Agora são extraídos automaticamente do PDF
-- na importação (ver src/lib/syscon/parse-ensaio.ts) e gravados por
-- ensaio — mais confiável que depender do cadastro manual do veículo.
alter table public.testes_opacidade
  add column limite_marcha_lenta_min numeric,
  add column limite_marcha_lenta_max numeric,
  add column limite_rotacao_corte_min numeric,
  add column limite_rotacao_corte_max numeric,
  add column limite_opacidade numeric,
  -- Quilometragem no momento do ensaio ("Km Atual" no PDF) — muda a cada
  -- teste, por isso fica aqui e não no cadastro do veículo.
  add column km_atual numeric;
