import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { diasRestantes } from "@/lib/laudo/validade";
import { formatTelefone } from "@/lib/utils/mascaras";
import { WhatsappButton } from "./whatsapp-button";
import { marcarSolicitacaoRetestagem } from "./actions";

function badge(dias: number): { label: string; classe: string } {
  if (dias < 0) return { label: `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`, classe: "bg-red-100 text-red-700" };
  return { label: `Vence em ${dias} dia${dias === 1 ? "" : "s"}`, classe: "bg-amber-100 text-amber-800" };
}

export default async function TestesVencendoPage() {
  await requireRole(["escritorio", "gerencia"]);
  const supabase = await createClient();

  const { data: dadosEmpresa } = await supabase.from("dados_empresa").select("dias_alerta_vencimento").single();
  const limiar = Math.max(...(dadosEmpresa?.dias_alerta_vencimento ?? [60]));

  const { data: validades } = await supabase.from("veiculos_validade").select("veiculo_id, cliente_id, laudo_id, validade");
  const proximas = (validades ?? [])
    .map((v) => ({ ...v, dias: diasRestantes(v.validade) }))
    .filter((v) => v.dias <= limiar)
    .sort((a, b) => a.dias - b.dias);

  const veiculoIds = proximas.map((v) => v.veiculo_id);
  const clienteIds = Array.from(new Set(proximas.map((v) => v.cliente_id)));

  const [{ data: veiculos }, { data: clientes }, { data: contatos }, { data: solicitacoes }] = await Promise.all([
    veiculoIds.length
      ? supabase.from("veiculos_maquinas").select("id, identificador, marca, modelo").in("id", veiculoIds)
      : Promise.resolve({ data: [] }),
    clienteIds.length
      ? supabase.from("clientes").select("id, nome, telefone").in("id", clienteIds)
      : Promise.resolve({ data: [] }),
    veiculoIds.length
      ? supabase
          .from("contatos_retestagem")
          .select("veiculo_id, canal, enviado_em")
          .in("veiculo_id", veiculoIds)
          .order("enviado_em", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("solicitacoes_retestagem")
      .select("id, cliente_id, veiculo_id, mensagem, created_at")
      .eq("status", "pendente")
      .order("created_at", { ascending: false }),
  ]);
  const veiculoPorId = new Map((veiculos ?? []).map((v) => [v.id, v]));
  const clientePorId = new Map((clientes ?? []).map((c) => [c.id, c]));

  // Último contato por veículo+canal — só o mais recente interessa pra mostrar "enviado em X".
  const ultimoContatoPorVeiculoCanal = new Map<string, string>();
  for (const c of contatos ?? []) {
    const chave = `${c.veiculo_id}:${c.canal}`;
    if (!ultimoContatoPorVeiculoCanal.has(chave)) ultimoContatoPorVeiculoCanal.set(chave, c.enviado_em);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Testes vencendo</h1>
        <Link href="/painel/testes" className="text-sm text-brand hover:underline">
          Ver todos os testes →
        </Link>
      </div>
      <p className="mt-2 text-neutral-600">
        Veículos com laudo vencido ou vencendo nos próximos {limiar} dias — use pra iniciar o contato de retestagem.
      </p>

      {solicitacoes && solicitacoes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
            Solicitações de clientes ({solicitacoes.length})
          </h2>
          <div className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {solicitacoes.map((s) => {
              const veiculo = veiculoPorId.get(s.veiculo_id);
              const cliente = clientePorId.get(s.cliente_id);
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">{cliente?.nome ?? "—"}</p>
                    <p className="text-sm text-neutral-500">
                      {veiculo?.identificador ?? "—"}
                      {s.mensagem && ` · "${s.mensagem}"`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/painel/agenda?retestar_cliente_id=${s.cliente_id}&retestar_veiculo_id=${s.veiculo_id}`}
                      className="rounded-md border border-brand px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                    >
                      Agendar
                    </Link>
                    <form action={marcarSolicitacaoRetestagem.bind(null, s.id, "agendado")}>
                      <button type="submit" className="text-xs text-neutral-400 hover:underline">
                        Marcar como agendado
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {proximas.length === 0 && <p className="mt-6 text-sm text-neutral-500">Nenhum veículo vencendo no período.</p>}

      <div className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {proximas.map((v) => {
          const veiculo = veiculoPorId.get(v.veiculo_id);
          const cliente = clientePorId.get(v.cliente_id);
          const info = badge(v.dias);
          const veiculoLabel = veiculo ? `${veiculo.marca ?? ""} ${veiculo.modelo ?? ""} - ${veiculo.identificador}`.trim() : "";
          const emailEnviadoEm = ultimoContatoPorVeiculoCanal.get(`${v.veiculo_id}:email`);
          const whatsappEnviadoEm = ultimoContatoPorVeiculoCanal.get(`${v.veiculo_id}:whatsapp`);
          return (
            <div key={v.veiculo_id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">{cliente?.nome ?? "—"}</p>
                <p className="text-sm text-neutral-500">
                  {veiculo?.identificador} · {[veiculo?.marca, veiculo?.modelo].filter(Boolean).join(" ") || "—"}
                  {cliente?.telefone && ` · ${formatTelefone(cliente.telefone)}`}
                </p>
                {(emailEnviadoEm || whatsappEnviadoEm) && (
                  <p className="mt-1 text-xs text-neutral-400">
                    {emailEnviadoEm && `E-mail enviado em ${new Date(emailEnviadoEm).toLocaleDateString("pt-BR")}`}
                    {emailEnviadoEm && whatsappEnviadoEm && " · "}
                    {whatsappEnviadoEm && `WhatsApp enviado em ${new Date(whatsappEnviadoEm).toLocaleDateString("pt-BR")}`}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${info.classe}`}>{info.label}</span>
                {cliente?.telefone && (
                  <WhatsappButton
                    telefone={cliente.telefone}
                    mensagem={`Olá ${cliente.nome}, o laudo de opacidade do veículo ${veiculoLabel} ${v.dias < 0 ? "já venceu" : `vence em ${v.dias} dia${v.dias === 1 ? "" : "s"}`}. Quer agendar a retestagem?`}
                    veiculoId={v.veiculo_id}
                    laudoId={v.laudo_id}
                  />
                )}
                <Link
                  href={`/painel/agenda?retestar_cliente_id=${v.cliente_id}&retestar_veiculo_id=${v.veiculo_id}`}
                  className="rounded-md border border-brand px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                >
                  Retestar
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
