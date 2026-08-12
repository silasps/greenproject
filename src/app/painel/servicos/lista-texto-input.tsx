"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Lista livre de strings (normas, benefícios, entregáveis) — mesmo padrão
// de src/app/painel/agenda/custos-extras.tsx: estado local + hidden input
// com JSON, adicionar/remover linha.
export function ListaTextoInput({
  label,
  name,
  itens,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  itens: string[];
  onChange: (itens: string[]) => void;
  placeholder?: string;
}) {
  function adicionar() {
    onChange([...itens, ""]);
  }
  function remover(indice: number) {
    onChange(itens.filter((_, i) => i !== indice));
  }
  function atualizar(indice: number, valor: string) {
    onChange(itens.map((item, i) => (i === indice ? valor : item)));
  }

  return (
    <div className="space-y-2">
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(itens.map((item) => item.trim()).filter(Boolean))}
      />
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={adicionar}
          className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Plus className="size-3.5" />
          Adicionar
        </button>
      </div>
      {itens.length === 0 && <p className="text-xs text-neutral-400">Nenhum item ainda.</p>}
      {itens.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            placeholder={placeholder}
            onChange={(e) => atualizar(i, e.target.value)}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => remover(i)}
            aria-label="Remover item"
            className="shrink-0 rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
