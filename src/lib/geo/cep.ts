export type EnderecoCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
};

/** Geocodifica pelo centro da cidade — usado quando o CEP não tem coordenada própria, pra sempre ter ao menos uma distância aproximada. */
async function geocodarCidade(cidade: string, uf: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!cidade || !uf) return null;
  try {
    const params = new URLSearchParams({ city: cidade, state: uf, country: "Brasil", format: "json", limit: "1" });
    const resposta = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "Accept-Language": "pt-BR" },
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    const primeiro = dados[0];
    if (!primeiro) return null;
    return { latitude: Number(primeiro.lat), longitude: Number(primeiro.lon) };
  } catch {
    return null;
  }
}

/**
 * Busca endereço por CEP via BrasilAPI (gratuita, sem chave). Quando o
 * provedor de origem não tem a coordenada exata do CEP, cai pro centro da
 * cidade (geocodificado à parte) — assim o sistema sempre consegue estimar
 * ao menos uma distância média, em vez de exigir preenchimento manual.
 */
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoCep | null> {
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) return null;

  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepLimpo}`);
    if (!resposta.ok) return null;
    const dados = await resposta.json();

    const logradouro = dados.street ?? "";
    const bairro = dados.neighborhood ?? "";
    const cidade = dados.city ?? "";
    const uf = dados.state ?? "";
    let latitude = dados.location?.coordinates?.latitude ?? null;
    let longitude = dados.location?.coordinates?.longitude ?? null;

    if (latitude === null || longitude === null) {
      const aproximado = await geocodarCidade(cidade, uf);
      latitude = aproximado?.latitude ?? null;
      longitude = aproximado?.longitude ?? null;
    }

    return { logradouro, bairro, cidade, uf, latitude, longitude };
  } catch {
    return null;
  }
}
