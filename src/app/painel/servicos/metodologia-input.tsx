"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileDropInput } from "@/components/file-drop-input";

export type MetodologiaSlot = {
  key: string;
  titulo: string;
  descricao: string;
  imagemUrl: string | null;
  imagemAlt: string;
  temNovoArquivo: boolean;
};

export function MetodologiaInput({
  itens,
  onChange,
  fieldPrefix,
}: {
  itens: MetodologiaSlot[];
  onChange: (itens: MetodologiaSlot[]) => void;
  fieldPrefix: string;
}) {
  function adicionar() {
    onChange([
      ...itens,
      {
        key: crypto.randomUUID(),
        titulo: "",
        descricao: "",
        imagemUrl: null,
        imagemAlt: "",
        temNovoArquivo: false,
      },
    ]);
  }
  function remover(key: string) {
    onChange(itens.filter((item) => item.key !== key));
  }
  function atualizar(key: string, patch: Partial<MetodologiaSlot>) {
    onChange(itens.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="metodologia"
        value={JSON.stringify(
          itens.map(({ key, titulo, descricao, imagemUrl, imagemAlt, temNovoArquivo }) => ({
            key,
            titulo,
            descricao,
            imagemUrl,
            imagemAlt,
            temNovoArquivo,
          }))
        )}
      />
      <div className="flex items-center justify-between">
        <Label>Metodologia (etapas)</Label>
        <button
          type="button"
          onClick={adicionar}
          className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Plus className="size-3.5" />
          Adicionar etapa
        </button>
      </div>
      {itens.length === 0 && <p className="text-xs text-neutral-400">Nenhuma etapa ainda.</p>}
      {itens.map((item, index) => (
        <div key={item.key} className="space-y-2 rounded-md border border-neutral-200 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-neutral-400">
              Etapa {String(index + 1).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => remover(item.key)}
              aria-label="Remover etapa"
              className="shrink-0 rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
            >
              <X className="size-4" />
            </button>
          </div>
          <Input
            value={item.titulo}
            placeholder="Título da etapa"
            onChange={(e) => atualizar(item.key, { titulo: e.target.value })}
          />
          <Textarea
            value={item.descricao}
            placeholder="Descrição da etapa"
            onChange={(e) => atualizar(item.key, { descricao: e.target.value })}
          />
          <div>
            <p className="mb-1.5 text-xs text-neutral-500">Foto da etapa (opcional)</p>
            <FileDropInput
              id={`metodologia-${item.key}`}
              name={`${fieldPrefix}_${item.key}`}
              accept="image/*"
              previaAtualUrl={item.imagemUrl}
              onArquivoChange={(arquivo) => atualizar(item.key, { temNovoArquivo: !!arquivo })}
            />
            {(item.imagemUrl || item.temNovoArquivo) && (
              <Input
                className="mt-2"
                value={item.imagemAlt}
                placeholder="Descrição da foto (texto alternativo)"
                onChange={(e) => atualizar(item.key, { imagemAlt: e.target.value })}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
