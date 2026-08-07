import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/legal/company-info";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";
import { Hero } from "@/components/marketing/hero";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { CertificationsBand } from "@/components/marketing/certifications-band";
import { PhotoMosaic } from "@/components/marketing/photo-mosaic";
import { ServicoCard } from "@/components/marketing/servico-card";
import { ComoFunciona } from "@/components/marketing/como-funciona";
import { WhyUsBlock } from "@/components/marketing/why-us-block";
import { ReviewsSection } from "@/components/marketing/reviews-section";
import { Faq } from "@/components/marketing/faq";
import { HOME_MOSAIC_IMAGES, SERVICOS } from "@/lib/content/servicos";

export default function HomePage() {
  return (
    <div>
      <Hero />

      <CertificationsBand />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-neutral-900">Nossos serviços</h2>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Laudos, inspeções e treinamentos de engenharia mecânica e segurança do
            trabalho. O foco atual da operação é o laudo de opacidade para frotas a
            diesel, mas todo o portfólio abaixo já pode ser solicitado.
          </p>
        </ScrollReveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {SERVICOS.map((servico, index) => (
            <ScrollReveal key={servico.slug} index={index}>
              <ServicoCard servico={servico} destaque={index === 0} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      <ComoFunciona />

      <PhotoMosaic images={HOME_MOSAIC_IMAGES} />

      <WhyUsBlock />

      <ReviewsSection />

      <Faq />

      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-neutral-900">Fale com a gente</h2>
            <p className="mt-2 text-neutral-600">
              {COMPANY.telefone} · {COMPANY.email}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={linkWhatsapp(
                  COMPANY.whatsapp,
                  "Olá! Gostaria de solicitar um orçamento para teste de opacidade / fumaça preta."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Falar no WhatsApp
              </Link>
              <Link
                href="/contato"
                className="inline-flex min-h-11 items-center rounded-md border border-neutral-300 px-6 py-3 font-semibold text-neutral-700 hover:bg-white"
              >
                Ver outros canais de contato
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
