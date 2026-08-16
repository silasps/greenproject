import { createAdminClient } from "@/lib/supabase/admin";
import { importarTabelaAnfaveaInterno } from "@/lib/veiculos/importar-anfavea";

/**
 * Roda a cada 3 meses (ver vercel.json) — rebusca o PDF de cada marca em
 * `fontes_anfavea`, compara hash e reimporta se mudou (linhas novas/
 * alteradas entram como `pendente_revisao`, igual a um import manual —
 * nunca confirma nada sozinho). A tela `/painel/especificacoes-motor`
 * mostra `verificado_em` por marca e tem um botão "Verificar agora" que
 * roda a mesma lógica sob demanda (`verificarAtualizacaoAnfavea`).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: fontes } = await admin.from("fontes_anfavea").select("marca, url_tabela_pdf");

  const resultados: Record<string, unknown> = {};
  for (const fonte of fontes ?? []) {
    try {
      resultados[fonte.marca] = await importarTabelaAnfaveaInterno(admin, fonte.marca, fonte.url_tabela_pdf);
    } catch (e) {
      resultados[fonte.marca] = { erro: e instanceof Error ? e.message : "Erro desconhecido." };
    }
  }

  return Response.json({ verificadas: (fontes ?? []).length, resultados });
}
