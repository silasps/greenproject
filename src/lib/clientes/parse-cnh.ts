// Extrai nome e CPF da CNH digital (PDF exportado do app Carteira Digital
// de Trânsito) pra preencher o cadastro de cliente pessoa física.
//
// Abordagem: `src/lib/pdf/segmentos-texto.ts` (texto do PDF, sem OCR) —
// valor logo abaixo do rótulo. Cobre o modelo antigo ("NOME", "CPF") e o
// de 2022 (campos numerados: "2 e 1 NOME E SOBRENOME", "4d CPF"). O CPF é
// conferido pelos dígitos verificadores e, se a posição falhar, procurado
// no formato 000.000.000-00 no texto inteiro (não pega um número solto de
// 11 dígitos: o nº de registro da CNH também tem 11).
//
// Nota: construído a partir do layout público da CNH, sem um PDF real de
// exemplo — os campos ficam sempre editáveis no formulário.

import { isValidCpf, onlyDigits } from "@/lib/utils/documento";
import { extrairSegmentos, valorAbaixoDe } from "@/lib/pdf/segmentos-texto";

export type DadosCnh = {
  nome: string | null;
  /** Só dígitos (11). */
  cpf: string | null;
};

/** Rótulos da CNH (modelo antigo e 2022), normalizados — nunca aceitos como valor. */
const ROTULOS = new Set([
  "NOME",
  "NOME E SOBRENOME",
  "2 E 1 NOME E SOBRENOME",
  "NOME SOCIAL",
  "DOC. IDENTIDADE/ORG. EMISSOR/UF",
  "4C DOC IDENTIDADE/ORG EMISSOR/UF",
  "CPF",
  "4D CPF",
  "DATA NASCIMENTO",
  "3 DATA, LOCAL E UF DE NASCIMENTO",
  "FILIACAO",
  "PERMISSAO",
  "ACC",
  "CAT. HAB.",
  "9 CAT HAB",
  "N° REGISTRO",
  "Nº REGISTRO",
  "5 N° REGISTRO",
  "VALIDADE",
  "4B VALIDADE",
  "1ª HABILITACAO",
  "OBSERVACOES",
  "LOCAL",
  "DATA EMISSAO",
  "4A DATA EMISSAO",
  "NACIONALIDADE",
]);

const PARTICULAS = new Set(["da", "de", "do", "das", "dos", "e"]);

/** "JOÃO DA SILVA" → "João da Silva". */
function nomeProprio(texto: string): string {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .map((palavra, i) => (i > 0 && PARTICULAS.has(palavra) ? palavra : palavra.charAt(0).toUpperCase() + palavra.slice(1)))
    .join(" ");
}

export async function parseCnh(buffer: Buffer): Promise<DadosCnh> {
  const segmentos = await extrairSegmentos(buffer);
  if (segmentos.length === 0) {
    throw new Error(
      "Esse PDF não tem texto pra ler (parece foto ou documento escaneado). Use a CNH digital exportada em PDF pelo app Carteira Digital de Trânsito.",
    );
  }

  const nomeBruto = valorAbaixoDe(
    segmentos,
    (n) => (n === "NOME" || n.includes("NOME E SOBRENOME")) && !n.includes("SOCIAL"),
    ROTULOS,
  )?.trim();
  // Nome de pessoa: só letras/espaço/apóstrofo, pelo menos nome + sobrenome.
  const nome =
    nomeBruto && /^[\p{L}' ]+$/u.test(nomeBruto) && nomeBruto.split(/\s+/).length >= 2 ? nomeProprio(nomeBruto) : null;

  const cpfAbaixo = onlyDigits(valorAbaixoDe(segmentos, (n) => n === "CPF" || / CPF$/.test(n), ROTULOS) ?? "");
  let cpf = cpfAbaixo.length === 11 && isValidCpf(cpfAbaixo) ? cpfAbaixo : null;
  if (!cpf) {
    for (const s of segmentos) {
      const m = s.str.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
      if (m && isValidCpf(onlyDigits(m[0]))) {
        cpf = onlyDigits(m[0]);
        break;
      }
    }
  }

  if (!nome && !cpf) {
    throw new Error(
      "Não reconheci nome nem CPF de uma CNH nesse PDF. Confira se é a CNH digital exportada pelo app Carteira Digital de Trânsito.",
    );
  }
  return { nome, cpf };
}
