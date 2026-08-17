"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CORES_AGENDA } from "./cores";

type Categoria = { id: string; nome: string; cor: string };

/** Assunto/categoria com cor — compartilhado entre usuários (qualquer um pode criar um novo). Mostra só a seleção
 * atual (um pill), e abre um popover pra trocar ou criar uma nova — evita a fileira de pills competindo por espaço. */
export function CategoriaPicker({
  categoriaId,
  onChange,
}: {
  categoriaId: string | null;
  onChange: (categoria: Categoria | null) => void;
}) {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [aberto, setAberto] = useState(false);
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
    setAberto(false);
  }

  function selecionar(cat: Categoria | null) {
    onChange(cat);
    setAberto(false);
  }

  const selecionada = (categorias ?? []).find((c) => c.id === categoriaId) ?? null;

  return (
    <div>
      <input type="hidden" name="categoria_id" value={categoriaId ?? ""} />
      <Popover
        open={aberto}
        onOpenChange={(v) => {
          setAberto(v);
          if (!v) setCriando(false);
        }}
      >
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                selecionada
                  ? "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  : "border-dashed border-neutral-300 text-neutral-500 hover:bg-neutral-50",
              )}
            />
          }
        >
          {selecionada && (
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: selecionada.cor }} aria-hidden />
          )}
          <span className="truncate">{selecionada ? selecionada.nome : "Sem categoria"}</span>
          <ChevronDown className="size-3.5 shrink-0 text-neutral-400" />
        </PopoverTrigger>

        <PopoverContent align="start" className="w-64">
          {!criando ? (
            <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              <button
                type="button"
                onClick={() => selecionar(null)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
              >
                <span className="size-2.5 shrink-0 rounded-full border border-dashed border-neutral-300" aria-hidden />
                Sem categoria
                {categoriaId === null && <Check className="ml-auto size-3.5 shrink-0 text-brand" />}
              </button>
              {(categorias ?? []).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selecionar(cat)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.cor }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{cat.nome}</span>
                  {categoriaId === cat.id && <Check className="ml-auto size-3.5 shrink-0 text-brand" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCriando(true)}
                className="mt-1 border-t border-neutral-100 px-2 pt-2 text-left text-xs font-medium text-brand hover:underline"
              >
                + Nova categoria
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Nome do assunto"
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                autoFocus
              />
              <div className="flex items-center gap-1">
                {CORES_AGENDA.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setCorNova(cor)}
                    className={cn("size-5 shrink-0 rounded-full", corNova === cor && "ring-2 ring-neutral-500 ring-offset-1")}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
              {erro && <p className="text-xs text-red-600">{erro}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={criarCategoria} className="flex-1">
                  Criar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setCriando(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
