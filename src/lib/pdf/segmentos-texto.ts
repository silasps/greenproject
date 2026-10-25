// Leitura de documento em PDF com layout de "grade" (rótulo em cima, valor
// embaixo) — e-CRLV e CNH digital. Mesma técnica do PDF do Syscon
// (`src/lib/syscon/parse-ensaio.ts`): o PDF tem texto de verdade, então o
// pdfjs devolve cada fragmento com a posição (x, y) e o valor de um campo é
// "o texto logo abaixo do rótulo, na mesma coluna". Não serve pra foto ou
// PDF escaneado (sem camada de texto) — aí `extrairSegmentos` volta vazio.

export type Segmento = { x: number; y: number; w: number; str: string };

/** Sem acento, maiúsculo, espaços simples e sem espaço em volta de "/" — pra comparar rótulos. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Segmentos de texto da 1ª página (e-CRLV e CNH são uma página só): agrupa
 * por linha (y, tolerância 2pt) e junta fragmentos vizinhos na mesma linha —
 * o pdfjs às vezes quebra um rótulo como "MARCA / MODELO / VERSÃO" em pedaços.
 */
export async function extrairSegmentos(buffer: Buffer): Promise<Segmento[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();

  const grupos = new Map<number, Segmento[]>();
  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    const chave = [...grupos.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push({ x: item.transform[4], y: chave, w: item.width, str: item.str.trim() });
  }

  const segmentos: Segmento[] = [];
  for (const [, frags] of [...grupos.entries()].sort((a, b) => b[0] - a[0])) {
    frags.sort((a, b) => a.x - b.x);
    let atual: Segmento | null = null;
    for (const f of frags) {
      if (atual && f.x - (atual.x + atual.w) < 4) {
        atual.str = `${atual.str} ${f.str}`;
        atual.w = f.x + f.w - atual.x;
      } else {
        atual = { ...f };
        segmentos.push(atual);
      }
    }
  }
  return segmentos;
}

/**
 * Texto logo abaixo do primeiro rótulo que casar, na mesma coluna — ignora
 * outro rótulo conhecido logo abaixo (célula vazia).
 */
export function valorAbaixoDe(
  segmentos: Segmento[],
  casaRotulo: (rotuloNormalizado: string) => boolean,
  rotulosConhecidos: Set<string>,
): string | null {
  const alvo = segmentos.find((s) => casaRotulo(normalizarTexto(s.str)));
  if (!alvo) return null;
  const candidato = segmentos
    .filter(
      (s) =>
        s.y < alvo.y &&
        alvo.y - s.y <= 30 &&
        s.x < alvo.x + Math.max(alvo.w, 40) &&
        s.x + s.w > alvo.x - 4 &&
        !rotulosConhecidos.has(normalizarTexto(s.str)),
    )
    .sort((a, b) => b.y - a.y || Math.abs(a.x - alvo.x) - Math.abs(b.x - alvo.x))[0];
  return candidato?.str ?? null;
}
