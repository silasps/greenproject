import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfiguracoesTabs } from "./configuracoes-tabs";

export default async function ConfiguracoesPage() {
  await requireRole(["gerencia"]);
  const supabase = await createClient();

  const [
    { data: configuracoes },
    { data: tiposServico },
    { data: funcoes },
    { data: funcoesKpis },
    { data: dadosEmpresa },
    { data: auditoriaLog },
  ] = await Promise.all([
    supabase.from("configuracoes_orcamento").select("valor_km, fator_correcao_distancia").single(),
    supabase.from("tipos_servico").select("id, nome, valor").eq("ativo", true).order("nome"),
    supabase.from("funcoes").select("id, nome, nivel_acesso").order("nome"),
    supabase.from("funcoes_kpis").select("funcao_id, kpi_secao, visivel"),
    supabase.from("dados_empresa").select("razao_social, cnpj, endereco, telefone").single(),
    supabase
      .from("auditoria_log")
      .select("id, acao, entidade, entidade_id, detalhes, created_at, usuarios_perfis(nome)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const overridesPorCargo: Record<string, Record<string, boolean>> = {};
  for (const linha of funcoesKpis ?? []) {
    overridesPorCargo[linha.funcao_id] ??= {};
    overridesPorCargo[linha.funcao_id][linha.kpi_secao] = linha.visivel;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Configurações</h1>
      <ConfiguracoesTabs
        configuracoes={configuracoes ?? { valor_km: 0, fator_correcao_distancia: 1.4 }}
        tiposServico={tiposServico ?? []}
        funcoes={funcoes ?? []}
        overridesPorCargo={overridesPorCargo}
        dadosEmpresa={
          dadosEmpresa ?? { razao_social: "", cnpj: "", endereco: "", telefone: "" }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        auditoriaLog={(auditoriaLog ?? []) as any}
      />
    </div>
  );
}
