// Extrai as linhas de uma tabela de emissões da ANFAVEA (marcha lenta,
// rotação de corte/máxima livre, índice de fumaça acima de 350m — a
// operação da empresa é sempre acima de 350m, ver `resolverLimitesTeste`)
// publicada em PDF por fabricante, regulamentada pela Instrução Normativa
// Ibama 127/2006.
//
// Abordagem: header-driven, não uma "receita" fixa por fabricante — lê o
// bloco de cabeçalho (que costuma vir quebrado em 2-3 linhas), agrupa os
// fragmentos de texto em colunas por posição X e casa cada coluna com um
// campo reconhecido por palavra-chave. A notação de cada célula varia por
// fabricante (faixa direta, tolerância ± simétrica/assimétrica, ou 3
// colunas prontas de mín/típico/máx) — todas tentadas automaticamente.
//
// Só cobre tabelas "linha por veículo" (a maioria dos PDFs, gerados como
// exportação de planilha). Alguns fabricantes publicam a tabela
// transposta (cada COLUNA é um veículo — ex. Scania, Toyota) — layout
// arriscado de extrair por posição sem conferência visual do PDF real,
// então não é interpretado aqui: `parseTabelaAnfavea` lança erro claro e
// quem chama trata isso como "sem parser automático pra essa marca" (a
// marca segue cadastrada em `fontes_anfavea` pra monitorar atualização,
// só que a entrada de dados fica manual, pelo formulário de sempre).
//
// Nenhuma linha extraída é confirmada sozinha — toda importação nasce
// `status: 'pendente_revisao'` em `especificacoes_motor` (ver
// `src/app/painel/especificacoes-motor/actions.ts`), mesmo vindo direto
// da fonte oficial.

/**
 * PDF nem é uma tabela oficial da ANFAVEA (sem a referência regulatória) — diferente
 * de "é da ANFAVEA mas o layout não é reconhecível" (erro genérico, tratado como falha
 * de parser: a fonte ainda é gravada/monitorada). Esse aqui quem chama deve propagar
 * sem gravar nada — ver `importarTabelaAnfaveaInterno`.
 */
export class ConteudoInvalidoError extends Error {}

export type LinhaAnfavea = {
  modelo: string;
  identificacaoMotor: string;
  marchaLentaMin: number;
  marchaLentaMax: number;
  rotacaoCorteMin: number;
  rotacaoCorteMax: number;
  limiteOpacidade: number;
};

type Fragmento = { x: number; y: number; str: string };

async function extrairFragmentos(buffer: Buffer): Promise<Fragmento[][]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;

  const paginas: Fragmento[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const frags: Fragmento[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      frags.push({ x: item.transform[4], y: Math.round(item.transform[5]), str: item.str.trim() });
    }
    paginas.push(frags);
  }
  return paginas;
}

/** Agrupa fragmentos em linhas por Y (tolerância 2pt), cada linha já ordenada por X (esquerda -> direita). */
function agruparLinhas(frags: Fragmento[]): Fragmento[][] {
  const grupos = new Map<number, Fragmento[]>();
  for (const f of frags) {
    const chave = [...grupos.keys()].find((k) => Math.abs(k - f.y) <= 2) ?? f.y;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(f);
  }
  return [...grupos.entries()]
    .sort((a, b) => b[0] - a[0]) // topo -> base
    .map(([, fs]) => fs.sort((a, b) => a.x - b.x));
}

type Campo = "modelo" | "motor" | "marchaLenta" | "rotacaoCorte" | "opacidade" | "ignorar";

const PALAVRAS_CHAVE: { campo: Campo; regex: RegExp }[] = [
  { campo: "motor", regex: /IDENTIFICA[ÇC].{0,3}O.*MOTOR|\bMOTOR\)|MODELO DO MOTOR|TIPO DO MOTOR/i },
  { campo: "marchaLenta", regex: /MARCHA\s*LENTA|\bM\s*L\b/i },
  { campo: "rotacaoCorte", regex: /ROTA[ÇC].{0,3}O.*CORTE|M[ÁA]X(?:IMA)?\.?\s*LIVRE|RPM\s*CORTE/i },
  { campo: "opacidade", regex: /ACIMA\s*DE?\s*350|FUMA[ÇC]A.*ACIMA|OPACIDADE/i },
  { campo: "ignorar", regex: /AT[ÉE]\s*350/i }, // índice até 350m — fora de escopo, sempre "acima de 350m"
  { campo: "modelo", regex: /MARCA\s*\/?\s*MODELO|MODELO\s*\/?\s*VERS[ÃA]O/i },
];

