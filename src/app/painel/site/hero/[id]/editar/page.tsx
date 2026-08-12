import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { VerNoSiteButton } from "@/components/ver-no-site-button";
import { getServicos } from "@/lib/content/servicos";
import { SlideForm, type SlideParaEditar } from "../../slide-form";

export default async function EditarSlidePage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("site");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: slide }, servicos] = await Promise.all([
    supabase
      .from("hero_slides")
      .select("id, servico, descricao, link_href, imagem_url, imagem_alt")
      .eq("id", id)
      .maybeSingle(),
    getServicos(),
  ]);

  if (!slide) notFound();
  const slideTipado: SlideParaEditar = {
    id: slide.id,
    servico: slide.servico,
    descricao: slide.descricao,
    linkHref: slide.link_href,
    imagemUrl: slide.imagem_url,
    imagemAlt: slide.imagem_alt,
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <ConfirmLeaveButton
            to="/painel/site/hero"
            label="← Voltar"
            variant="link"
            className="px-0 text-neutral-500"
          />
          <h1 className="mt-2 text-2xl font-bold text-neutral-900">Editar slide</h1>
        </div>
        <VerNoSiteButton href="/" label="Ver no site" />
      </div>
      <SlideForm
        slide={slideTipado}
        servicosDisponiveis={servicos.map((s) => ({ slug: s.slug, titulo: s.titulo }))}
        cancelHref="/painel/site/hero"
      />
    </div>
  );
}
