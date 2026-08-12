import { ClipboardCheck, MapPinned, ShieldCheck, Wrench } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const REASONS = [
  {
    icon: MapPinned,
    title: "Atendimento em campo",
    description:
      "A equipe vai até a garagem, empresa ou local de operação para reduzir deslocamentos e parada da rotina.",
  },
  {
    icon: ClipboardCheck,
    title: "Registro técnico claro",
    description:
      "Os laudos organizam dados, imagens e conclusões de forma objetiva para auditorias, fiscalizações e gestão interna.",
  },
  {
    icon: ShieldCheck,
    title: "Responsabilidade profissional",
    description:
      "Os serviços são conduzidos por engenharia especializada, com foco em conformidade, segurança e rastreabilidade.",
  },
  {
    icon: Wrench,
    title: "Orientação prática",
    description:
      "Quando há não conformidade, você recebe encaminhamentos técnicos para corrigir o problema com mais segurança.",
  },
];

export function WhyUsBlock() {
  return (
    <section className="border-y border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Diferenciais
          </p>
          <h2 className="mt-3 text-2xl font-bold text-neutral-900">
            Por que escolher nossos especialistas?
          </h2>
          <p className="mt-3 text-neutral-600">
            A Greenproject combina execução em campo, documentação técnica e
            atendimento direto para transformar inspeções em decisões claras.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ icon: Icon, title, description }, index) => (
            <ScrollReveal
              key={title}
              index={index}
              className="relative rounded-md border border-neutral-200 bg-white p-5 transition-shadow duration-300 hover:shadow-sm"
            >
              <span className="absolute top-4 right-4 font-mono text-[11px] text-neutral-300">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon className="h-5 w-5 text-neutral-500" aria-hidden />
              <h3 className="mt-4 font-semibold text-neutral-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
