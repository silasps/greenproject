// Lógica de import/verificação de uma tabela ANFAVEA — compartilhada entre
// a action autenticada por sessão (`especificacoes-motor/actions.ts`, chamada
// pela tela) e o cron autenticado por `CRON_SECRET`
// (`api/cron/atualizar-anfavea/route.ts`). Fica fora de um arquivo "use
// server" de propósito: o cron não tem sessão de usuário (roda sem cookies),
// então não pode chamar uma server action que faz `requireAuth()`.

import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";
import { parseTabelaAnfavea } from "./parse-anfavea";

export type ResultadoImportacaoAnfavea = {
  importadas: number;
  total: number;
  mudou: boolean;
  /** Erro do parser (ex.: layout transposto, sem parser automático) — a fonte ainda é monitorada, só não gera linhas sozinha. */
  erroParse: string | null;
};

export async function importarTabelaAnfaveaInterno(
  admin: ReturnType<typeof createAdminClient>,
  marca: string,
  url: string,
): Promise<ResultadoImportacaoAnfavea> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Não foi possível baixar o PDF (HTTP ${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  const { data: fonteAtual } = await admin
    .from("fontes_anfavea")
    .select("hash_ultimo_conteudo")
    .eq("marca", marca)
    .maybeSingle();
  const mudou = fonteAtual?.hash_ultimo_conteudo !== hash;

  let linhas: Awaited<ReturnType<typeof parseTabelaAnfavea>> = [];
  let erroParse: string | null = null;
  if (mudou) {
    try {
      linhas = await parseTabelaAnfavea(buffer);
    } catch (e) {
      erroParse = e instanceof Error ? e.message : "Erro ao interpretar o PDF.";
    }
  }

  const { data: fonte } = await admin
    .from("fontes_anfavea")
    .upsert(
      {
        marca,
        url_tabela_pdf: url,
        hash_ultimo_conteudo: hash,
        verificado_em: new Date().toISOString(),
        atualizacao_disponivel: false,
      },
      { onConflict: "marca" },
    )
    .select("id")
    .single();

  if (linhas.length === 0) {
    return { importadas: 0, total: 0, mudou, erroParse };
  }

  const { data: existentes } = await admin
    .from("especificacoes_motor")
    .select("identificacao_motor, status")
    .eq("marca", marca);
  const confirmados = new Set(
    (existentes ?? []).filter((e) => e.status === "confirmado").map((e) => e.identificacao_motor),
  );

  let importadas = 0;
  for (const linha of linhas) {
    if (confirmados.has(linha.identificacaoMotor)) continue; // nunca sobrescreve linha já confirmada
    const { error } = await admin.from("especificacoes_motor").upsert(
      {
        marca,
        identificacao_motor: linha.identificacaoMotor,
        marcha_lenta_min: linha.marchaLentaMin,
        marcha_lenta_max: linha.marchaLentaMax,
        rotacao_corte_min: linha.rotacaoCorteMin,
        rotacao_corte_max: linha.rotacaoCorteMax,
        limite_opacidade: linha.limiteOpacidade,
        fonte_id: fonte?.id ?? null,
        origem: "importado_anfavea",
        status: "pendente_revisao",
      },
      { onConflict: "marca,identificacao_motor" },
    );
    if (!error) importadas++;
  }

  return { importadas, total: linhas.length, mudou, erroParse };
}
