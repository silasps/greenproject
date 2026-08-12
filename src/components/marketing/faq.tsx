"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildFaqSchema } from "@/lib/seo/schema";
import { ScrollReveal } from "./scroll-reveal";

const PERGUNTAS = [
  {
    pergunta: "Preciso levar o veículo até vocês?",
    resposta:
      "Não. O atendimento é feito em campo: a equipe vai até a garagem, empresa ou local de operação para reduzir deslocamento e parada da rotina.",
  },
  {
    pergunta: "Quais normas o laudo de opacidade segue?",
    resposta:
      "O ensaio de opacidade e fumaça preta é conduzido conforme os critérios do CONAMA e do IBAMA para controle de emissões em veículos e equipamentos a diesel.",
  },
  {
    pergunta: "O que vem no laudo entregue?",
    resposta:
      "Identificação do veículo avaliado, o registro dos resultados medidos em campo e um parecer técnico conclusivo sobre a conformidade.",
  },
  {
    pergunta: "E se o veículo não passar no teste?",
    resposta:
      "Você recebe orientações objetivas para regularização, indicando o que precisa ser corrigido antes de uma nova avaliação.",
  },
] as const;

export function Faq() {
  const [aberta, setAberta] = useState<string | null>(null);

  return (
    <section className="border-t border-neutral-200 bg-background">
      <JsonLd data={buildFaqSchema(PERGUNTAS)} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-bold text-neutral-900">
          Perguntas frequentes sobre o laudo de opacidade
        </h2>

        <div className="mt-8 divide-y divide-neutral-200 border-t border-b border-neutral-200">
          {PERGUNTAS.map((item, index) => {
            const aberto = aberta === item.pergunta;
            return (
              <ScrollReveal key={item.pergunta} index={index}>
                <button
                  type="button"
                  aria-expanded={aberto}
                  onClick={() => setAberta(aberto ? null : item.pergunta)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left font-semibold text-neutral-900"
                >
                  {item.pergunta}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-300 ${aberto ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {aberto && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-4 text-sm leading-6 text-neutral-600">
                        {item.resposta}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
