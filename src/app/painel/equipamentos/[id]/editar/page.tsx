import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EquipamentoForm } from "../../equipamento-form";

export default async function EditarEquipamentoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("equipamentos");
  const { id } = await params;
  const supabase = await createClient();
  const { data: equipamento } = await supabase.from("equipamentos_teste").select("*").eq("id", id).single();
  if (!equipamento) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-neutral-900">Editar equipamento</h1>
      <EquipamentoForm equipamento={equipamento} cancelHref={`/painel/equipamentos/${id}`} />
    </div>
  );
}
