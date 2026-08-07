import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ResponsaveisTecnicosPage() {
  await requireRole(["gerencia"]);
  const supabase = await createClient();
  const { data: responsaveis } = await supabase
    .from("responsaveis_tecnicos")
    .select("id, nome, formacao, registro_conselho")
    .order("nome");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Responsáveis técnicos</h1>
        <Link
          href="/painel/responsaveis-tecnicos/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Novo responsável
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {responsaveis?.length === 0 && <p className="text-sm text-neutral-500">Nenhum responsável cadastrado.</p>}
        {responsaveis?.map((r) => (
          <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="font-medium text-neutral-900">{r.nome}</p>
            <p className="text-sm text-neutral-500">
              {[r.formacao, r.registro_conselho].filter(Boolean).join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
