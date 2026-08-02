import { requireRole } from "@/lib/auth/session";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ResponsavelForm } from "../responsavel-form";

export default async function NovoResponsavelPage() {
  await requireRole(["gerencia"]);
  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to="/painel/responsaveis-tecnicos" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Novo responsável técnico</h1>
      <ResponsavelForm cancelHref="/painel/responsaveis-tecnicos" />
    </div>
  );
}
