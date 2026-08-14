// Extrai os dados de MEDIÇÃO do PDF exportado pelo software do opacímetro
// (Syscon). De propósito, só lê dados de medição (número do ensaio,
// opacidade por ciclo, média, resultado) — não dados cadastrais de
// cliente/veículo, que já existem nesta plataforma (ver plano do projeto).
//
// Abordagem: pdfjs-dist reconstrói as linhas de texto a partir da posição
// (x, y) de cada fragmento — o layout em colunas do PDF do Syscon faz a
// extração "na ordem do texto" sair fora de ordem, então agrupamos por
// linha (y) e ordenamos por coluna (x) antes de aplicar os regex.
//
// Nota: parser construído a partir do padrão observado no PDF de exemplo
// fornecido pela empresa; os campos ficam sempre editáveis na tela de
// importação para o escritório corrigir manualmente se algo sair diferente.

export type MedicaoCiclo = { ciclo: number; opacidadeM1: number };

export type EnsaioSyscon = {
  numeroEnsaio: string | null;
  medicoes: MedicaoCiclo[];
  mediaM1: number | null;
  resultado: "aprovado" | "reprovado" | null;
  // Limites configurados no opacímetro pra esse ensaio (o próprio PDF do
  // Syscon já traz — não precisa depender do cadastro manual do veículo,
  // que fica em branco na maioria das vezes). Ver seção "Dados do Veículo"
  // do PDF: "Limite Marcha Lenta: 800 - 900", "Limite Rotação Corte: 4100
  // - 4300", "Limite Opacidade: 1,19".
  limiteMarchaLentaMin: number | null;
  limiteMarchaLentaMax: number | null;
  limiteRotacaoCorteMin: number | null;
  limiteRotacaoCorteMax: number | null;
  limiteOpacidade: number | null;
  /** "Km Atual" no PDF — muda a cada ensaio, não é um dado fixo do veículo. */
  kmAtual: number | null;
};

function parseNumeroBr(raw: string): number {
  return Number(raw.replace(/\./g, "").replace(",", "."));
}

async function extrairLinhas(buffer: Buffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;

  const linhasPorPagina: string[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    const grupos = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const chave = [...grupos.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push({ x, str: item.str.trim() });
    }

    const linhas = [...grupos.entries()]
      .sort((a, b) => b[0] - a[0]) // topo -> base
      .map(([, frags]) => frags.sort((a, b) => a.x - b.x).map((f) => f.str).join(" "));

    linhasPorPagina.push(linhas);
  }

  return linhasPorPagina.flat();
}

export async function parseEnsaioSyscon(buffer: Buffer): Promise<EnsaioSyscon> {
  const linhas = await extrairLinhas(buffer);
  const texto = linhas.join("\n");

  const numeroMatch = texto.match(/Ensaio Armazenado Opac[íi]metro\s+(\d+)/i);
  const numeroEnsaio = numeroMatch ? numeroMatch[1] : null;

  const mediaMatch = texto.match(/M[ée]dia:?\s*([\d.,]+)/i);
  const mediaM1 = mediaMatch ? parseNumeroBr(mediaMatch[1]) : null;

  let resultado: "aprovado" | "reprovado" | null = null;
  if (/\bAPROVADO\b/i.test(texto)) resultado = "aprovado";
  else if (/\bREPROVADO\b/i.test(texto)) resultado = "reprovado";

  const marchaLentaMatch = texto.match(/Limite Marcha Lenta:\s*([\d]+)\s*-\s*([\d]+)/i);
  const rotacaoCorteMatch = texto.match(/Limite Rota[çc][ãa]o Corte:\s*([\d]+)\s*-\s*([\d]+)/i);
  const opacidadeMatch = texto.match(/Limite Opacidade:\s*([\d.,]+)/i);
  const limiteMarchaLentaMin = marchaLentaMatch ? Number(marchaLentaMatch[1]) : null;
  const limiteMarchaLentaMax = marchaLentaMatch ? Number(marchaLentaMatch[2]) : null;
  const limiteRotacaoCorteMin = rotacaoCorteMatch ? Number(rotacaoCorteMatch[1]) : null;
  const limiteRotacaoCorteMax = rotacaoCorteMatch ? Number(rotacaoCorteMatch[2]) : null;
  const limiteOpacidade = opacidadeMatch ? parseNumeroBr(opacidadeMatch[1]) : null;
  const kmMatch = texto.match(/Km Atual:\s*([\d.,]+)/i);
  const kmAtual = kmMatch ? parseNumeroBr(kmMatch[1]) : null;

  // Linhas de medição: "<ciclo> <valor decimal>", ex. "1 0,02"
  const medicoes: MedicaoCiclo[] = [];
  for (const linha of linhas) {
    const m = linha.match(/^(\d{1,2})\s+([\d]+,[\d]+)$/);
    if (m) {
      const ciclo = Number(m[1]);
      if (ciclo >= 1 && ciclo <= 12) {
        medicoes.push({ ciclo, opacidadeM1: parseNumeroBr(m[2]) });
      }
    }
  }

  return {
    numeroEnsaio,
    medicoes,
    mediaM1,
    resultado,
    limiteMarchaLentaMin,
    limiteMarchaLentaMax,
    limiteRotacaoCorteMin,
    limiteRotacaoCorteMax,
    limiteOpacidade,
    kmAtual,
  };
}
