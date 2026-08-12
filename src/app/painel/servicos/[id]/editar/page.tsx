import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ServicoForm, type ServicoParaEditar } from "../../servico-form";

export default async function EditarServicoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["gerencia"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: servico } = await supabase
    .from("servicos")
    .select(
      "id, slug, titulo, resumo, headline, subheadline, normas, beneficios, entregaveis, " +
        "cover_image_url, cover_image_alt, cover_destaque_mosaico, galeria, metodologia, publicado"
    )
    .eq("id", id)
    .maybeSingle();

  if (!servico) notFound();

  return (
    <div>
      <ConfirmLeaveButton to="/painel/servicos" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Editar serviço</h1>
      <ServicoForm servico={servico as unknown as ServicoParaEditar} cancelHref="/painel/servicos" />
    </div>
  );
}
