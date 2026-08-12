"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";
import type { HeroSlide } from "@/lib/content/hero-slides";

const SLIDE_INTERVAL_MS = 5000;

function useHeroSlide(slideCount: number) {
  // prevIndex fica igual a index até a primeira troca — assim nenhum slide
  // nasce marcado como "saindo" no primeiro render.
  const [{ index, prevIndex }, setState] = useState({ index: 0, prevIndex: 0 });

  useEffect(() => {
    if (slideCount <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setState((current) => ({
        prevIndex: current.index,
        index: (current.index + 1) % slideCount,
      }));
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slideCount]);

  return { activeIndex: index, prevIndex };
}

// Posição horizontal de cada slide no "filminho" direita→esquerda: o ativo
// fica centrado, o que acabou de sair desliza pra fora à esquerda, e todos os
// outros ficam estacionados à direita, prontos pra entrar quando for a vez.
function slideX(index: number, activeIndex: number, prevIndex: number) {
  if (index === activeIndex) return "0%";
  if (index === prevIndex) return "-100%";
  return "100%";
}

const STATS = [
  { label: "Anos de atuação", value: "—" },
  { label: "Laudos emitidos", value: "—" },
  { label: "Atendimento", value: "—" },
] as const;

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
} as const;

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
} as const;

const label = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
} as const;

const fade = {
  hidden: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0 },
} as const;

function SlideLabel({
  servico,
  active,
  wrapperClassName,
  cardClassName,
  cta,
}: {
  servico: string;
  active: boolean;
  wrapperClassName: string;
  cardClassName?: string;
  cta?: { descricao: string; href: string };
}) {
  return (
    // escondido no mobile: o título principal já ancorado embaixo da foto
    // é o conteúdo prioritário ali — sobrepor um segundo bloco de texto
    // (o selo do serviço) competia pelo mesmo espaço e colidia com ele.
    // Só aparece a partir de sm, onde tem coluna própria à direita.
    <div className={`absolute inset-0 hidden px-6 sm:flex ${wrapperClassName}`}>
      {/* painel translúcido com blur — sobreposto direto na foto, longe da
          faixa de degradê pra não perder contraste */}
      <div
        className={`w-fit max-w-[240px] rounded-lg bg-ink/60 px-4 py-3.5 backdrop-blur-md sm:max-w-[260px] sm:px-5 sm:py-4 ${cardClassName ?? ""}`}
      >
        <motion.span
          variants={label}
          initial="hidden"
          animate={active ? "show" : "hidden"}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="block font-heading text-lg font-bold break-words text-white sm:text-xl"
        >
          {servico}
        </motion.span>

        {cta && (
          <>
            <motion.p
              variants={fade}
              initial="hidden"
              animate={active ? "show" : "hidden"}
              transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
              className="mt-1.5 text-xs break-words text-white/70 sm:text-sm"
            >
              {cta.descricao}
            </motion.p>
            <motion.div
              variants={fade}
              initial="hidden"
              animate={active ? "show" : "hidden"}
              transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
            >
              <Link
                href={cta.href}
                tabIndex={active ? 0 : -1}
                aria-hidden={!active}
                className="group/saiba mt-2 inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-brand"
              >
                Saiba mais
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover/saiba:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

export function Hero({ slides, whatsapp }: { slides: HeroSlide[]; whatsapp: string }) {
  const { activeIndex, prevIndex } = useHeroSlide(slides.length);

  return (
    <motion.section
      className="relative isolate flex min-h-[580px] flex-col justify-end overflow-hidden bg-ink text-white sm:min-h-[640px] sm:flex-row sm:items-center sm:justify-start lg:min-h-[700px]"
      initial={false}
      animate="show"
      variants={container}
    >
      {/* fundo: a foto ocupa o hero inteiro em qualquer tamanho de tela —
          no mobile o texto principal fica ancorado embaixo (degradê vertical),
          no desktop fica à esquerda (degradê horizontal) */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <motion.div
            key={slide.id}
            className={`absolute inset-0 ${index === activeIndex ? "" : "pointer-events-none"}`}
            animate={{
              x: slideX(index, activeIndex, prevIndex),
              opacity: index === activeIndex ? 1 : 0,
            }}
            transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
          >
            <Image
              src={slide.imagemUrl}
              alt={slide.imagemAlt}
              fill
              sizes="100vw"
              preload={index === 0}
              className="object-cover"
              style={{ objectPosition: slide.posicao }}
            />
            {/* selo do serviço: no mobile fica encostado no topo da foto, no
                desktop embaixo à direita — os dois nunca competem com o
                título principal, que fica na outra ponta do hero */}
            <SlideLabel
              servico={slide.servico}
              active={index === activeIndex}
              wrapperClassName="sm:items-end sm:justify-end sm:pr-10 sm:pb-10 lg:pr-16"
              cardClassName="text-right"
              cta={{ descricao: slide.descricao, href: slide.linkHref }}
            />
          </motion.div>
        ))}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/10 sm:hidden"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,var(--ink)_0%,var(--ink)_38%,transparent_72%)] sm:block"
        />
      </div>

      {/* padrão geométrico sutil, sem depender de foto de estoque genérica */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]"
      />

      <div className="pointer-events-none relative mx-auto w-full max-w-6xl min-w-0 px-4 py-10 sm:px-6 sm:py-24">
        <div className="pointer-events-auto w-full min-w-0 max-w-full sm:max-w-xl">
          <motion.h1
            variants={item}
            className="max-w-full text-3xl leading-tight font-bold text-balance sm:max-w-2xl sm:text-5xl"
          >
            Laudos técnicos com atendimento direto na sua garagem ou empresa.
          </motion.h1>
          <motion.p variants={item} className="mt-4 max-w-full text-base text-white/90 sm:max-w-xl sm:text-lg">
            Engenharia mecânica e segurança do trabalho: inspeções, testes e laudos com
            responsabilidade técnica, sem você precisar sair do lugar.
          </motion.p>
          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Link
              href={linkWhatsapp(
                whatsapp,
                "Olá! Gostaria de solicitar um orçamento para teste de opacidade / fumaça preta."
              )}
              target="_blank"
              rel="noopener noreferrer"
              suppressHydrationWarning
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-brand hover:bg-neutral-100"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Falar no WhatsApp
            </Link>
            <Link
              href={`tel:+${whatsapp}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Ligar agora
            </Link>
          </motion.div>

          <motion.dl
            variants={item}
            className="mt-10 flex max-w-full flex-wrap gap-x-8 gap-y-4 border-t border-white/20 pt-6 sm:divide-x sm:divide-white/15"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="sm:pl-8 sm:first:pl-0">
                <dt className="font-mono text-[11px] font-medium tracking-widest text-white/60 uppercase">
                  {stat.label}
                </dt>
                <dd className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold text-white">
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-white/50 italic">a confirmar</span>
                </dd>
              </div>
            ))}
          </motion.dl>

          <div className="mt-8 flex gap-1.5" role="tablist" aria-label="Serviços em destaque">
            {slides.map((slide, index) => (
              <span
                key={slide.id}
                role="tab"
                aria-selected={index === activeIndex}
                className={`h-1 rounded-full transition-all duration-500 ${
                  index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/35"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
