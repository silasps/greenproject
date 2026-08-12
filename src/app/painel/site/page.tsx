import Link from "next/link";
import { ArrowRight, Wrench, Building2, Images } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { VerNoSiteButton } from "@/components/ver-no-site-button";
import { ContatoForm } from "./contato-form";

export default async function SitePainelPage() {
  await requireRole(["gerencia"]);
  const supabase = await createClient();
  const { data: dadosEmpresa } = await supabase
    .from("dados_empresa")
    .select("telefone")
    .single();

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gerenciamento do site</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            Informações do site institucional que mudam com frequência, sem precisar
            mexer em código.
          </p>
        </div>
        <VerNoSiteButton href="/" label="Visualizar site" />
      </div>

      <div className="mt-6 space-y-3">
        <Link
          href="/painel/servicos"
          className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 hover:border-brand/40 hover:bg-neutral-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Wrench className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-neutral-900">Serviços</p>
            <p className="text-sm text-neutral-500">
              Textos, fotos e quais serviços aparecem em destaque na home
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        </Link>

        <Link
          href="/painel/site/hero"
          className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 hover:border-brand/40 hover:bg-neutral-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Images className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-neutral-900">Slides da home</p>
            <p className="text-sm text-neutral-500">Fotos, textos e link do carrossel no topo da home</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        </Link>

        <Link
          href="/painel/site/sobre"
          className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 hover:border-brand/40 hover:bg-neutral-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Building2 className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-neutral-900">Sobre a empresa</p>
            <p className="text-sm text-neutral-500">Textos e diferenciais exibidos em /sobre</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        </Link>
      </div>

      <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="font-medium text-neutral-900">Informações de contato</p>
        <ContatoForm telefoneAtual={dadosEmpresa?.telefone ?? ""} />
      </section>
    </div>
  );
}
