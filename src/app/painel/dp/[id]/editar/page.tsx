import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { PessoaForm } from "../../pessoa-form";
import { KpisPessoaForm } from "../kpis-pessoa-form";

export default async function EditarPessoaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["gerencia"]);
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: pessoa }, { data: funcoes }, { data: usuariosKpis }, { data: funcoesKpis }] = await Promise.all([
    supabase
      .from("usuarios_perfis")
      .select("id, nome, role, funcao_id, cpf, telefone, data_admissao, acesso_sistema, funcoes(nivel_acesso)")
      .eq("id", id)
      .single(),
    supabase.from("funcoes").select("id, nome").order("nome"),
    supabase.from("usuarios_kpis").select("kpi_secao, visivel").eq("usuario_id", id),
    // Sem filtro de funcao_id aqui pra rodar em paralelo com a busca da pessoa (ainda não sabemos o funcao_id
    // dela nesse ponto) — o conjunto é pequeno (cargos × seções de KPI), filtra na volta.
    supabase.from("funcoes_kpis").select("funcao_id, kpi_secao, visivel"),
  ]);

  if (!pessoa) notFound();

  const overridesCargo = Object.fromEntries(
    (funcoesKpis ?? []).filter((r) => r.funcao_id === pessoa.funcao_id).map((r) => [r.kpi_secao, r.visivel])
  );
  const overridesPessoa = Object.fromEntries((usuariosKpis ?? []).map((r) => [r.kpi_secao, r.visivel]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nivelAcessoCargo = (pessoa as any).funcoes?.nivel_acesso ?? pessoa.role;

  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to="/painel/dp" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Editar pessoa</h1>
      <PessoaForm pessoa={pessoa} funcoes={funcoes ?? []} />
      <KpisPessoaForm
        usuarioId={pessoa.id}
        nivelAcessoCargo={nivelAcessoCargo}
        overridesCargo={overridesCargo}
        overridesPessoa={overridesPessoa}
      />
    </div>
  );
}
