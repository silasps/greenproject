import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj } from "@/lib/utils/documento";
import { diasRestantes } from "@/lib/laudo/validade";

function badgeValidade(validade: string): { label: string; classe: string } {
  const dias = diasRestantes(validade);
  const dataFormatada = new Date(validade).toLocaleDateString("pt-BR");
  if (dias < 0) return { label: `Vencido em ${dataFormatada}`, classe: "bg-red-100 text-red-700" };
  if (dias <= 60) return { label: `Vence em ${dias} dia${dias === 1 ? "" : "s"} (${dataFormatada})`, classe: "bg-amber-100 text-amber-800" };
  return { label: `Válido até ${dataFormatada}`, classe: "bg-green-100 text-green-800" };
}

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["escritorio", "gerencia"]);
  const { id } = await params;
  const supabase = await createClient();

  // Três consultas independentes (nenhuma depende do resultado da outra) — em paralelo.
  const [{ data: cliente }, { data: veiculos }, { data: validades }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single(),
    supabase
      .from("veiculos_maquinas")
      .select("id, tipo_ativo, identificador, marca, modelo")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("veiculos_validade").select("veiculo_id, validade").eq("cliente_id", id),
  ]);
  if (!cliente) notFound();

  const validadePorVeiculo = new Map((validades ?? []).map((v) => [v.veiculo_id, v.validade]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{cliente.nome}</h1>
          <p className="text-sm text-neutral-500">
            {cliente.cnpj_cpf ? formatCpfCnpj(cliente.cnpj_cpf) : "Cadastro pendente"}
          </p>
        </div>
        <Link href={`/painel/clientes/${id}/editar`} className="text-sm text-brand hover:underline">
          {cliente.status === "pendente" ? "Completar cadastro" : "Editar cliente"}
        </Link>
      </div>
      {cliente.status === "pendente" && (
        <p className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          Cadastro pendente
        </p>
      )}

      <div className="mt-4 grid gap-1 text-sm text-neutral-600">
        {cliente.endereco && <p>{cliente.endereco}</p>}
        <p>
          {cliente.telefone} {cliente.email && `· ${cliente.email}`}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Veículos e equipamentos</h2>
        <Link
          href={`/painel/clientes/${id}/veiculos/novo`}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Novo veículo/equipamento
        </Link>
      </div>

      <div className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {veiculos?.length === 0 && (
          <p className="p-4 text-sm text-neutral-500">Nenhum veículo/equipamento cadastrado.</p>
        )}
        {veiculos?.map((v) => {
          const validade = validadePorVeiculo.get(v.id);
          const badge = validade ? badgeValidade(validade) : null;
          return (
            <div key={v.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">{v.identificador}</p>
                <p className="text-sm text-neutral-500">{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</p>
                {badge && (
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge.classe}`}>
                    {badge.label}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm text-neutral-400">
                  {v.tipo_ativo === "veiculo" ? "Veículo" : "Máquina/Equipamento"}
                </span>
                <Link
                  href={`/painel/agenda?retestar_cliente_id=${id}&retestar_veiculo_id=${v.id}`}
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
