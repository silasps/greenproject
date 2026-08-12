import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/marketing/hero";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { CertificationsBand } from "@/components/marketing/certifications-band";
import { PhotoMosaic } from "@/components/marketing/photo-mosaic";
import { ServicosCarousel } from "@/components/marketing/servicos-carousel";
import { ComoFunciona } from "@/components/marketing/como-funciona";
import { WhyUsBlock } from "@/components/marketing/why-us-block";
import { ReviewsSection } from "@/components/marketing/reviews-section";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { getMosaicImages, getServicos } from "@/lib/content/servicos";

export const metadata: Metadata = {
  title: "Greenproject Engenharia | Laudos Técnicos em Campo em Contagem e Grande BH",
  description:
    "Engenharia mecânica e segurança do trabalho com atendimento direto na garagem ou empresa: laudo de opacidade, ensaios NDT, vistorias e treinamentos em Contagem e região metropolitana de BH.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Greenproject Engenharia | Laudos Técnicos em Campo",
    description:
      "Laudos técnicos com atendimento direto na sua garagem ou empresa: engenharia mecânica e segurança do trabalho, sem você precisar sair do lugar.",
    images: ["/hero/opacidade-slide-original.jpg"],
  },
};

export default async function HomePage() {
  const servicos = await getServicos();
  // Curadoria da gerência (/painel/servicos, campo "Exibir na home") — só
  // um gostinho do portfólio aqui, os 7 inteiros empilhados viravam uma
  // rolagem enorme, principalmente no celular. Lista completa fica em
  // /servicos.
  const servicosHome = servicos.filter((servico) => servico.exibirNaHome);
  const mosaicImages = await getMosaicImages();

  return (
    <div>
      <Hero />

      <CertificationsBand />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-neutral-900">Nossos serviços</h2>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Laudos, inspeções e treinamentos de engenharia mecânica e segurança do
            trabalho. O foco atual da operação é o laudo de opacidade para frotas a
            diesel.
          </p>
        </ScrollReveal>
        <ScrollReveal className="mt-8">
          <ServicosCarousel servicos={servicosHome} />
        </ScrollReveal>
        <ScrollReveal index={servicosHome.length} className="mt-8 text-center">
          <Link
            href="/servicos"
            className="group/link inline-flex items-center gap-2 font-semibold text-neutral-700 hover:text-brand"
          >
            Ver todos os serviços ({servicos.length})
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </ScrollReveal>
      </section>

      <ComoFunciona />

      <PhotoMosaic images={mosaicImages} />

      <WhyUsBlock />

      <ReviewsSection />

      <Faq />

      <FinalCta
        headline="Pronto para regularizar sua frota?"
        description="Fale com a gente e agende o teste de opacidade sem sair da sua garagem."
        whatsappMessage="Olá! Gostaria de solicitar um orçamento para teste de opacidade / fumaça preta."
      />
    </div>
  );
}
