import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { VeiculoForm } from "../../veiculo-form";

export default async function EditarVeiculoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; veiculoId: string }>;
  searchParams: Promise<{ voltar?: string }>;
}) {
  await requireArea("clientes");
  const { id, veiculoId } = await params;
  const { voltar } = await searchParams;
  const voltarPara = voltar || `/painel/clientes/${id}`;
  const supabase = await createClient();

  const { data: veiculo } = await supabase
    .from("veiculos_maquinas")
    .select(
      "id, tipo_ativo, identificador, marca, modelo, identificacao_motor, combustivel, ano, chassi, renavam, patrimonio_cliente, especificacoes_motor(marcha_lenta_min, marcha_lenta_max, rotacao_corte_min, rotacao_corte_max, limite_opacidade)",
    )
    .eq("id", veiculoId)
    .eq("cliente_id", id)
    .single();

  if (!veiculo) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to={voltarPara} label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Editar veículo/equipamento</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <VeiculoForm clienteId={id} veiculo={veiculo as any} voltarPara={voltarPara} />
    </div>
  );
}
