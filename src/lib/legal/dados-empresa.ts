import { createAdminClient } from "@/lib/supabase/admin";

export type DadosEmpresa = {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  /** Formatado pra exibição: "(31) 99790-1568". */
  telefone: string;
  /** Só dígitos, com DDI: "5531997901568" — usado em links tel:/wa.me. */
  whatsapp: string;
};

// Dados da empresa editáveis pela gerência (razão social/CNPJ/endereço em
// Configurações → Empresa; telefone/whatsapp também em /painel/site, form
// mais simples) — mesma tabela `dados_empresa` que alimenta o rodapé do PDF
// de laudo/orçamento (migration 0015). Leitura pública segue o mesmo
// padrão de src/lib/content/servicos.ts: createAdminClient() no servidor,
// sem depender de RLS pra visitante anônimo.
export async function getDadosEmpresa(): Promise<DadosEmpresa> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dados_empresa")
    .select("razao_social, cnpj, endereco, telefone, whatsapp")
    .eq("id", true)
    .single();

  if (error || !data) {
    throw new Error(`Falha ao carregar dados da empresa: ${error?.message ?? "não encontrado"}`);
  }
  return {
    razaoSocial: data.razao_social,
    cnpj: data.cnpj,
    endereco: data.endereco,
    telefone: data.telefone,
    whatsapp: data.whatsapp,
  };
}