// Bem mais solto que PALAVRAS_CHAVE (que classifica a coluna) — só decide se
// uma LINHA faz parte do bloco de cabeçalho, que costuma quebrar em 2-3
// linhas com palavras isoladas ("marcha" numa linha, "lenta" na de baixo).
// Cada item é testado separadamente (não um regex só) porque uma linha só
// conta como cabeçalho se bater em pelo menos 2 categorias DIFERENTES — uma
// batida só é fácil demais de acontecer por coincidência (ex.: um código de
// modelo "VW/MIN/POWER." bate sozinho em "MIN", sem ser cabeçalho de nada).
const PISTAS_CABECALHO: RegExp[] = [
  /MARCA/i,
  /MODELO/i,
  /VERS[ÃA]O/i,
  /MOTOR/i,
  /IDENTIFICA/i,
  /ROTA[ÇC][ÃA]O/i,
  /MARCHA/i,
  /LENTA/i,
  /LIVRE/i,
  /CORTE/i,
  /FUMA[ÇC]A/i,
  /OPACIDADE/i,
  /\b350\b/i,
  /\bM[ÁA]X\b/i,
  /\bM[ÍI]N\b/i,
  /N[ºO°]/i,
  /SOLIC/i,
  /INFOSERV/i,
  /POT[ÊE]NCIA/i,
  /RU[ÍI]DO/i,
];

type Coluna = { campo: Campo; xMin: number; xMax: number; centro: number; sufixo: "min" | "max" | null };

/**
 * Candidatos a zona de cabeçalho: todo trecho contínuo de linhas "com cara
 * de cabeçalho". Pode haver mais de um (título decorativo da página batendo
 * por acaso com alguma palavra-chave, ex. "NÍVEL MÁXIMO DE EMISSÃO SONORA")
 * — quem chama testa cada candidato e fica com o primeiro que realmente
 * resolve todas as colunas obrigatórias, não necessariamente o primeiro da
 * página.
 */
function acharBlocosCabecalho(linhas: Fragmento[][]): { cabecalho: Fragmento[]; primeiraLinhaDado: number }[] {
  const blocos: { cabecalho: Fragmento[]; primeiraLinhaDado: number }[] = [];
  let atual: Fragmento[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const categoriasBatidas = new Set(
      linhas[i].flatMap((f) => PISTAS_CABECALHO.map((r, idx) => (r.test(f.str) ? idx : -1)).filter((idx) => idx >= 0)),
    );
    const pareceCabecalho = categoriasBatidas.size >= 2;
    if (pareceCabecalho) {
      atual.push(...linhas[i]);
      continue;
    }
    if (atual.length > 0) {
      blocos.push({ cabecalho: atual, primeiraLinhaDado: i });
      atual = [];
    }
  }
  if (atual.length > 0) blocos.push({ cabecalho: atual, primeiraLinhaDado: linhas.length });
  return blocos;
}

/** Agrupa fragmentos do cabeçalho em colunas por X (tolerância maior, cabeçalho quebra em várias linhas) e casa cada coluna com um campo. */
function detectarColunas(cabecalho: Fragmento[]): Coluna[] {
  const grupos: { x: number; frags: Fragmento[] }[] = [];
  for (const f of cabecalho.sort((a, b) => a.x - b.x)) {
    const grupo = grupos.find((g) => Math.abs(g.x - f.x) <= 20);
    if (grupo) {
      grupo.frags.push(f);
      grupo.x = (grupo.x + f.x) / 2;
    } else {
      grupos.push({ x: f.x, frags: [f] });
    }
  }

  const colunas: Coluna[] = [];
  for (const g of grupos) {
    const texto = g.frags
      .sort((a, b) => b.y - a.y)
      .map((f) => f.str)
      .join(" ");
    const match = PALAVRAS_CHAVE.find((p) => p.regex.test(texto));
    if (!match || match.campo === "ignorar") continue;
    const xs = g.frags.map((f) => f.x);
    const sufixo = /\bmin\b/i.test(texto) ? "min" : /\bm[áa]x\b/i.test(texto) ? "max" : null;
    colunas.push({ campo: match.campo, xMin: Math.min(...xs) - 6, xMax: Math.max(...xs) + 6, centro: g.x, sufixo });
  }
  return colunas;
}

