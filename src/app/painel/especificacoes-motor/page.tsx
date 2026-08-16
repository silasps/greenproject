import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ImportarTabelaForm } from "./importar-tabela-form";
import { FontesLista } from "./fontes-lista";
import { PendentesLista } from "./pendentes-lista";

export default async function EspecificacoesMotorPage({
  searchParams,
}: {
  searchParams: Promise<{ marca?: string }>;
}) {
  await requireRole(["escritorio", "gerencia"]);
  const { marca } = await searchParams;
  const admin = createAdminClient();

  const [{ data: fontes }, { data: pendentes }] = await Promise.all([
    admin.from("fontes_anfavea").select("marca, url_tabela_pdf, verificado_em").order("marca"),
    admin
      .from("especificacoes_motor")
      .select("id, marca, identificacao_motor, marcha_lenta_min, marcha_lenta_max, rotacao_corte_min, rotacao_corte_max, limite_opacidade")
      .eq("status", "pendente_revisao")
      .order("marca"),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-neutral-900">Especificações de motor</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Marcha lenta, rotação de corte e limite de opacidade por marca/motor — importados da tabela oficial da
        ANFAVEA (Instrução Normativa Ibama 127/2006) sempre que possível, pra não precisar digitar isso na mão
        veículo por veículo. Nenhuma linha importada entra valendo pra laudo sozinha: fica pendente até alguém do
        escritório confirmar.
      </p>

      <ImportarTabelaForm marcaInicial={marca ?? ""} />
      <FontesLista fontes={fontes ?? []} />
      <PendentesLista pendentes={pendentes ?? []} />
    </div>
  );
}
