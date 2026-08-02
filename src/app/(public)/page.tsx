import { COMPANY } from "@/lib/legal/company-info";
import { Hero } from "@/components/marketing/hero";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { CertificationsBand } from "@/components/marketing/certifications-band";
import { PhotoMosaic } from "@/components/marketing/photo-mosaic";
import { ServicoCard } from "@/components/marketing/servico-card";
import { HOME_MOSAIC_IMAGES, SERVICOS } from "@/lib/content/servicos";

export default function HomePage() {
  return (
    <div>
      <Hero />

      <CertificationsBand />

      <PhotoMosaic images={HOME_MOSAIC_IMAGES} />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-neutral-900">Nossos serviços</h2>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Começamos pelos serviços com acervo real de campo já curado para validar o
            novo formato visual do site.
          </p>
        </ScrollReveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {SERVICOS.map((servico, index) => (
            <ScrollReveal key={servico.slug} index={index}>
              <ServicoCard servico={servico} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-neutral-900">Fale com a gente</h2>
            <p className="mt-2 text-neutral-600">
              {COMPANY.telefone} · {COMPANY.email}
            </p>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
