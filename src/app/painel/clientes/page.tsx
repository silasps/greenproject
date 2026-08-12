import Link from "next/link";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCpfCnpj } from "@/lib/utils/documento";

export default async function ClientesPage() {
  await requireArea("clientes");
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, cnpj_cpf, tipo, status")
    .order("nome");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
        <Link href="/painel/clientes/novo" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Novo cliente
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {clientes?.length === 0 && <p className="text-sm text-neutral-500">Nenhum cliente cadastrado.</p>}
        {clientes?.map((cliente) => (
          <Link
            key={cliente.id}
            href={`/painel/clientes/${cliente.id}`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50"
          >
            <div>
              <p className="font-medium text-neutral-900">{cliente.nome}</p>
              <p className="text-sm text-neutral-500">
                {cliente.cnpj_cpf ? formatCpfCnpj(cliente.cnpj_cpf) : "Cadastro pendente"}
              </p>
            </div>
            {cliente.status === "pendente" ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Pendente
              </span>
            ) : (
              <span className="text-sm text-neutral-400">{cliente.tipo === "pj" ? "Empresa" : "Pessoa física"}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
