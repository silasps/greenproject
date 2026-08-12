import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ClienteForm } from "../../cliente-form";

export default async function EditarClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ voltar?: string }>;
}) {
  await requireArea("clientes");
  const { id } = await params;
  const { voltar } = await searchParams;
  const supabase = await createClient();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", id).single();
  if (!cliente) notFound();

  // Veio de outra tela (ex.: agendamento) pra completar/editar o cadastro —
  // "Voltar"/"Cancelar"/salvar devem levar de volta pra lá, não sempre pro
  // detalhe do cliente.
  const voltarPara = voltar || `/painel/clientes/${id}`;

  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to={voltarPara} label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Editar cliente</h1>
      <ClienteForm cliente={cliente} cancelHref={voltarPara} />
    </div>
  );
}
