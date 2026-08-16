-- O texto de "modelo" das tabelas ANFAVEA (ex.: "I/TOYOTA HILUX CDSR A4FD")
-- segue a mesma nomenclatura oficial (Denatran) usada no campo MARCA/MODELO
-- dos documentos do veículo — até então esse texto era extraído pelo
-- parser (src/lib/veiculos/parse-anfavea.ts) e descartado. Guardar aqui
-- permite alimentar um combobox de modelo no cadastro do veículo
-- (marca-modelo-combobox.tsx) que já preenche motor+limites ao selecionar,
-- sem precisar decorar o código do motor.
alter table public.especificacoes_motor
  add column modelo text;
