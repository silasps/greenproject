import { requireArea } from "@/lib/auth/session";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { VeiculoForm } from "../veiculo-form";

export default async function NovoVeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("clientes");
  const { id } = await params;
  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to={`/painel/clientes/${id}`} label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Novo veículo/equipamento</h1>
      <VeiculoForm clienteId={id} />
    </div>
  );
}