function fragmentoDaColuna(linha: Fragmento[], coluna: Coluna): string | null {
  let melhor: Fragmento | null = null;
  let melhorDist = Infinity;
  for (const f of linha) {
    const dist = Math.abs(f.x - coluna.centro);
    if (dist < melhorDist && dist <= 50) {
      melhor = f;
      melhorDist = dist;
    }
  }
  return melhor?.str ?? null;
}

function parseNumeroBr(raw: string): number {
  return Number(raw.replace(/\./g, "").replace(",", "."));
}

/** Tenta as notações conhecidas, na ordem (assimétrica antes de simétrica — o "+" da assimétrica bate no regex genérico de faixa se testado primeiro). */
function parseFaixaCelula(raw: string): { min: number; max: number } | null {
  const limpo = raw.trim();

  const assimetrica = limpo.match(/^(\d{2,5})\s*\+\s*(\d{1,4})\s*\/\s*-\s*(\d{1,4})$/);
  if (assimetrica) {
    const base = Number(assimetrica[1]);
    return { min: base - Number(assimetrica[3]), max: base + Number(assimetrica[2]) };
  }

  const simetrica = limpo.match(/^(\d{2,5})\s*(?:±|\+\/-|\+-)\s*(\d{1,4})$/);
  if (simetrica) {
    const base = Number(simetrica[1]);
    const tol = Number(simetrica[2]);
    return { min: base - tol, max: base + tol };
  }

  const faixa = limpo.match(/^(\d{2,5})\s*-\s*(\d{2,5})$/);
  if (faixa) {
    return { min: Number(faixa[1]), max: Number(faixa[2]) };
  }

  return null;
}

/**
 * Agrupa colunas "min"/""/"max" do mesmo campo (ex.: VW: "rpm M L min",
 * "rpm M L", "rpm M L max") em uma única coluna lógica com min/max — ou
 * mantém como coluna única (notação embutida na célula, ex.: MBB "760 +
 * 100/- 50") quando não há sufixo min/max separado.
 */
function consolidarColunas(colunas: Coluna[]): { campo: Campo; min: Coluna; max: Coluna | null }[] {
  const porCampo = new Map<Campo, Coluna[]>();
  for (const c of colunas) {
    if (!porCampo.has(c.campo)) porCampo.set(c.campo, []);
    porCampo.get(c.campo)!.push(c);
  }

  const resultado: { campo: Campo; min: Coluna; max: Coluna | null }[] = [];
  for (const [campo, cols] of porCampo) {
    if (campo === "modelo" || campo === "motor") {
      resultado.push({ campo, min: cols.sort((a, b) => a.centro - b.centro)[0], max: null });
      continue;
    }
    const colMin = cols.find((c) => c.sufixo === "min");
    const colMax = cols.find((c) => c.sufixo === "max");
    if (colMin && colMax) {
      resultado.push({ campo, min: colMin, max: colMax });
    } else {
      const unica = cols.sort((a, b) => a.centro - b.centro)[0];
      resultado.push({ campo, min: unica, max: null });
    }
  }
  return resultado;
}

// Referência regulatória que toda tabela oficial da ANFAVEA cita (ex.: "Instrução
// Normativa Ibama No 127, de 24 de outubro de 2006") — confere isso ANTES de tentar
// achar colunas, pra rejeitar de cara um PDF qualquer (não-ANFAVEA, ou uma tabela da
// ANFAVEA que não é de emissões diesel) em vez de arriscar "reconhecer" colunas por
// coincidência de palavra-chave num documento errado.
const REFERENCIA_REGULATORIA = /IBAMA.{0,20}127|PROCONVE/i;

