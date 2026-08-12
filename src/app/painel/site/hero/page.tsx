import Link from "next/link";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { VerNoSiteButton } from "@/components/ver-no-site-button";
import { SlideLinha } from "./slide-linha";

export default async function HeroSlidesPainelPage() {
  await requireArea("site");
  const supabase = await createClient();
  const { data: slides } = await supabase
    .from("hero_slides")
    .select("id, servico, descricao, imagem_url, imagem_alt, ordem")
    .order("ordem");

  const lista = slides ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Slides da home</h1>
        <div className="flex shrink-0 items-center gap-2">
          <VerNoSiteButton href="/" label="Visualizar site" />
          <Link
            href="/painel/site/hero/novo"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Novo slide
          </Link>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-neutral-500">
        Controla as fotos e textos do carrossel no topo da home. Clique num slide pra
        editar. A ordem aqui é a ordem de exibição. Precisa manter ao menos 1 slide.
      </p>

      <div className="mt-6 space-y-3">
        {lista.length === 0 && <p className="text-sm text-neutral-500">Nenhum slide cadastrado.</p>}
        {lista.map((slide, index) => (
          <SlideLinha
            key={slide.id}
            slide={slide}
            podeSubir={index > 0}
            podeDescer={index < lista.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
