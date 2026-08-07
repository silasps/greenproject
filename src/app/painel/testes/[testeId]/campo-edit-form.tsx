"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDropInput } from "@/components/file-drop-input";
import { FotosPreviewGrid } from "@/components/foto-preview";
import { editarCampo } from "../actions";

type Equipamento = { id: string; label: string };

const FOTOS = [
  { name: "foto_frente", label: "Frente do veículo" },
  { name: "foto_traseira", label: "Teste sendo realizado" },
  { name: "foto_painel", label: "Painel / odômetro" },
  { name: "foto_etiqueta", label: "Etiqueta do resultado (completa)" },
  { name: "foto_etiqueta_numero", label: "Etiqueta — número em destaque" },
];

/**
 * "Dados de campo" já concluídos (número do teste, equipamento, fotos) —
 * mostra o resumo com um "Editar" pra corrigir depois (ex.: número digitado
 * errado). Cada foto é opcional na edição: só troca a que vier preenchida,
 * o upload sobrescreve o mesmo arquivo de sempre.
 */
export function CampoEditForm({
  testeId,
  numeroTeste,
  equipamentoId,
  equipamentos,
  fotosAtuais,
  bloqueado,
}: {
  testeId: string;
  numeroTeste: string | null;
  equipamentoId: string | null;
  equipamentos: Equipamento[];
  fotosAtuais: [string, string | null, string | null][];
  bloqueado: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await editarCampo(testeId, formData);
        setEditando(false);
        // Server Component (numero_teste, fotos, e o resumo em
        // testes/[testeId]/page.tsx) só reflete o que mudou depois de um
        // refresh — sem isso ficava mostrando os dados antigos.
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  if (!editando) {
    return (
      <div id="dados-campo" className="mt-6 scroll-mt-4 rounded-md border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-700">Dados de campo</p>
          {!bloqueado && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              <Pencil className="size-3.5" />
              Editar
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          Número do teste: <strong>{numeroTeste ?? "—"}</strong>
        </p>
        <FotosPreviewGrid fotos={fotosAtuais} />
        {bloqueado && (
          <p className="mt-2 text-xs text-neutral-400">Laudo já liberado — dados de campo não podem mais ser editados.</p>
        )}
      </div>
    );
  }

  return (
    <form id="dados-campo" action={handleSubmit} className="mt-6 scroll-mt-4 space-y-4 rounded-md border border-neutral-200 p-4">
      <p className="text-sm font-medium text-neutral-700">Editar dados de campo</p>

      <div className="space-y-2">
        <Label htmlFor="numero_teste_edicao">Número do teste (impresso na etiqueta)</Label>
        <Input id="numero_teste_edicao" name="numero_teste" required defaultValue={numeroTeste ?? ""} />
      </div>

      <div className="space-y-2">
        <Label>Equipamento usado neste teste</Label>
        <Select name="equipamento_id" items={Object.fromEntries(equipamentos.map((eq) => [eq.id, eq.label]))} defaultValue={equipamentoId ?? undefined}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o opacímetro" />
          </SelectTrigger>
          <SelectContent>
            {equipamentos.map((eq) => (
              <SelectItem key={eq.id} value={eq.id}>
                {eq.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-neutral-700">Fotos</p>
        {FOTOS.map((foto, i) => (
          <div key={foto.name} className="space-y-1">
            <Label htmlFor={foto.name} className="text-sm font-normal">
              {foto.label}
            </Label>
            <FileDropInput
              id={foto.name}
              name={foto.name}
              accept="image/*"
              capture="environment"
              required
              previaAtualUrl={fotosAtuais[i]?.[1]}
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setEditando(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
