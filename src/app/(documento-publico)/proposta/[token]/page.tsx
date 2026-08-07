import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicUrl } from "@/lib/storage/upload";
import { aceitarProposta } from "./actions";

export const metadata: Metadata = {
  title: "Proposta | Greenproject Engenharia",
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PropostaPublicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: proposta } = await admin
    .from("propostas")
    .select(
      "km_ida_volta, valor_km, pedagio, alimentacao, valor_servico, custos_extras, valor_total, status, pdf_path, clientes(nome), agendamentos!agendamento_id(tipos_servico(nome))",
    )
    .eq("token", token)
    .maybeSingle();

  if (!proposta) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = proposta.clientes as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nomeServico = (proposta.agendamentos as any)?.tipos_servico?.nome ?? "Teste de Opacidade";
  const pdfUrl = proposta.pdf_path ? publicUrl("propostas", proposta.pdf_path) : null;

  const statusLabel: Record<string, string> = {
    enviada: "Aguardando aceite",
    aceita: "Aceita",
    expirada: "Expirada",
  };

  return (
    <div className="px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div
          className={`rounded-full px-4 py-1 text-sm font-semibold ${
            proposta.status === "aceita" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {statusLabel[proposta.status] ?? proposta.status}
        </div>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900">Proposta de serviço</h1>
        <p className="mt-1 text-sm font-semibold text-brand">{nomeServico}</p>
        {cliente?.nome && <p className="mt-0.5 text-sm text-neutral-500">{cliente.nome}</p>}

        <dl className="mt-6 w-full space-y-2 text-left text-sm">
          <div className="flex justify-between border-b border-neutral-100 py-2">
            <dt className="text-neutral-500">Deslocamento</dt>
            <dd className="font-medium text-neutral-900">
              {proposta.km_ida_volta.toFixed(1)} km × {formatarMoeda(proposta.valor_km)}
            </dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 py-2">
            <dt className="text-neutral-500">Pedágio</dt>
            <dd className="font-medium text-neutral-900">{formatarMoeda(proposta.pedagio)}</dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 py-2">
            <dt className="text-neutral-500">Alimentação</dt>
            <dd className="font-medium text-neutral-900">{formatarMoeda(proposta.alimentacao)}</dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 py-2">
            <dt className="text-neutral-500">Valor do serviço</dt>
            <dd className="font-medium text-neutral-900">{formatarMoeda(proposta.valor_servico)}</dd>
          </div>
          {(proposta.custos_extras as { descricao: string; valor: number }[]).map((item, i) => (
            <div key={i} className="flex justify-between border-b border-neutral-100 py-2">
              <dt className="text-neutral-500">{item.descricao}</dt>
              <dd className="font-medium text-neutral-900">{formatarMoeda(item.valor)}</dd>
            </div>
          ))}
          <div className="mt-1 flex justify-between rounded-lg bg-brand/5 px-3 py-3 text-base">
            <dt className="font-semibold text-neutral-900">Total</dt>
            <dd className="font-bold text-brand">{formatarMoeda(proposta.valor_total)}</dd>
          </div>
        </dl>

        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 w-full rounded-md border border-neutral-300 px-6 py-3 font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Baixar PDF da proposta
          </a>
        )}

        {proposta.status === "enviada" && (
          <form action={aceitarProposta.bind(null, token)} className="mt-4 w-full">
            <button
              type="submit"
              className="w-full rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
            >
              Aceitar proposta
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
