"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { bucketDoTeste, FILTROS_STATUS, type FiltroStatus, type LinhaTesteStatus } from "./status";
import { useTestesFiltro } from "../testes-filtro-context";

/** Contagem por status na sidebar de Testes — busca client-side sob demanda (só quando essa área abre), mesmo padrão do CategoriasFiltro da Agenda. */
export function TestesFiltroSidebar() {
  const pathname = usePathname();
  const { filtro: filtroAtivo, setFiltro } = useTestesFiltro();
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

  const contagem = (chave: FiltroStatus) => linhas?.filter((l) => bucketDoTeste(l) === chave).length ?? null;

  // Já na lista de testes: clicar só troca o filtro no client (instantâneo,
  // sem navegação/round-trip). Vindo de outra página, deixa o <Link> navegar
  // normalmente — a lista lê o "?status=" da URL na primeira montagem.
  const naListaDeTestes = pathname === "/painel/testes";
  function aoClicar(e: MouseEvent<HTMLAnchorElement>, chave: FiltroStatus | null) {
    if (!naListaDeTestes) return;
    e.preventDefault();
    setFiltro(chave);
  }

  const emTodos = naListaDeTestes && !filtroAtivo;

  return (
    <div className="mt-4 px-3">
      <span className="px-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Testes</span>
      <div className="mt-1.5 space-y-0.5">
        <Link
          href="/painel/testes"
          onClick={(e) => aoClicar(e, null)}
          className={cn(
            "flex items-center justify-between rounded-full px-3 py-1.5 text-sm",
            emTodos ? "bg-brand text-white" : "text-neutral-300 hover:bg-white/5 hover:text-white",
          )}
        >
          Todos
          <span className={cn("text-xs", emTodos ? "text-white/80" : "text-neutral-500")}>{linhas?.length ?? "…"}</span>
        </Link>

        {FILTROS_STATUS.map((filtro) => {
          const ativo = naListaDeTestes && filtroAtivo === filtro.key;
          const total = contagem(filtro.key);
          if (total === 0) return null;
          return (
            <Link
              key={filtro.key}
              href={`/painel/testes?status=${filtro.key}`}
              onClick={(e) => aoClicar(e, filtro.key)}
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
