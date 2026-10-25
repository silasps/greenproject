// Extrai os dados do veículo do e-CRLV (PDF baixado do app Carteira Digital
// de Trânsito / gov.br) pra preencher o cadastro de veículo sozinho.
//
// Abordagem: mesma do PDF do Syscon (`src/lib/syscon/parse-ensaio.ts`) —
// o e-CRLV é um PDF gerado digitalmente, com texto de verdade, então não
// precisa de OCR. O layout é uma grade de células "RÓTULO em cima, valor
// embaixo", então cada campo é lido como "o texto logo abaixo do rótulo,
// na mesma coluna" — e conferido pelo formato (placa, chassi, renavam e
// ano têm formato fixo). Se a posição falhar, cai pra uma busca pelo
// formato no texto inteiro.
//
// Nota: construído a partir do layout público do CRLV-e (modelo SENATRAN
// 2021+), sem um PDF real de exemplo da empresa — os campos ficam sempre
// editáveis no formulário pra pessoa conferir antes de salvar.

import { onlyDigits } from "@/lib/utils/mascaras";

export type DadosCrlv = {
  placa: string | null;
  renavam: string | null;
  chassi: string | null;
  marca: string | null;
  modelo: string | null;
  ano: string | null;
  combustivel: string | null;
  /** Dono do veículo no documento — no cadastro rápido da Agenda vira o cliente novo. */
  proprietarioNome: string | null;
  /** Só dígitos: 11 (CPF) ou 14 (CNPJ). */
  proprietarioDocumento: string | null;
};

type Segmento = { x: number; y: number; w: number; str: string };

const PLACA = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/;
// VIN: 17 caracteres, sem I/O/Q, com pelo menos uma letra e um dígito.
const CHASSI = /^(?=.*\d)(?=.*[A-HJ-NPR-Z])[A-HJ-NPR-Z0-9]{17}$/;
const ANO = /^(19|20)\d{2}$/;

/** Rótulos do CRLV-e, normalizados — nunca são aceitos como valor de outro campo (célula vazia). */
const ROTULOS = new Set([
  "CODIGO RENAVAM",
  "PLACA",
  "EXERCICIO",
  "ANO FABRICACAO",
  "ANO MODELO",
  "NUMERO DO CRV",
  "CODIGO DE SEGURANCA DO CLA",
  "CAT",
  "MARCA/MODELO/VERSAO",
  "ESPECIE/TIPO",
  "PLACA ANTERIOR/UF",
  "CHASSI",
  "COR PREDOMINANTE",
  "COMBUSTIVEL",
  "CATEGORIA",
  "CAPACIDADE",
  "POTENCIA/CILINDRADA",
  "PESO BRUTO TOTAL",
  "MOTOR",
  "CMT",
  "EIXOS",
  "LOTACAO",
  "CARROCERIA",
  "NOME",
  "CPF/CNPJ",
  "LOCAL",
  "DATA",
]);

/** Abreviação de marca do DETRAN → nome usado na FIPE/especificações (a busca lá é sem diferenciar maiúscula). */
const MARCAS: Record<string, string> = {
  "M.BENZ": "Mercedes-Benz",
  MBENZ: "Mercedes-Benz",
  "MERCEDES BENZ": "Mercedes-Benz",
  "MERCEDES-BENZ": "Mercedes-Benz",
  VW: "Volkswagen",
  VOLKSWAGEN: "Volkswagen",
  GM: "Chevrolet",
  CHEV: "Chevrolet",
  CHEVROLET: "Chevrolet",
  MMC: "Mitsubishi",
  KIA: "Kia Motors",
  LR: "Land Rover",
  "LAND ROVER": "Land Rover",
  CITROEN: "Citroën",
  DAF: "DAF",
  MAN: "MAN",
  RAM: "RAM",
  JAC: "JAC",
};

