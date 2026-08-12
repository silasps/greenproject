import { requireRole } from "@/lib/auth/session";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ServicoForm } from "../servico-form";

export default async function NovoServicoPage() {
  await requireRole(["gerencia"]);
  return (
    <div>
      <ConfirmLeaveButton to="/painel/servicos" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Novo serviço</h1>
      <ServicoForm cancelHref="/painel/servicos" />
    </div>
  );
}
