import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const PASSOS = [
  {
    titulo: "Solicitação",
    descricao:
      "Você entra em contato pelo WhatsApp, telefone ou e-mail e descreve o veículo, equipamento ou situação a avaliar.",
  },
  {
    titulo: "Agendamento em campo",
    descricao:
      "Combinamos data e horário para a visita técnica direto na garagem, empresa ou local de operação — sem deslocar sua frota.",
  },
  {
    titulo: "Execução do ensaio",
    descricao:
      "A equipe realiza as medições com o equipamento apropriado e registra os resultados durante o próprio atendimento.",
  },
  {
    titulo: "Entrega do laudo",
    descricao:
      "Você recebe o laudo técnico com parecer conclusivo e, se houver não conformidade, orientações objetivas para regularizar.",
  },
] as const;

export function ComoFunciona() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <h2 className="max-w-xl text-2xl font-bold text-neutral-900">
          Como funciona: do primeiro contato ao laudo em mãos
        </h2>

        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:flex lg:items-stretch lg:gap-0">
          {PASSOS.map((passo, index) => (
            <Fragment key={passo.titulo}>
              <ScrollReveal
                as="li"
                index={index}
                className="rounded-md border border-neutral-200 bg-neutral-50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm lg:flex-1"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white font-mono text-xs font-bold text-neutral-900">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-semibold text-neutral-900">{passo.titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{passo.descricao}</p>
              </ScrollReveal>
              {index < PASSOS.length - 1 && (
                <li
                  aria-hidden="true"
                  className="relative hidden lg:flex lg:w-10 lg:shrink-0 lg:list-none lg:items-center lg:justify-center lg:self-center"
                >
                  <span className="h-px w-full bg-neutral-300" />
                  <ArrowRight
                    className="absolute h-4 w-4 shrink-0 bg-background text-neutral-400"
                    aria-hidden
                  />
                </li>
              )}
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  );
}