const COMBUSTIVEIS: Record<string, string> = {
  DIESEL: "Diesel",
  GASOLINA: "Gasolina",
  ALCOOL: "Álcool",
  "ALCOOL/GASOLINA": "Flex",
  "GASOLINA/ALCOOL": "Flex",
  ELETRICO: "Elétrico",
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizar(texto: string): string {
  return texto.toLowerCase().replace(/(^|[\s-])(\S)/g, (_, sep: string, letra: string) => sep + letra.toUpperCase());
}

/**
 * Segmentos de texto da 1ª página (o CRLV-e é uma página só): agrupa por
 * linha (y, tolerância 2pt) e junta fragmentos vizinhos na mesma linha —
 * o pdfjs às vezes quebra um rótulo como "MARCA / MODELO / VERSÃO" em pedaços.
 */
async function extrairSegmentos(buffer: Buffer): Promise<Segmento[]> {
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

/** Texto logo abaixo do rótulo, na mesma coluna — ignora outro rótulo (célula vazia). */
function valorAbaixoDe(segmentos: Segmento[], rotulo: string): string | null {
  const alvo = segmentos.find((s) => normalizar(s.str) === rotulo);
  if (!alvo) return null;
  const candidato = segmentos
    .filter(
      (s) =>
        s.y < alvo.y &&
        alvo.y - s.y <= 30 &&
        s.x < alvo.x + Math.max(alvo.w, 40) &&
        s.x + s.w > alvo.x - 4 &&
        !ROTULOS.has(normalizar(s.str)),
    )
    .sort((a, b) => b.y - a.y || Math.abs(a.x - alvo.x) - Math.abs(b.x - alvo.x))[0];
  return candidato?.str ?? null;
}

/** Valor abaixo do rótulo se tiver o formato esperado, senão o primeiro trecho do texto inteiro com esse formato. */
function porRotuloOuFormato(segmentos: Segmento[], rotulo: string, formato: RegExp, limpar: (v: string) => string) {
  const abaixo = valorAbaixoDe(segmentos, rotulo);
  if (abaixo && formato.test(limpar(abaixo))) return limpar(abaixo);
  for (const s of segmentos) {
    for (const palavra of s.str.split(/\s+/)) {
      if (formato.test(limpar(palavra))) return limpar(palavra);
    }
  }
  return null;
}

/** "M.BENZ/ATEGO 2426" → Mercedes-Benz + ATEGO 2426; importado vem como "I/VOLVO FH 540" (marca separada por espaço). */
function separarMarcaModelo(texto: string): { marca: string | null; modelo: string | null } {
  const semImportado = texto.replace(/^I\s*\/\s*/i, "").trim();
  const corte = semImportado.includes("/") ? semImportado.indexOf("/") : semImportado.indexOf(" ");
  if (corte <= 0) return { marca: semImportado || null, modelo: null };
  const marcaBruta = semImportado.slice(0, corte).trim();
  const modelo = semImportado.slice(corte + 1).trim() || null;
  const marca = MARCAS[normalizar(marcaBruta)] ?? capitalizar(marcaBruta);
  return { marca, modelo };
}

export async function parseCrlv(buffer: Buffer): Promise<DadosCrlv> {
  const segmentos = await extrairSegmentos(buffer);
  if (segmentos.length === 0) {
    throw new Error(
      "Esse PDF não tem texto pra ler (parece foto ou documento escaneado). Use o e-CRLV baixado do app Carteira Digital de Trânsito.",
    );
  }

  const placa = porRotuloOuFormato(segmentos, "PLACA", PLACA, (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""));
  const chassi = porRotuloOuFormato(segmentos, "CHASSI", CHASSI, (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""));

  // Renavam não tem formato exclusivo (CPF e código do CLA também têm 11 dígitos) — só pela posição.
  const renavamBruto = onlyDigits(valorAbaixoDe(segmentos, "CODIGO RENAVAM") ?? "");
  const renavam = renavamBruto.length >= 9 && renavamBruto.length <= 11 ? renavamBruto.padStart(11, "0") : null;

  const anoFabricacao = valorAbaixoDe(segmentos, "ANO FABRICACAO")?.trim() ?? "";
  const anoModelo = valorAbaixoDe(segmentos, "ANO MODELO")?.trim() ?? "";
  const ano = ANO.test(anoFabricacao) ? anoFabricacao : ANO.test(anoModelo) ? anoModelo : null;

  const marcaModelo = valorAbaixoDe(segmentos, "MARCA/MODELO/VERSAO");
  const { marca, modelo } = marcaModelo ? separarMarcaModelo(marcaModelo) : { marca: null, modelo: null };

  const combustivelBruto = valorAbaixoDe(segmentos, "COMBUSTIVEL");
  const combustivel = combustivelBruto
    ? (COMBUSTIVEIS[normalizar(combustivelBruto)] ?? capitalizar(combustivelBruto))
    : null;

  const proprietarioNome = valorAbaixoDe(segmentos, "NOME")?.trim() || null;
  const documentoBruto = onlyDigits(valorAbaixoDe(segmentos, "CPF/CNPJ") ?? "");
  const proprietarioDocumento = documentoBruto.length === 11 || documentoBruto.length === 14 ? documentoBruto : null;

  const dados = { placa, renavam, chassi, marca, modelo, ano, combustivel, proprietarioNome, proprietarioDocumento };
  if (Object.values(dados).every((v) => !v)) {
    throw new Error(
      "Não reconheci os dados de um e-CRLV nesse PDF. Confira se é o CRLV digital baixado do app Carteira Digital de Trânsito (ou do site do DETRAN).",
    );
  }
  return dados;
}
