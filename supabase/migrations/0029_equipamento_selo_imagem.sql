-- Selo/imagem de verificação do modelo do equipamento (ex.: "Smoke Check
-- 2000 - Opacímetro Portátil") — mesmo padrão visual do relatório que o
-- Syscon já imprimia na seção "Dados do Opacímetro/Software" do laudo, que
-- não temos como arquivo em lugar nenhum do sistema. Opcional: nem todo
-- equipamento tem um selo de fabricante pra anexar.
alter table public.equipamentos_teste
  add column selo_imagem_path text;
