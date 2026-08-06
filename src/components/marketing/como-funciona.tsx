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
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">
          Como funciona
        </p>
        <h2 className="mt-3 max-w-xl text-2xl font-bold text-neutral-900">
          Do primeiro contato ao laudo em mãos
        </h2>

        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((passo, index) => (
            <ScrollReveal
              key={passo.titulo}
              as="li"
              index={index}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-5"
            >
              <span className="font-mono text-xs font-medium tracking-widest text-brand uppercase">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-semibold text-neutral-900">{passo.titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{passo.descricao}</p>
            </ScrollReveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
