import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { solicitarRetestagem } from "./actions";

export const metadata: Metadata = {
  title: "Retestagem | Greenproject Engenharia",
};

export default async function RetestagemPublicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: contato } = await admin
    .from("contatos_retestagem")
    .select("veiculo_id")
    .eq("token", token)
    .maybeSingle();
  if (!contato) notFound();

  const { data: veiculo } = await admin
    .from("veiculos_maquinas")
    .select("id, identificador, marca, modelo, cliente_id, clientes(nome)")
    .eq("id", contato.veiculo_id)
    .maybeSingle();
  if (!veiculo) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = veiculo.clientes as any;
  const veiculoLabel = `${veiculo.marca ?? ""} ${veiculo.modelo ?? ""} - ${veiculo.identificador}`.trim();

  const { data: solicitacaoExistente } = await admin
    .from("solicitacoes_retestagem")
    .select("id")
    .eq("veiculo_id", veiculo.id)
    .eq("status", "pendente")
    .maybeSingle();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-neutral-900">Solicitar retestagem</h1>
      {cliente?.nome && <p className="mt-1 text-neutral-500">{cliente.nome}</p>}
      <p className="mt-4 rounded-md bg-neutral-100 px-4 py-2 font-medium text-neutral-900">{veiculoLabel}</p>

      {solicitacaoExistente ? (
        <p className="mt-6 rounded-md bg-green-100 px-4 py-3 text-sm text-green-800">
          Solicitação recebida — nossa equipe vai entrar em contato pra combinar a data.
        </p>
      ) : (
        <form action={solicitarRetestagem.bind(null, token)} className="mt-6 w-full space-y-3 text-left">
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="mensagem">
              Mensagem (opcional)
            </label>
            <textarea
              id="mensagem"
              name="mensagem"
              rows={3}
              className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm"
              placeholder="Ex.: preferimos na semana que vem, de manhã"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            Solicitar agendamento
          </button>
        </form>
      )}
    </div>
  );
}
