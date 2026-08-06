"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { MessageCircle, Phone } from "lucide-react";
import { COMPANY } from "@/lib/legal/company-info";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";

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

export function Hero() {
  return (
    <motion.section
      className="relative isolate overflow-hidden bg-brand-dark text-white sm:flex sm:min-h-[640px] sm:items-center sm:bg-brand lg:min-h-[700px]"
      initial={false}
      animate="show"
      variants={container}
    >
      {/* mobile: a foto fica numa faixa própria no topo (recorte que evidencia o opacímetro em uso),
          com uma transição curta até o texto — sem ficar escondida atrás do painel sólido */}
      <div className="relative aspect-[3/2] w-full overflow-hidden sm:hidden">
        <Image
          src="/servicos/opacidade-fumaca-preta/opacidade-fumaca-preta-01-hero-mobile-v2.jpg"
          alt="Opacímetro sendo utilizado durante teste de fumaça preta em campo"
          fill
          sizes="100vw"
          preload
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-brand-dark to-transparent"
        />
      </div>

      {/* sm+: a foto ocupa o hero inteiro; o degradê horizontal faz a transição para o texto */}
      <div className="hidden sm:absolute sm:inset-0 sm:block">
        <Image
          src="/servicos/opacidade-fumaca-preta/opacidade-fumaca-preta-01.jpg"
          alt="Opacímetro sendo utilizado durante teste de fumaça preta em campo"
          fill
          sizes="100vw"
          preload
          className="object-cover object-[15%_78%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,var(--brand)_0%,var(--brand)_38%,transparent_72%)]"
        />
      </div>

      {/* padrão geométrico sutil, sem depender de foto de estoque genérica */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]"
      />

      <div className="relative mx-auto w-full max-w-6xl min-w-0 px-4 py-10 sm:px-6 sm:py-24">
        <div className="w-full min-w-0 max-w-full sm:max-w-xl">
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
                COMPANY.whatsapp,
                "Olá! Gostaria de solicitar um orçamento para teste de opacidade / fumaça preta."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-brand hover:bg-neutral-100"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Solicitar orçamento no WhatsApp
            </Link>
            <Link
              href={`tel:+${COMPANY.whatsapp}`}
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
        </div>
      </div>
    </motion.section>
  );
}
