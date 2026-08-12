import { requireArea } from "@/lib/auth/session";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { EquipamentoForm } from "../equipamento-form";

export default async function NovoEquipamentoPage() {
  await requireArea("equipamentos");
  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to="/painel/equipamentos" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Novo equipamento</h1>
      <EquipamentoForm cancelHref="/painel/equipamentos" />
    </div>
  );
}
