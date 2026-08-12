"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDropInput } from "@/components/file-drop-input";

export type GaleriaSlot = {
  key: string;
  url: string | null;
  alt: string;
  destaqueMosaico: boolean;
  temNovoArquivo: boolean;
};

// Cada slot manda o arquivo novo (se houver) num campo próprio, nomeado
// `${fieldPrefix}_${key}` — a action lê esse nome pra cada item do JSON do
// campo hidden e sabe se sobe um arquivo novo ou reaproveita a URL salva.
export function GaleriaInput({
  itens,
  onChange,
  fieldPrefix,
}: {
  itens: GaleriaSlot[];
  onChange: (itens: GaleriaSlot[]) => void;
  fieldPrefix: string;
}) {
  function adicionar() {
    onChange([
      ...itens,
      { key: crypto.randomUUID(), url: null, alt: "", destaqueMosaico: false, temNovoArquivo: false },
    ]);
  }
  function remover(key: string) {
    onChange(itens.filter((item) => item.key !== key));
  }
  function atualizar(key: string, patch: Partial<GaleriaSlot>) {
    onChange(itens.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="galeria"
        value={JSON.stringify(
          itens.map(({ key, url, alt, destaqueMosaico, temNovoArquivo }) => ({
            key,
            url,
            alt,
            destaqueMosaico,
            temNovoArquivo,
          }))
        )}
      />
      <div className="flex items-center justify-between">
        <Label>Galeria de fotos</Label>
        <button
          type="button"
          onClick={adicionar}
          className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Plus className="size-3.5" />
          Adicionar foto
        </button>
      </div>
      {itens.length === 0 && <p className="text-xs text-neutral-400">Nenhuma foto na galeria ainda.</p>}
      {itens.map((item) => (
        <div key={item.key} className="space-y-2 rounded-md border border-neutral-200 p-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <FileDropInput
                id={`galeria-${item.key}`}
                name={`${fieldPrefix}_${item.key}`}
                accept="image/*"
                required={!item.url}
                previaAtualUrl={item.url}
                onArquivoChange={(arquivo) => atualizar(item.key, { temNovoArquivo: !!arquivo })}
              />
            </div>
            <button
              type="button"
              onClick={() => remover(item.key)}
              aria-label="Remover foto"
              className="mt-2 shrink-0 rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
            >
              <X className="size-4" />
            </button>
          </div>
          <Input
            value={item.alt}
            placeholder="Descrição da foto (texto alternativo)"
            onChange={(e) => atualizar(item.key, { alt: e.target.value })}
          />
          <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-neutral-600">
            <Checkbox
              checked={item.destaqueMosaico}
              onCheckedChange={(checked) => atualizar(item.key, { destaqueMosaico: checked === true })}
            />
            Destacar no mosaico da home
          </label>
        </div>
      ))}
    </div>
  );
}
