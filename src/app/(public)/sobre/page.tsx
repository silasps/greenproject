import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned, ClipboardCheck, ShieldCheck, ArrowRight } from "lucide-react";
import { COMPANY } from "@/lib/legal/company-info";
import { getPaginaSobre } from "@/lib/content/pagina-sobre";
import { richTextClasses } from "@/components/rich-text-editor";

export const metadata: Metadata = {
  title: "Sobre | Greenproject Engenharia",
  description:
    "Engenharia mecânica e segurança do trabalho com atendimento técnico em campo. Conheça a Greenproject.",
  alternates: {
    canonical: "/sobre",
  },
};

// Ícones dos 3 diferenciais são fixos no código (não editáveis pela
// gerência) — só título/descrição vêm do banco, na mesma ordem.
const ICONES_DIFERENCIAIS = [MapPinned, ClipboardCheck, ShieldCheck];

export default async function SobrePage() {
  const sobre = await getPaginaSobre();

  return (
    <div className="bg-background">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Sobre a Greenproject
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-neutral-900 sm:text-4xl">
            {sobre.headline}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            {sobre.introducao}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h2 className="text-xl font-bold text-neutral-900">Como trabalhamos</h2>
        <div
          className={`mt-4 text-base leading-7 text-neutral-600 ${richTextClasses}`}
          dangerouslySetInnerHTML={{ __html: sobre.comoTrabalhamos }}
        />
        <Link
          href="/servicos"
          className="group/link mt-4 inline-flex items-center gap-2 font-semibold text-brand hover:text-brand-dark"
        >
          Ver nosso portfólio de serviços
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-0.5"
            aria-hidden
          />
        </Link>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {sobre.diferenciais.map((diferencial, index) => {
            const Icone = ICONES_DIFERENCIAIS[index];
            return (
              <div key={diferencial.titulo}>
                {Icone && <Icone className="h-5 w-5 text-neutral-500" aria-hidden />}
                <h3 className="mt-3 font-semibold text-neutral-900">{diferencial.titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {diferencial.descricao}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h2 className="text-sm font-semibold text-neutral-900">Dados da empresa</h2>
          <p className="mt-2 text-sm text-neutral-600">{COMPANY.razaoSocial}</p>
          <p className="text-sm text-neutral-600">CNPJ {COMPANY.cnpj}</p>
          <p className="text-sm text-neutral-600">{COMPANY.endereco}</p>
        </div>
      </section>
    </div>
  );
}
