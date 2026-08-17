import Link from "next/link";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ResponsaveisTecnicosPage() {
  await requireArea("responsaveis_tecnicos");
  const supabase = await createClient();
  const { data: responsaveis } = await supabase
    .from("responsaveis_tecnicos")
    .select("id, nome, formacao, registro_conselho, imagem_assinatura_path")
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
          <Link
            key={r.id}
            href={`/painel/responsaveis-tecnicos/${r.id}/editar`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 hover:border-brand/40"
          >
            <div>
              <p className="font-medium text-neutral-900">{r.nome}</p>
              <p className="text-sm text-neutral-500">
                {[r.formacao, r.registro_conselho].filter(Boolean).join(" · ")}
              </p>
            </div>
            {!r.imagem_assinatura_path && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Sem assinatura cadastrada
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
