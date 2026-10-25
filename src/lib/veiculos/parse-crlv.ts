// Extrai os dados do veículo do e-CRLV (PDF baixado do app Carteira Digital
// de Trânsito / gov.br) pra preencher o cadastro de veículo sozinho.
//
// Abordagem: `src/lib/pdf/segmentos-texto.ts` (texto do PDF, sem OCR —
// o e-CRLV é gerado digitalmente): cada campo é "o texto logo abaixo do
// rótulo, na mesma coluna" — e conferido pelo formato (placa, chassi, renavam e
// ano têm formato fixo). Se a posição falhar, cai pra uma busca pelo
// formato no texto inteiro.
//
// Nota: construído a partir do layout público do CRLV-e (modelo SENATRAN
// 2021+), sem um PDF real de exemplo da empresa — os campos ficam sempre
// editáveis no formulário pra pessoa conferir antes de salvar.

import { onlyDigits } from "@/lib/utils/mascaras";
import {
  extrairSegmentos,
  normalizarTexto as normalizar,
  valorAbaixoDe as valorAbaixoDePdf,
  type Segmento,
} from "@/lib/pdf/segmentos-texto";

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

function capitalizar(texto: string): string {
  return texto.toLowerCase().replace(/(^|[\s-])(\S)/g, (_, sep: string, letra: string) => sep + letra.toUpperCase());
}

/** Texto logo abaixo do rótulo exato (já normalizado) do CRLV-e. */
function valorAbaixoDe(segmentos: Segmento[], rotulo: string): string | null {
  return valorAbaixoDePdf(segmentos, (n) => n === rotulo, ROTULOS);
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
