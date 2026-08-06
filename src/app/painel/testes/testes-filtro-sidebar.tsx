"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { bucketDoTeste, FILTROS_STATUS, type LinhaTesteStatus } from "./status";

/** Contagem por status na sidebar de Testes — busca client-side sob demanda (só quando essa área abre), mesmo padrão do CategoriasFiltro da Agenda. */
export function TestesFiltroSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtroAtivo = searchParams.get("status");
  const [linhas, setLinhas] = useState<LinhaTesteStatus[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("agendamentos")
      .select("testes_opacidade(status, resultado)")
      .eq("tipo", "teste_opacidade")
      .neq("status", "cancelado")
      .then(({ data }) => setLinhas((data ?? []) as unknown as LinhaTesteStatus[]));
  }, []);

  const contagem = (chave: (typeof FILTROS_STATUS)[number]["key"]) =>
    linhas?.filter((l) => bucketDoTeste(l) === chave).length ?? null;

  // Página de detalhe de um teste (/painel/testes/[id]) também "está" nessa área,
  // mas o link "Todos" só deve acender na lista sem filtro nenhum.
  const emTodos = pathname === "/painel/testes" && !filtroAtivo;

  return (
    <div className="mt-4 px-3">
      <span className="px-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Testes</span>
      <div className="mt-1.5 space-y-0.5">
        <Link
          href="/painel/testes"
          className={cn(
            "flex items-center justify-between rounded-full px-3 py-1.5 text-sm",
            emTodos ? "bg-brand text-white" : "text-neutral-300 hover:bg-white/5 hover:text-white",
          )}
        >
          Todos
          <span className={cn("text-xs", emTodos ? "text-white/80" : "text-neutral-500")}>{linhas?.length ?? "…"}</span>
        </Link>

        {FILTROS_STATUS.map((filtro) => {
          const ativo = filtroAtivo === filtro.key;
          const total = contagem(filtro.key);
          if (total === 0) return null;
          return (
            <Link
              key={filtro.key}
              href={`/painel/testes?status=${filtro.key}`}
              className={cn(
                "flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-sm",
                ativo ? "bg-brand text-white" : "text-neutral-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: filtro.cor }} />
                <span className="truncate">{filtro.label}</span>
              </span>
              <span className={cn("shrink-0 text-xs", ativo ? "text-white/80" : "text-neutral-500")}>
                {total ?? "…"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
