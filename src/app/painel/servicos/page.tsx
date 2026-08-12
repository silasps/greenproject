import Link from "next/link";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { VerNoSiteButton } from "@/components/ver-no-site-button";
import { ServicoLinha } from "./servico-linha";

export default async function ServicosPainelPage() {
  await requireArea("site");
  const supabase = await createClient();
  const { data: servicos } = await supabase
    .from("servicos")
    .select("id, slug, titulo, cover_image_url, cover_image_alt, publicado, exibir_na_home, ordem")
    .order("ordem");

  const lista = servicos ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Serviços do site</h1>
        <div className="flex shrink-0 items-center gap-2">
          <VerNoSiteButton href="/servicos" />
          <Link
            href="/painel/servicos/novo"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Novo serviço
          </Link>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-neutral-500">
        Controla o que aparece em &ldquo;Serviços&rdquo; no site público — textos, fotos e a
        ordem de exibição. Clique num serviço pra editar. A estrela marca quais aparecem
        na home. Serviços em rascunho ficam salvos aqui mas não aparecem pro visitante.
      </p>

      <div className="mt-6 space-y-3">
        {lista.length === 0 && <p className="text-sm text-neutral-500">Nenhum serviço cadastrado.</p>}
        {lista.map((servico, index) => (
          <ServicoLinha
            key={servico.id}
            servico={servico}
            podeSubir={index > 0}
            podeDescer={index < lista.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
