import { createAdminClient } from "@/lib/supabase/admin";

export type ServicoImage = {
  src: string;
  alt: string;
};

export type Servico = {
  slug: string;
  titulo: string;
  resumo: string;
  headline: string;
  subheadline: string;
  coverImage: ServicoImage;
  galleryImages: ServicoImage[];
  normas?: string[];
  beneficios: string[];
  metodologia: Array<{
    titulo: string;
    descricao: string;
    imagem?: ServicoImage;
  }>;
  entregaveis: string[];
  exibirNaHome: boolean;
};

export type MosaicImage = ServicoImage & { label: string; servicoSlug: string };

// Conteúdo gerenciado pela gerência em /painel/servicos (tabela `servicos`,
// ver supabase/migrations/0023_servicos_cms.sql). Leitura pública segue o
// mesmo padrão de (documento-publico)/laudo e /proposta: createAdminClient()
// no servidor, sem depender de RLS pra visitante anônimo, filtrando
// publicado = true explicitamente na query.

const SELECT_COLUMNS =
  "slug, titulo, resumo, headline, subheadline, normas, beneficios, entregaveis, " +
  "cover_image_url, cover_image_alt, cover_destaque_mosaico, galeria, metodologia, ordem, exibir_na_home";

type GaleriaImagemRow = { url: string; alt: string; destaque_mosaico?: boolean };
type MetodologiaEtapaRow = {
  titulo: string;
  descricao: string;
  imagem_url?: string | null;
  imagem_alt?: string | null;
};

type ServicoRow = {
  slug: string;
  titulo: string;
  resumo: string;
  headline: string;
  subheadline: string;
  normas: string[];
  beneficios: string[];
  entregaveis: string[];
  cover_image_url: string;
  cover_image_alt: string;
  cover_destaque_mosaico: boolean;
  galeria: GaleriaImagemRow[];
  metodologia: MetodologiaEtapaRow[];
  ordem: number;
  exibir_na_home: boolean;
};

function mapRowParaServico(row: ServicoRow): Servico {
  return {
    slug: row.slug,
    titulo: row.titulo,
    resumo: row.resumo,
    headline: row.headline,
    subheadline: row.subheadline,
    coverImage: { src: row.cover_image_url, alt: row.cover_image_alt },
    galleryImages: row.galeria.map((imagem) => ({ src: imagem.url, alt: imagem.alt })),
    normas: row.normas.length > 0 ? row.normas : undefined,
    beneficios: row.beneficios,
    metodologia: row.metodologia.map((etapa) => ({
      titulo: etapa.titulo,
      descricao: etapa.descricao,
      imagem: etapa.imagem_url ? { src: etapa.imagem_url, alt: etapa.imagem_alt ?? "" } : undefined,
    })),
    entregaveis: row.entregaveis,
    exibirNaHome: row.exibir_na_home,
  };
}

export async function getServicos(): Promise<Servico[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("servicos")
    .select(SELECT_COLUMNS)
    .eq("publicado", true)
    .order("ordem");

  if (error) throw new Error(`Falha ao carregar serviços: ${error.message}`);
  return ((data ?? []) as unknown as ServicoRow[]).map(mapRowParaServico);
}

export async function getServicoBySlug(slug: string): Promise<Servico | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("servicos")
    .select(SELECT_COLUMNS)
    .eq("publicado", true)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar serviço: ${error.message}`);
  return data ? mapRowParaServico(data as unknown as ServicoRow) : undefined;
}

// Fotos em destaque no mosaico "Fotos reais" da home — controlado pela
// gerência (checkbox por foto no painel), pra nunca misturar fotos de banco
// de imagens (serviços que ainda não têm registro próprio) com o mosaico
// que promete "sem banco de imagens".
export async function getMosaicImages(limit = 5): Promise<MosaicImage[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("servicos")
    .select("slug, titulo, cover_image_url, cover_image_alt, cover_destaque_mosaico, galeria")
    .eq("publicado", true)
    .order("ordem");

  if (error) throw new Error(`Falha ao carregar mosaico: ${error.message}`);

  // Fotos marcadas em destaque, agrupadas por serviço (capa primeiro, depois
  // galeria, na ordem em que aparecem no cadastro).
  const porServico: MosaicImage[][] = [];
  for (const row of (data ?? []) as Pick<
    ServicoRow,
    "slug" | "titulo" | "cover_image_url" | "cover_image_alt" | "cover_destaque_mosaico" | "galeria"
  >[]) {
    const fotos: MosaicImage[] = [];
    if (row.cover_destaque_mosaico) {
      fotos.push({ src: row.cover_image_url, alt: row.cover_image_alt, label: row.titulo, servicoSlug: row.slug });
    }
    for (const imagem of row.galeria) {
      if (imagem.destaque_mosaico) {
        fotos.push({ src: imagem.url, alt: imagem.alt, label: row.titulo, servicoSlug: row.slug });
      }
    }
    if (fotos.length > 0) porServico.push(fotos);
  }

  // Intercala 1 foto por serviço a cada rodada, em vez de simplesmente
  // pegar as N primeiras na ordem dos serviços. Sem isso, um serviço com
  // várias fotos marcadas (ex.: capa + 2 da galeria) sozinho já enche as 5
  // vagas do mosaico, e marcar uma foto de um 4º/5º serviço nunca aparece
  // — não é a marcação que "desativa sozinha", ela só nunca ganha vaga.
  const pool: MosaicImage[] = [];
  for (let rodada = 0; pool.length < limit && porServico.some((fotos) => fotos.length > rodada); rodada++) {
    for (const fotos of porServico) {
      if (pool.length >= limit) break;
      if (fotos[rodada]) pool.push(fotos[rodada]);
    }
  }
  return pool;
}
