"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MoedaInput } from "@/components/moeda-input";

export type CustoExtra = { descricao: string; valor: string };

/** Lista livre de custos avulsos do orçamento (ex.: pernoite em hotel) — soma no total, cada item com nome+valor. */
export function CustosExtras({ itens, onChange }: { itens: CustoExtra[]; onChange: (itens: CustoExtra[]) => void }) {
  function adicionar() {
    onChange([...itens, { descricao: "", valor: "0" }]);
  }
  function remover(indice: number) {
    onChange(itens.filter((_, i) => i !== indice));
  }
  function atualizar(indice: number, campo: keyof CustoExtra, valor: string) {
    onChange(itens.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)));
  }

  return (
    <div className="space-y-2">
      <input
        type="hidden"
        name="custos_extras"
        value={JSON.stringify(itens.filter((item) => item.descricao.trim()))}
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-600">Outros custos (opcional)</span>
        <button
          type="button"
          onClick={adicionar}
          className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Plus className="size-3.5" />
          Adicionar custo
        </button>
      </div>
      {itens.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Ex.: Pernoite em hotel"
            value={item.descricao}
            onChange={(e) => atualizar(i, "descricao", e.target.value)}
            className="flex-1"
          />
          <MoedaInput value={item.valor} onChange={(v) => atualizar(i, "valor", v)} className="w-32" />
          <button
            type="button"
            onClick={() => remover(i)}
            aria-label="Remover custo"
            className="shrink-0 rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
