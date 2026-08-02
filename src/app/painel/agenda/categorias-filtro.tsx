"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { useAgendaNav } from "../agenda-nav-context";
import { CORES_AGENDA } from "./cores";
import type { Categoria } from "./tipos";

/** Lista de categorias na sidebar — caixinha colorida liga/desliga a categoria no calendário; "+" cria, lápis edita nome/cor. */
export function CategoriasFiltro() {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [criando, setCriando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [corNova, setCorNova] = useState(CORES_AGENDA[0]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [corEdicao, setCorEdicao] = useState(CORES_AGENDA[0]);
  const { categoriasOcultas, alternarCategoriaOculta, categoriasVersao } = useAgendaNav();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("categorias_agenda")
      .select("id, nome, cor")
      .order("nome")
      .then(({ data }) => setCategorias(data ?? []));
    // categoriasVersao muda quando criar/editar um evento pode ter criado
    // uma categoria nova (ex.: a pessoal automática) — recarrega a lista.
  }, [categoriasVersao]);

  async function criarCategoria() {
    const nome = nomeNovo.trim();
    if (!nome) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categorias_agenda")
      .insert({ nome, cor: corNova })
      .select("id, nome, cor")
      .single();
    if (error || !data) return;
    setCategorias((prev) => [...(prev ?? []), data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setCriando(false);
    setNomeNovo("");
  }

  function abrirEdicao(cat: Categoria) {
    setEditandoId(cat.id);
    setNomeEdicao(cat.nome);
    setCorEdicao(cat.cor);
  }

  async function salvarEdicao(id: string) {
    const nome = nomeEdicao.trim();
    if (!nome) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categorias_agenda")
      .update({ nome, cor: corEdicao })
      .eq("id", id)
      .select("id, nome, cor")
      .single();
    if (error || !data) return;
    setCategorias((prev) => (prev ?? []).map((c) => (c.id === id ? data : c)).sort((a, b) => a.nome.localeCompare(b.nome)));
    setEditandoId(null);
  }

  async function excluirCategoria(id: string) {
    const supabase = createClient();
    await supabase.from("categorias_agenda").delete().eq("id", id);
    setCategorias((prev) => (prev ?? []).filter((c) => c.id !== id));
    setEditandoId(null);
  }

  return (
    <div className="mt-4 px-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Categorias</span>
        <button
          type="button"
          onClick={() => setCriando((v) => !v)}
          aria-label="Nova categoria"
          className="flex size-5 items-center justify-center rounded-full text-brand hover:bg-white/10 hover:text-white"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div className="mt-1.5 space-y-0.5">
        {(categorias ?? []).map((cat) => {
          if (editandoId === cat.id) {
            return (
              <div key={cat.id} className="mt-1 mb-1 space-y-2 rounded-md bg-white/5 p-2">
                <input
                  value={nomeEdicao}
                  onChange={(e) => setNomeEdicao(e.target.value)}
                  className="w-full rounded border border-white/10 bg-transparent px-2 py-1 text-sm text-white focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-1">
                  {CORES_AGENDA.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setCorEdicao(cor)}
                      className={cn(
                        "size-4 rounded-full",
                        corEdicao === cor && "ring-2 ring-white ring-offset-1 ring-offset-neutral-900",
                      )}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => salvarEdicao(cat.id)}
                    className="flex-1 rounded bg-brand py-1 text-xs font-medium text-white hover:bg-brand-dark"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoId(null)}
                    className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                  <ConfirmDeleteButton
                    label={<Trash2 className="size-3.5" />}
                    ariaLabel={`Excluir categoria ${cat.nome}`}
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 text-neutral-400 hover:bg-red-500/20 hover:text-red-400"
                    title={`Excluir "${cat.nome}"?`}
                    description="Eventos que usam essa categoria não são apagados, só ficam sem categoria."
                    onConfirm={() => excluirCategoria(cat.id)}
                  />
                </div>
              </div>
            );
          }

          const visivel = !categoriasOcultas.has(cat.id);
          return (
            <div key={cat.id} className="flex items-center gap-1 rounded px-1 py-1 text-sm text-neutral-300 hover:bg-white/5">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={visivel}
                  onChange={() => alternarCategoriaOculta(cat.id)}
                  className="sr-only"
                />
                <span
                  className="size-3.5 shrink-0 rounded-sm border-2"
                  style={{ borderColor: cat.cor, backgroundColor: visivel ? cat.cor : "transparent" }}
                />
                <span className="truncate">{cat.nome}</span>
              </label>
              <button
                type="button"
                onClick={() => abrirEdicao(cat)}
                aria-label={`Editar ${cat.nome}`}
                className="shrink-0 rounded p-1 text-brand hover:bg-white/10"
              >
                <Pencil className="size-3" />
              </button>
            </div>
          );
        })}
        {categorias?.length === 0 && !criando && <p className="px-1 text-xs text-neutral-500">Nenhuma ainda.</p>}
      </div>

      {criando && (
        <div className="mt-2 space-y-2 rounded-md bg-white/5 p-2">
          <input
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            placeholder="Nome do assunto"
            className="w-full rounded border border-white/10 bg-transparent px-2 py-1 text-sm text-white placeholder:text-neutral-500 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-1">
            {CORES_AGENDA.map((cor) => (
              <button
                key={cor}
                type="button"
                onClick={() => setCorNova(cor)}
                className={cn(
                  "size-4 rounded-full",
                  corNova === cor && "ring-2 ring-white ring-offset-1 ring-offset-neutral-900",
                )}
                style={{ backgroundColor: cor }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={criarCategoria}
            className="w-full rounded bg-brand py-1 text-xs font-medium text-white hover:bg-brand-dark"
          >
            Criar
          </button>
        </div>
      )}
    </div>
  );
}
