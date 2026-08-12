const FIPE_BASE_URL = "https://fipe.parallelum.com.br/api/v2";
const TIPOS_FIPE = ["cars", "trucks"] as const;
type TipoFipe = (typeof TIPOS_FIPE)[number];

export type MarcaFipe = {
  nome: string;
  refs: { tipo: TipoFipe; codigo: string }[];
};

let cacheMarcas: MarcaFipe[] | null = null;
const cacheModelos = new Map<string, string[]>();

/** Busca marcas de carros e caminhões/ônibus na FIPE (gratuita, sem chave) e mescla por nome. */
export async function buscarMarcasFipe(): Promise<MarcaFipe[]> {
  if (cacheMarcas) return cacheMarcas;

  const porNome = new Map<string, MarcaFipe>();
  try {
    await Promise.all(
      TIPOS_FIPE.map(async (tipo) => {
        const resposta = await fetch(`${FIPE_BASE_URL}/${tipo}/brands`);
        if (!resposta.ok) return;
        const dados: { code: string; name: string }[] = await resposta.json();
        for (const { code, name } of dados) {
          const chave = name.trim().toLowerCase();
          const existente = porNome.get(chave);
          if (existente) {
            existente.refs.push({ tipo, codigo: code });
          } else {
            porNome.set(chave, { nome: name.trim(), refs: [{ tipo, codigo: code }] });
          }
        }
      }),
    );
  } catch {
    return [];
  }

  const marcas = Array.from(porNome.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (marcas.length > 0) cacheMarcas = marcas;
  return marcas;
}

/** Busca modelos de uma marca (em todas as categorias em que ela existe) e mescla por nome. */
export async function buscarModelosFipe(marca: MarcaFipe): Promise<string[]> {
  const chaveCache = marca.nome.toLowerCase();
  const cacheado = cacheModelos.get(chaveCache);
  if (cacheado) return cacheado;

  const nomes = new Set<string>();
  try {
    await Promise.all(
      marca.refs.map(async ({ tipo, codigo }) => {
        const resposta = await fetch(`${FIPE_BASE_URL}/${tipo}/brands/${codigo}/models`);
        if (!resposta.ok) return;
        const dados: { name: string }[] = await resposta.json();
        for (const { name } of dados) nomes.add(name.trim());
      }),
    );
  } catch {
    return [];
  }

  const modelos = Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (modelos.length > 0) cacheModelos.set(chaveCache, modelos);
  return modelos;
}
