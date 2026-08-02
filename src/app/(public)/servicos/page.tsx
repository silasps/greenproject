import type { Metadata } from "next";
import { ServicoCard } from "@/components/marketing/servico-card";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { SERVICOS } from "@/lib/content/servicos";

export const metadata: Metadata = {
  title: "Serviços | Greenproject Engenharia",
  description:
    "Laudos, inspeções e ensaios técnicos da Greenproject Engenharia, com atendimento em campo e documentação profissional.",
};

export default function ServicosPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">
            Serviços
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-neutral-900 sm:text-4xl">
            Laudos e inspeções com atendimento técnico em campo
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Conheça os serviços piloto com fotos reais do trabalho realizado pela
            Greenproject. O mesmo padrão será expandido para o restante do portfólio.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {SERVICOS.map((servico, index) => (
            <ScrollReveal key={servico.slug} index={index}>
              <ServicoCard servico={servico} preloadImage={index === 0} />
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
}
