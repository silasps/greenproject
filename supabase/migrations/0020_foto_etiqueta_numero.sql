-- Segunda foto da etiqueta, focada só no número do teste — reduz erro
-- humano de digitação (técnico digita o número, mas agora também existe
-- uma foto zoomada só daquele número pra conferência posterior).
alter table public.testes_opacidade
  add column foto_etiqueta_numero_path text;
