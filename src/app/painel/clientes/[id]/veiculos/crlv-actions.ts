"use server";

import { requireAuth } from "@/lib/auth/session";
import { parseCrlv, type DadosCrlv } from "@/lib/veiculos/parse-crlv";

/**
 * Lê o e-CRLV (PDF) e devolve os dados pro formulário de veículo preencher —
 * não grava nada (nem o arquivo), quem salva é o form depois da conferência.
 * Erro volta como `{ erro }` porque em produção a mensagem de um `throw`
 * numa server action chega genérica no navegador.
 */
export async function lerCrlv(formData: FormData): Promise<{ dados: DadosCrlv } | { erro: string }> {
  await requireAuth();
  const pdf = formData.get("pdf") as File | null;
  if (!pdf || pdf.size === 0) return { erro: "Selecione o PDF do e-CRLV." };
  if (pdf.type && pdf.type !== "application/pdf") {
    return { erro: "O arquivo precisa ser o PDF do e-CRLV (não foto)." };
  }

  try {
    return { dados: await parseCrlv(Buffer.from(await pdf.arrayBuffer())) };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível ler o e-CRLV." };
  }
}
