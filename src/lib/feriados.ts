export type TipoFeriado = "nacional" | "facultativo";

export type Feriado = {
  data: string; // yyyy-MM-dd
  nome: string;
  tipo: TipoFeriado;
};

function paraChave(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Data da Páscoa (domingo) pelo algoritmo de Meeus/Jones/Butcher, calendário gregoriano. */
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function somarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function formatarData(data: Date): string {
  return paraChave(data.getFullYear(), data.getMonth() + 1, data.getDate());
}

/**
 * Feriados nacionais do Brasil pra um ano — fixos + móveis calculados a
 * partir da Páscoa. Não depende de cadastro manual: funciona pra qualquer
 * ano passado ou futuro.
 */
export function getFeriadosNacionais(ano: number): Feriado[] {
  const pascoa = calcularPascoa(ano);

  const fixos: Feriado[] = [
    { data: paraChave(ano, 1, 1), nome: "Confraternização Universal", tipo: "nacional" },
    { data: paraChave(ano, 4, 21), nome: "Tiradentes", tipo: "nacional" },
    { data: paraChave(ano, 5, 1), nome: "Dia do Trabalho", tipo: "nacional" },
    { data: paraChave(ano, 9, 7), nome: "Independência do Brasil", tipo: "nacional" },
    { data: paraChave(ano, 10, 12), nome: "Nossa Senhora Aparecida", tipo: "nacional" },
    { data: paraChave(ano, 11, 2), nome: "Finados", tipo: "nacional" },
    { data: paraChave(ano, 11, 15), nome: "Proclamação da República", tipo: "nacional" },
    { data: paraChave(ano, 12, 25), nome: "Natal", tipo: "nacional" },
  ];

  // Feriado nacional a partir de 2024 (Lei 14.759/2023) — não retroage a anos anteriores.
  if (ano >= 2024) {
    fixos.push({
      data: paraChave(ano, 11, 20),
      nome: "Dia Nacional de Zumbi e da Consciência Negra",
      tipo: "nacional",
    });
  }

  const moveis: Feriado[] = [
    { data: formatarData(somarDias(pascoa, -48)), nome: "Carnaval (segunda-feira)", tipo: "facultativo" },
    { data: formatarData(somarDias(pascoa, -47)), nome: "Carnaval (terça-feira)", tipo: "facultativo" },
    { data: formatarData(somarDias(pascoa, -2)), nome: "Sexta-feira Santa", tipo: "nacional" },
    { data: formatarData(somarDias(pascoa, 60)), nome: "Corpus Christi", tipo: "facultativo" },
  ];

  return [...fixos, ...moveis].sort((a, b) => a.data.localeCompare(b.data));
}

/** Feriados de vários anos, indexados por data (yyyy-MM-dd) pra lookup O(1) por dia. */
export function getFeriadosNoIntervalo(anos: number[]): Record<string, Feriado> {
  const mapa: Record<string, Feriado> = {};
  for (const ano of new Set(anos)) {
    for (const feriado of getFeriadosNacionais(ano)) {
      mapa[feriado.data] = feriado;
    }
  }
  return mapa;
}
