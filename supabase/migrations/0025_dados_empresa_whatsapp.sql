-- Número de WhatsApp (dígitos com DDI 55) usado nos links de clique-pra-
-- chamar e wa.me do site público — mesma informação que `telefone` (que já
-- existe pra assinatura do PDF), só que em formato de link em vez de texto
-- formatado. Editável em /painel/site (a gerência digita um único número;
-- o form deriva telefone formatado + whatsapp automaticamente).
alter table public.dados_empresa add column whatsapp text;

update public.dados_empresa set whatsapp = '5531997901568' where id = true;

alter table public.dados_empresa alter column whatsapp set not null;
