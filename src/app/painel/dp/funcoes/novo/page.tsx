import { requireRole } from "@/lib/auth/session";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { FuncaoForm } from "../funcao-form";

export default async function NovaFuncaoPage() {
  await requireRole(["gerencia"]);

  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to="/painel/dp/funcoes" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Nova função</h1>
      <FuncaoForm />
    </div>
  );
}
