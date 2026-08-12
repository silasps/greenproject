import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { VerNoSiteButton } from "@/components/ver-no-site-button";
import { ServicoForm, type ServicoParaEditar } from "../../servico-form";

export default async function EditarServicoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("site");
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
  const servicoTipado = servico as unknown as ServicoParaEditar;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <ConfirmLeaveButton to="/painel/servicos" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
          <h1 className="mt-2 text-2xl font-bold text-neutral-900">Editar serviço</h1>
        </div>
        <VerNoSiteButton href={`/servicos/${servicoTipado.slug}`} />
      </div>
      <ServicoForm servico={servicoTipado} cancelHref="/painel/servicos" />
    </div>
  );
}
