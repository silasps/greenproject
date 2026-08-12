import { createAdminClient } from "@/lib/supabase/admin";

export type HeroSlide = {
  id: string;
  servico: string;
  imagemUrl: string;
  imagemAlt: string;
  posicao: string;
  descricao: string;
  linkHref: string;
};

export const HERO_SERVICO_MAX = 40;
export const HERO_DESCRICAO_MAX = 160;

// Slides do carrossel da home — gerenciados pela gerência em
// /painel/site/hero (tabela `hero_slides`, migration 0028). Leitura
// pública segue o mesmo padrão de src/lib/content/servicos.ts:
// createAdminClient() no servidor, sem depender de RLS pra visitante
// anônimo.
export async function getHeroSlides(): Promise<HeroSlide[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hero_slides")
    .select("id, servico, imagem_url, imagem_alt, posicao, descricao, link_href")
    .order("ordem");

  if (error) throw new Error(`Falha ao carregar slides do Hero: ${error.message}`);

  return ((data ?? []) as unknown as Array<{
    id: string;
    servico: string;
    imagem_url: string;
    imagem_alt: string;
    posicao: string;
    descricao: string;
    link_href: string;
  }>).map((row) => ({
    id: row.id,
    servico: row.servico,
    imagemUrl: row.imagem_url,
    imagemAlt: row.imagem_alt,
    posicao: row.posicao,
    descricao: row.descricao,
    linkHref: row.link_href,
  }));
}
