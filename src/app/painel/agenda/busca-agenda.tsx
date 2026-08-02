"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Resultado = {
  id: string;
  tipo: "evento" | "teste_opacidade";
  titulo: string | null;
  nome_contato: string | null;
  data_hora: string;
};

/** Busca eventos/testes direto no banco (não fica presa aos anos já carregados no client) — por título ou nome de contato. */
export function BuscaAgenda({ onIrParaData }: { onIrParaData: (data: Date) => void }) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultadosBrutos, setResultadosBrutos] = useState<Resultado[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const termoLimpo = termo.trim();
  // Deriva do termo atual em vez de "limpar" via setState no efeito — evita
  // um passo de render a mais só pra zerar o resultado quando apagar a busca.
  const resultados = termoLimpo.length < 2 ? null : resultadosBrutos;

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (termoLimpo.length < 2) return;
    const supabase = createClient();
    const id = setTimeout(() => {
      supabase
        .from("agendamentos")
        .select("id, tipo, titulo, nome_contato, data_hora")
        .or(`titulo.ilike.%${termoLimpo}%,nome_contato.ilike.%${termoLimpo}%`)
        .order("data_hora", { ascending: false })
        .limit(15)
        .then(({ data }) => setResultadosBrutos(data ?? []));
    }, 300);
    return () => clearTimeout(id);
  }, [termoLimpo]);

  function fechar() {
    setAberto(false);
    setTermo("");
    setResultadosBrutos(null);
  }

  if (!aberto) {
    return (
      <Button variant="outline" size="icon" className="text-brand" aria-label="Buscar na agenda" onClick={() => setAberto(true)}>
        <Search className="size-4" />
      </Button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white pr-1">
        <Search className="ml-2 size-4 shrink-0 text-neutral-400" />
        <input
          ref={inputRef}
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && fechar()}
          placeholder="Buscar na agenda..."
          className="w-40 py-1.5 text-sm outline-none sm:w-56"
        />
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar busca"
          className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {resultados && (
        <div className="absolute top-full right-0 z-30 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
          {resultados.length === 0 && <p className="p-3 text-sm text-neutral-500">Nada encontrado.</p>}
          {resultados.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onIrParaData(new Date(r.data_hora));
                fechar();
              }}
              className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
            >
              <span className="truncate font-medium text-neutral-900">{r.tipo === "evento" ? r.titulo : r.nome_contato}</span>
              <span className="text-xs text-neutral-500">
                {format(new Date(r.data_hora), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
