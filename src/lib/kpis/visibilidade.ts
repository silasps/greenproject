import type { createClient } from "@/lib/supabase/server";
import { getRoleLevel, ROLE_LEVEL } from "@/lib/auth/permissions";
import { KPI_SECOES, type KpiSecaoKey } from "./catalogo";

type PerfilParaVisibilidade = { id: string; role: string | null; funcao_id: string | null };

/**
 * Resolve quais seções de KPI a pessoa vê: override individual
 * (usuarios_kpis) vence override de cargo (funcoes_kpis), que vence o
 * nível padrão do catálogo. Ausência de linha em qualquer camada = "segue
 * a próxima camada abaixo".
 */
export async function getSecoesVisiveis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  perfil: PerfilParaVisibilidade
): Promise<Set<KpiSecaoKey>> {
  const [{ data: porCargo }, { data: porPessoa }] = await Promise.all([
    perfil.funcao_id
      ? supabase.from("funcoes_kpis").select("kpi_secao, visivel").eq("funcao_id", perfil.funcao_id)
      : Promise.resolve({ data: [] as { kpi_secao: string; visivel: boolean }[] }),
    supabase.from("usuarios_kpis").select("kpi_secao, visivel").eq("usuario_id", perfil.id),
  ]);

  const overrideCargo = new Map((porCargo ?? []).map((r) => [r.kpi_secao, r.visivel]));
  const overridePessoa = new Map((porPessoa ?? []).map((r) => [r.kpi_secao, r.visivel]));

  const visiveis = new Set<KpiSecaoKey>();
  for (const secao of KPI_SECOES) {
    const visivel =
      overridePessoa.get(secao.key) ??
      overrideCargo.get(secao.key) ??
      getRoleLevel(perfil.role) >= ROLE_LEVEL[secao.nivelPadrao];
    if (visivel) visiveis.add(secao.key);
  }
  return visiveis;
}
