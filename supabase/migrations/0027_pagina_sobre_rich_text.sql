-- "Como trabalhamos" vira um campo de rich text só (negrito/itálico/
-- sublinhado/listas, via RichTextEditor — src/components/rich-text-editor.tsx),
-- em vez de dois parágrafos fixos separados — a gerência escreve e quebra
-- em parágrafos como quiser. Migra o conteúdo existente concatenando os
-- dois parágrafos em HTML, sem perder texto.
alter table public.pagina_sobre add column como_trabalhamos text;

update public.pagina_sobre
set como_trabalhamos = '<p>' || como_trabalhamos_1 || '</p><p>' || como_trabalhamos_2 || '</p>'
where id = true;

alter table public.pagina_sobre alter column como_trabalhamos set not null;
alter table public.pagina_sobre drop column como_trabalhamos_1;
alter table public.pagina_sobre drop column como_trabalhamos_2;
