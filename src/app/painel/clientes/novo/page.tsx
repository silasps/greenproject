import { requireRole } from "@/lib/auth/session";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ClienteForm } from "../cliente-form";

export default async function NovoClientePage() {
  await requireRole(["escritorio", "gerencia"]);
  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to="/painel/clientes" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Novo cliente</h1>
      <ClienteForm cancelHref="/painel/clientes" />
    </div>
  );
}
