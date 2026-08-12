import { createAdminClient } from "@/lib/supabase/admin";

export type Diferencial = {
  titulo: string;
  descricao: string;
};

export type PaginaSobre = {
  headline: string;
  introducao: string;
  /** HTML gerado pelo RichTextEditor (negrito/itálico/sublinhado/listas). */
  comoTrabalhamos: string;
  diferenciais: Diferencial[];
};

// Conteúdo editorial de /sobre — gerenciado pela gerência em
// /painel/site/sobre (tabela `pagina_sobre`, migrations 0026/0027). Leitura
// pública segue o mesmo padrão de src/lib/content/servicos.ts:
// createAdminClient() no servidor, sem depender de RLS pra visitante
// anônimo.
export async function getPaginaSobre(): Promise<PaginaSobre> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pagina_sobre")
    .select("headline, introducao, como_trabalhamos, diferenciais")
    .eq("id", true)
    .single();

  if (error || !data) {
    throw new Error(`Falha ao carregar página Sobre: ${error?.message ?? "não encontrado"}`);
  }

  return {
    headline: data.headline,
    introducao: data.introducao,
    comoTrabalhamos: data.como_trabalhamos,
    diferenciais: data.diferenciais,
  };
}
