"use server";

import { requireAuth } from "@/lib/auth/session";
import { parseCnh, type DadosCnh } from "@/lib/clientes/parse-cnh";

/**
 * Lê a CNH digital (PDF) e devolve nome+CPF pro cadastro de cliente pessoa
 * física — não grava nada. Mesmo formato de retorno de `lerCrlv`.
 */
export async function lerCnh(formData: FormData): Promise<{ dados: DadosCnh } | { erro: string }> {
  await requireAuth();
  const pdf = formData.get("pdf") as File | null;
  if (!pdf || pdf.size === 0) return { erro: "Selecione o PDF da CNH." };
  if (pdf.type && pdf.type !== "application/pdf") {
    return { erro: "O arquivo precisa ser o PDF da CNH digital (não foto)." };
  }

  try {
    return { dados: await parseCnh(Buffer.from(await pdf.arrayBuffer())) };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível ler a CNH." };
  }
}
