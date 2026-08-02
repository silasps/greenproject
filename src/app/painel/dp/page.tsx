import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";

export default async function DpPage() {
  await requireRole(["gerencia"]);
  const supabase = await createClient();

  const { data: pessoas } = await supabase
    .from("usuarios_perfis")
    .select("id, nome, role, acesso_sistema, funcoes(nome)")
    .order("nome");

  const ativos = (pessoas ?? []).filter((p) => p.acesso_sistema);
  const porFuncao = new Map<string, number>();
  for (const p of ativos) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nomeFuncao = (p as any).funcoes?.nome ?? "Sem função";
    porFuncao.set(nomeFuncao, (porFuncao.get(nomeFuncao) ?? 0) + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Departamento Pessoal</h1>
        <div className="flex gap-2">
          <Link
            href="/painel/dp/funcoes"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Funções
          </Link>
          <Link
            href="/painel/dp/novo"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Nova pessoa
          </Link>
        </div>
      </div>

      {porFuncao.size > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-dark">
            {ativos.length} ativos no total
          </span>
          {Array.from(porFuncao.entries()).map(([nomeFuncao, total]) => (
            <span key={nomeFuncao} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
              {nomeFuncao}: {total}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {pessoas?.length === 0 && <p className="p-4 text-sm text-neutral-500">Nenhuma pessoa cadastrada.</p>}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {pessoas?.map((p: any) => (
          <Link
            key={p.id}
            href={`/painel/dp/${p.id}/editar`}
            className="flex items-center justify-between p-4 hover:bg-neutral-50"
          >
            <div>
              <p className="font-medium text-neutral-900">{p.nome}</p>
              <p className="text-sm text-neutral-500">
                {ROLE_LABELS[p.role as keyof typeof ROLE_LABELS]} {p.funcoes?.nome && `· ${p.funcoes.nome}`}
              </p>
            </div>
            <Badge variant={p.acesso_sistema ? undefined : "outline"} className={p.acesso_sistema ? "bg-brand text-white" : ""}>
              {p.acesso_sistema ? "Ativo" : "Inativo"}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
