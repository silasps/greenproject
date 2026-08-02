import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { richTextClasses } from "@/components/rich-text-editor";

export default async function FuncoesPage() {
  await requireRole(["gerencia"]);
  const supabase = await createClient();
  const { data: funcoes } = await supabase
    .from("funcoes")
    .select("id, nome, descricao, nivel_acesso")
    .order("nome");

  return (
    <div>
      <Link href="/painel/dp" className="text-sm text-neutral-500 hover:underline">
        ← Voltar
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Funções</h1>
        <Link
          href="/painel/dp/funcoes/novo"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Nova função
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {funcoes?.length === 0 && (
          <p className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 shadow-sm">
            Nenhuma função cadastrada.
          </p>
        )}
        {funcoes?.map((f) => (
          <Link
            key={f.id}
            href={`/painel/dp/funcoes/${f.id}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:bg-neutral-50"
          >
            <div className="min-w-0">
              <p className="font-medium text-neutral-900">{f.nome}</p>
              {f.descricao && (
                <div
                  className={`line-clamp-2 overflow-hidden text-neutral-500 ${richTextClasses}`}
                  dangerouslySetInnerHTML={{ __html: f.descricao }}
                />
              )}
            </div>
            <span className="shrink-0 text-sm text-neutral-400">{ROLE_LABELS[f.nivel_acesso as Role]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
