"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CORES_AGENDA } from "./cores";

type Categoria = { id: string; nome: string; cor: string };

/** Assunto/categoria com cor — compartilhado entre usuários (qualquer um pode criar um novo). */
export function CategoriaPicker({
  categoriaId,
  onChange,
}: {
  categoriaId: string | null;
  onChange: (categoria: Categoria | null) => void;
}) {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [criando, setCriando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [corNova, setCorNova] = useState(CORES_AGENDA[0]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("categorias_agenda")
      .select("id, nome, cor")
      .order("nome")
      .then(({ data }) => setCategorias(data ?? []));
  }, []);

  async function criarCategoria() {
    const nome = nomeNovo.trim();
    if (!nome) return;
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categorias_agenda")
      .insert({ nome, cor: corNova })
      .select("id, nome, cor")
      .single();
    if (error || !data) {
      setErro("Já existe uma categoria com esse nome.");
      return;
    }
    setCategorias((prev) => [...(prev ?? []), data].sort((a, b) => a.nome.localeCompare(b.nome)));
    onChange(data);
    setCriando(false);
    setNomeNovo("");
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="categoria_id" value={categoriaId ?? ""} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          title="Sem categoria"
          className={cn(
            "flex size-6 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 text-[10px] text-neutral-400",
            categoriaId === null && "ring-2 ring-neutral-400 ring-offset-1",
          )}
        >
          ×
        </button>
        {(categorias ?? []).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat)}
            title={cat.nome}
            className={cn("size-6 rounded-full", categoriaId === cat.id && "ring-2 ring-neutral-500 ring-offset-1")}
            style={{ backgroundColor: cat.cor }}
          />
        ))}
        <button type="button" onClick={() => setCriando((v) => !v)} className="text-xs font-medium text-brand hover:underline">
          + Nova categoria
        </button>
      </div>

      {criando && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2">
          <Input
            placeholder="Nome do assunto"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            className="h-8 w-40"
          />
          <div className="flex items-center gap-1">
            {CORES_AGENDA.map((cor) => (
              <button
                key={cor}
                type="button"
                onClick={() => setCorNova(cor)}
                className={cn("size-5 rounded-full", corNova === cor && "ring-2 ring-neutral-500 ring-offset-1")}
                style={{ backgroundColor: cor }}
              />
            ))}
          </div>
          <Button type="button" size="sm" onClick={criarCategoria}>
            Criar
          </Button>
          {erro && <p className="w-full text-xs text-red-600">{erro}</p>}
        </div>
      )}
    </div>
  );
}
