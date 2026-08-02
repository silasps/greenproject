import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj } from "@/lib/utils/documento";

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["escritorio", "gerencia"]);
  const { id } = await params;
  const supabase = await createClient();

  // Duas consultas independentes (nenhuma depende do resultado da outra) — em paralelo.
  const [{ data: cliente }, { data: veiculos }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single(),
    supabase
      .from("veiculos_maquinas")
      .select("id, tipo_ativo, identificador, marca, modelo")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!cliente) notFound();

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
        {veiculos?.map((v) => (
          <div key={v.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-neutral-900">{v.identificador}</p>
              <p className="text-sm text-neutral-500">
                {[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}
              </p>
            </div>
            <span className="text-sm text-neutral-400">
              {v.tipo_ativo === "veiculo" ? "Veículo" : "Máquina/Equipamento"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
