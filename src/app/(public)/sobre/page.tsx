import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned, ClipboardCheck, ShieldCheck } from "lucide-react";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Sobre | Greenproject Engenharia",
  description:
    "Engenharia mecânica e segurança do trabalho com atendimento técnico em campo. Conheça a Greenproject.",
  alternates: {
    canonical: "/sobre",
  },
};

export default function SobrePage() {
  return (
    <div className="bg-background">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Sobre a Greenproject
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-neutral-900 sm:text-4xl">
            Engenharia mecânica com responsabilidade técnica, no lugar onde sua
            operação acontece
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Somos uma empresa de engenharia mecânica e segurança do trabalho voltada a
            inspeções, testes e laudos técnicos, com atendimento direto na garagem,
            empresa ou local de operação do cliente.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h2 className="text-xl font-bold text-neutral-900">Como trabalhamos</h2>
        <p className="mt-4 leading-7 text-neutral-600">
          A {COMPANY.razaoSocial} conduz seus ensaios e laudos in loco, evitando que o
          cliente precise deslocar veículos ou parar a rotina de operação para ser
          atendido. Cada serviço é conduzido por engenharia especializada, com foco em
          conformidade, segurança e rastreabilidade dos resultados.
        </p>
        <p className="mt-4 leading-7 text-neutral-600">
          O foco atual da operação é o laudo de opacidade e fumaça preta para frotas a
          diesel, atendendo aos critérios do CONAMA e do IBAMA. Além dele, oferecemos
          todo o portfólio de laudos, inspeções e treinamentos de engenharia mecânica e
          segurança do trabalho listados em{" "}
          <Link href="/servicos" className="text-brand underline hover:text-brand-dark">
            nossos serviços
          </Link>
          .
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <div>
            <MapPinned className="h-5 w-5 text-neutral-500" aria-hidden />
            <h3 className="mt-3 font-semibold text-neutral-900">Atendimento em campo</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              A equipe vai até você, reduzindo deslocamento e parada da operação.
            </p>
          </div>
          <div>
            <ClipboardCheck className="h-5 w-5 text-neutral-500" aria-hidden />
            <h3 className="mt-3 font-semibold text-neutral-900">Registro técnico claro</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Laudos organizados para auditorias, fiscalizações e gestão interna.
            </p>
          </div>
          <div>
            <ShieldCheck className="h-5 w-5 text-neutral-500" aria-hidden />
            <h3 className="mt-3 font-semibold text-neutral-900">Responsabilidade técnica</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Serviços conduzidos por engenharia especializada, com foco em conformidade.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h2 className="text-sm font-semibold text-neutral-900">Dados da empresa</h2>
          <p className="mt-2 text-sm text-neutral-600">{COMPANY.razaoSocial}</p>
          <p className="text-sm text-neutral-600">CNPJ {COMPANY.cnpj}</p>
          <p className="text-sm text-neutral-600">{COMPANY.endereco}</p>
        </div>
      </section>
    </div>
  );
}
