import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicUrl } from "@/lib/storage/upload";

export const metadata: Metadata = {
  title: "Verificação de Laudo | Greenproject Engenharia",
  robots: { index: false, follow: false },
};

export default async function VerificarLaudoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const admin = createAdminClient();

  const { data: laudo } = await admin
    .from("laudos")
    .select("numero, emitido_em, pdf_path, testes_opacidade(resultado, veiculos_maquinas(identificador, marca, modelo, clientes(nome)))")
    .eq("codigo_publico", codigo)
    .maybeSingle();

  if (!laudo) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teste = laudo.testes_opacidade as any;
  const veiculo = teste?.veiculos_maquinas;
  const pdfUrl = publicUrl("laudos", laudo.pdf_path);

  return (
    <div className="px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div
          className={`rounded-full px-4 py-1 text-sm font-semibold ${
            teste?.resultado === "aprovado" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          Laudo válido — {teste?.resultado?.toUpperCase()}
        </div>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900">Laudo nº {laudo.numero}</h1>
        <dl className="mt-6 w-full space-y-2 text-left text-sm">
          <div className="flex justify-between border-b border-neutral-100 py-2">
            <dt className="text-neutral-500">Veículo/equipamento</dt>
            <dd className="font-medium text-neutral-900">{veiculo?.identificador}</dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 py-2">
            <dt className="text-neutral-500">Marca/Modelo</dt>
            <dd className="font-medium text-neutral-900">
              {veiculo?.marca} {veiculo?.modelo}
            </dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 py-2">
            <dt className="text-neutral-500">Cliente</dt>
            <dd className="font-medium text-neutral-900">{veiculo?.clientes?.nome}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-neutral-500">Emitido em</dt>
            <dd className="font-medium text-neutral-900">
              {new Date(laudo.emitido_em).toLocaleDateString("pt-BR")}
            </dd>
          </div>
        </dl>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 w-full rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          Baixar PDF do laudo
        </a>
      </div>
    </div>
  );
}
