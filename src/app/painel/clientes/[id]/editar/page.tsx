import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ClienteForm } from "../../cliente-form";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["escritorio", "gerencia"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", id).single();
  if (!cliente) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to={`/painel/clientes/${id}`} label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Editar cliente</h1>
      <ClienteForm cliente={cliente} cancelHref={`/painel/clientes/${id}`} />
    </div>
  );
}
