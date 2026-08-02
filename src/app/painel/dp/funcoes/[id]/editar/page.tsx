import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { FuncaoForm } from "../../funcao-form";

export default async function EditarFuncaoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["gerencia"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: funcao } = await supabase
    .from("funcoes")
    .select("id, nome, descricao, nivel_acesso")
    .eq("id", id)
    .single();

  if (!funcao) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton
        to={`/painel/dp/funcoes/${id}`}
        label="← Voltar"
        variant="link"
        className="px-0 text-neutral-500"
      />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Editar função</h1>
      <FuncaoForm funcao={funcao} />
    </div>
  );
}
