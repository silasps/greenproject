// Dados oficiais da empresa — extraídos dos laudos reais já emitidos.
// Confirmar/ajustar o nome do encarregado de dados (DPO) antes de publicar.
//
// telefone/whatsapp NÃO ficam aqui — mudam com frequência (linha nova,
// portabilidade etc.) e são editáveis pela gerência em /painel/site
// (tabela `dados_empresa`, ver getDadosContato() abaixo).
export const COMPANY = {
  razaoSocial: "Greenproject Engenharia Mecânica LTDA",
  cnpj: "44.660.456/0001-53",
  endereco: "R. Monsenhor Messias, 1093 - Flamengo, Contagem - MG",
  email: "engenharia@greenproject.com.br",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://greenproject.com.br",
  // TODO: confirmar quem será o Encarregado de Dados (DPO) formal antes de publicar.
  encarregadoDados: {
    nome: "A definir",
    email: "engenharia@greenproject.com.br",
  },
} as const;
