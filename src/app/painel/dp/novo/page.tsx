import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { PessoaForm } from "../pessoa-form";

export default async function NovaPessoaPage() {
  await requireRole(["gerencia"]);
  const supabase = await createClient();
  const { data: funcoes } = await supabase.from("funcoes").select("id, nome").order("nome");

  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to="/painel/dp" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Nova pessoa</h1>
      <PessoaForm funcoes={funcoes ?? []} />
    </div>
  );
}
