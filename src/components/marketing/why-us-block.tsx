import { ClipboardCheck, MapPinned, ShieldCheck, Wrench } from "lucide-react";

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
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-neutral-900">
            Por que escolher nossos especialistas?
          </h2>
          <p className="mt-3 text-neutral-600">
            A Greenproject combina execução em campo, documentação técnica e
            atendimento direto para transformar inspeções em decisões claras.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-md border border-neutral-200 bg-white p-5">
              <Icon className="h-5 w-5 text-brand" aria-hidden />
              <h3 className="mt-4 font-semibold text-neutral-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
