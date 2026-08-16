-- Semente inicial de `fontes_anfavea` — as ~16 marcas diesel com tabela
-- oficial de emissões/opacidade publicada pela ANFAVEA que encontramos
-- (regulamentação IN Ibama 127/2006), confirmadas uma a uma (HTTP 200) no
-- momento da escrita desta migration. Só cadastra a URL; nenhuma linha de
-- especificacoes_motor é criada aqui — isso acontece na primeira
-- verificação (botão "Verificar agora" em /painel/especificacoes-motor, ou
-- o cron trimestral de src/app/api/cron/atualizar-anfavea).
--
-- Mais marcas podem ser adicionadas a qualquer momento pela própria tela
-- (form "Importar tabela de uma marca") — essa lista não é fixa nem
-- exaustiva, é só o ponto de partida.
insert into public.fontes_anfavea (marca, url_tabela_pdf) values
  ('Mercedes-Benz', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELMBB.pdf'),
  ('Scania', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELSCANIA.pdf'),
  ('Volkswagen', 'https://anfavea.com.br/site/wp-content/uploads/2024/02/VWCO_Tabela-de-Emissoes_02.2024.pdf'),
  ('Toyota', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELTOYOTA.pdf'),
  ('Nissan', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELNISSAN.pdf'),
  ('MAN', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELMAN.pdf'),
  ('International', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELINTERNATIONAL.pdf'),
  ('Agrale', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELAGRALE.pdf'),
  ('Fiat', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELFIAT.pdf'),
  ('Iveco', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELIVECO.pdf'),
  ('Ford', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELFORD.pdf'),
  ('Volvo', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELVOLVO.pdf'),
  ('DAF', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELDAF.pdf'),
  ('Renault', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELRENAULT.pdf'),
  ('GM', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELGM.pdf'),
  ('Shacman', 'https://www.anfavea.com.br/Emissoes/diesel/TABELAEMISSOESDIESELSHACMAN.pdf')
on conflict (marca) do nothing;
