import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Mail, Phone } from "lucide-react";
import { WhyUsBlock } from "@/components/marketing/why-us-block";
import { COMPANY } from "@/lib/legal/company-info";
import { getServicoBySlug, SERVICOS } from "@/lib/content/servicos";

type ServicoPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICOS.map((servico) => ({ slug: servico.slug }));
}

export async function generateMetadata({
  params,
}: ServicoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const servico = getServicoBySlug(slug);

  if (!servico) {
    return {
      title: "Serviço não encontrado | Greenproject Engenharia",
    };
  }

  return {
    title: `${servico.titulo} | Greenproject Engenharia`,
    description: servico.resumo,
    openGraph: {
      title: servico.titulo,
      description: servico.resumo,
      images: [servico.coverImage.src],
    },
  };
}

export default async function ServicoDetalhePage({ params }: ServicoPageProps) {
  const { slug } = await params;
  const servico = getServicoBySlug(slug);

  if (!servico) {
    notFound();
  }

  const hasStepImages = servico.metodologia.some((step) => step.imagem);

  return (
    <div className="bg-white">
      <section className="bg-neutral-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/servicos"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Serviços
          </Link>

          <div className="mt-6 grid w-full min-w-0 gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="w-full min-w-0 max-w-full">
              {servico.normas && (
                <div className="flex flex-wrap gap-2">
                  {servico.normas.map((norma) => (
                    <span
                      key={norma}
                      className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white/85 uppercase"
                    >
                      {norma}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="mt-5 max-w-full text-3xl leading-tight font-bold text-balance sm:text-5xl">
                {servico.headline}
              </h1>
              <p className="mt-5 max-w-full text-base leading-7 text-white/80 sm:max-w-2xl sm:text-lg sm:leading-8">
                {servico.subheadline}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="tel:+5531997901568"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  {COMPANY.telefone}
                </Link>
                <Link
                  href={`mailto:${COMPANY.email}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  E-mail
                </Link>
              </div>
            </div>

            <div className="relative aspect-video w-full min-w-0 max-w-full overflow-hidden rounded-md bg-neutral-800">
              <Image
                src={servico.coverImage.src}
                alt={servico.coverImage.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 48vw"
                preload
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              Por que sua empresa precisa disso?
            </p>
            <h2 className="mt-3 text-2xl font-bold text-neutral-900">
              Controle técnico antes do problema virar custo
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {servico.beneficios.map((beneficio) => (
              <div key={beneficio} className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden />
                <p className="leading-7 text-neutral-700">{beneficio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              Como fazemos
            </p>
            <h2 className="mt-3 text-2xl font-bold text-neutral-900">
              Metodologia documentada do início ao parecer
            </h2>
          </div>

          {hasStepImages ? (
            <div className="mt-8 space-y-5">
              {servico.metodologia.map((step, index) => (
                <article
                  key={step.titulo}
                  className="grid gap-5 rounded-md border border-neutral-200 p-4 sm:grid-cols-[220px_1fr] sm:items-center"
                >
                  {step.imagem && (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-neutral-100">
                      <Image
                        src={step.imagem.src}
                        alt={step.imagem.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, 220px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-brand">
                      Etapa {index + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-neutral-900">
                      {step.titulo}
                    </h3>
                    <p className="mt-2 leading-7 text-neutral-600">{step.descricao}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <ol className="mt-8 grid gap-5 sm:grid-cols-3">
              {servico.metodologia.map((step, index) => (
                <li
                  key={step.titulo}
                  className="rounded-md border border-neutral-200 p-5"
                >
                  <p className="text-sm font-semibold text-brand">
                    Etapa {index + 1}
                  </p>
                  <h3 className="mt-2 font-semibold text-neutral-900">{step.titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    {step.descricao}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {servico.galleryImages.length > 0 && (
        <section className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold text-neutral-900">Fotos do serviço</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {servico.galleryImages.map((image) => (
                <div
                  key={image.src}
                  className="relative aspect-[4/3] overflow-hidden rounded-md bg-neutral-100"
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              O que você recebe
            </p>
            <h2 className="mt-3 text-2xl font-bold text-neutral-900">
              Documentação pronta para decisão
            </h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {servico.entregaveis.map((entregavel) => (
              <li key={entregavel} className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden />
                <span className="leading-7 text-neutral-700">{entregavel}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <WhyUsBlock />

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-neutral-900">
            Precisa desse laudo na sua operação?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-neutral-600">
            Fale diretamente com a Greenproject para combinar local, prazo e escopo da
            inspeção.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="tel:+5531997901568"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Ligar agora
            </Link>
            <Link
              href={`mailto:${COMPANY.email}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-800 hover:border-brand/50 hover:text-brand"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Enviar e-mail
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
