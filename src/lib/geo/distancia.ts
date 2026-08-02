export type Coordenada = { latitude: number; longitude: number };

// Geocodificado uma vez a partir de COMPANY.endereco (R. Monsenhor Messias,
// 1093 - Flamengo, Contagem - MG). Ajustar aqui se a empresa mudar de sede.
export const COORDENADAS_EMPRESA: Coordenada = {
  latitude: -19.9317,
  longitude: -44.0536,
};

const RAIO_TERRA_KM = 6371;

function paraRadianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

/** Distância em linha reta (km) entre duas coordenadas — fórmula de haversine. */
export function haversineKm(a: Coordenada, b: Coordenada): number {
  const dLat = paraRadianos(b.latitude - a.latitude);
  const dLon = paraRadianos(b.longitude - a.longitude);
  const lat1 = paraRadianos(a.latitude);
  const lat2 = paraRadianos(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return RAIO_TERRA_KM * 2 * Math.asin(Math.sqrt(h));
}