export async function parseTabelaAnfavea(buffer: Buffer): Promise<LinhaAnfavea[]> {
  const paginas = await extrairFragmentos(buffer);

  const textoCompleto = paginas.flat().map((f) => f.str).join(" ");
  if (!REFERENCIA_REGULATORIA.test(textoCompleto)) {
    throw new ConteudoInvalidoError(
      "Esse PDF não parece ser uma tabela oficial de emissões da ANFAVEA (não encontrei a referência à Instrução Normativa Ibama 127/2006 nem ao PROCONVE). Confira a URL antes de importar.",
    );
  }

  const linhasResultado: LinhaAnfavea[] = [];

  for (const frags of paginas) {
    const linhas = agruparLinhas(frags);
    const blocos = acharBlocosCabecalho(linhas);

    let escolhido: { primeiraLinhaDado: number; colModelo: Coluna; colMotor: Coluna; colMarchaLenta: ReturnType<typeof consolidarColunas>[number]; colRotacaoCorte: ReturnType<typeof consolidarColunas>[number]; colOpacidade: ReturnType<typeof consolidarColunas>[number] } | null = null;

    for (const { cabecalho, primeiraLinhaDado } of blocos) {
      const colunas = detectarColunas(cabecalho);
      const consolidadas = consolidarColunas(colunas);
      const colModelo = consolidadas.find((c) => c.campo === "modelo");
      const colMotor = consolidadas.find((c) => c.campo === "motor");
      const colMarchaLenta = consolidadas.find((c) => c.campo === "marchaLenta");
      const colRotacaoCorte = consolidadas.find((c) => c.campo === "rotacaoCorte");
      const colOpacidade = consolidadas.find((c) => c.campo === "opacidade");

      if (colModelo && colMotor && colMarchaLenta && colRotacaoCorte && colOpacidade) {
        escolhido = { primeiraLinhaDado, colModelo: colModelo.min, colMotor: colMotor.min, colMarchaLenta, colRotacaoCorte, colOpacidade };
        break;
      }
    }

    if (!escolhido) continue; // nenhum bloco da página resolveu as colunas obrigatórias
    const { primeiraLinhaDado, colModelo, colMotor, colMarchaLenta, colRotacaoCorte, colOpacidade } = escolhido;

    for (let i = primeiraLinhaDado; i < linhas.length; i++) {
      const linha = linhas[i];
      // "modelo" é só rótulo pra tela de revisão (a chave de upsert em
      // `especificacoes_motor` é marca+identificacaoMotor, ver upsertEspecificacaoMotor)
      // — não trava a linha se o alinhamento da coluna de modelo não bater
      // perfeitamente, só o motor e os 3 limites numéricos importam de verdade.
      const modelo = fragmentoDaColuna(linha, colModelo) ?? "(modelo não identificado)";
      const motor = fragmentoDaColuna(linha, colMotor);
      if (!motor) continue;

      const marchaLenta = colMarchaLenta.max
        ? tentarParFixo(linha, colMarchaLenta)
        : parseFaixaCelula(fragmentoDaColuna(linha, colMarchaLenta.min) ?? "");
      const rotacaoCorte = colRotacaoCorte.max
        ? tentarParFixo(linha, colRotacaoCorte)
        : parseFaixaCelula(fragmentoDaColuna(linha, colRotacaoCorte.min) ?? "");
      const opacidadeRaw = fragmentoDaColuna(linha, colOpacidade.min);
      const opacidade = opacidadeRaw && /^[\d.,]+$/.test(opacidadeRaw) ? parseNumeroBr(opacidadeRaw) : null;

      if (!marchaLenta || !rotacaoCorte || opacidade === null) continue;

      linhasResultado.push({
        modelo,
        identificacaoMotor: motor,
        marchaLentaMin: marchaLenta.min,
        marchaLentaMax: marchaLenta.max,
        rotacaoCorteMin: rotacaoCorte.min,
        rotacaoCorteMax: rotacaoCorte.max,
        limiteOpacidade: opacidade,
      });
    }
  }

  if (linhasResultado.length === 0) {
    throw new Error(
      "Não foi possível reconhecer a tabela desse PDF automaticamente (formato de colunas não identificado ou layout transposto). Cadastre a especificação manualmente pelo formulário de sempre.",
    );
  }

  return linhasResultado;
}

function tentarParFixo(linha: Fragmento[], par: { min: Coluna; max: Coluna | null }): { min: number; max: number } | null {
  const minRaw = fragmentoDaColuna(linha, par.min);
  const maxRaw = par.max ? fragmentoDaColuna(linha, par.max) : null;
  if (!minRaw || !maxRaw || !/^\d{2,5}$/.test(minRaw) || !/^\d{2,5}$/.test(maxRaw)) return null;
  return { min: Number(minRaw), max: Number(maxRaw) };
}
