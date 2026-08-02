"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDropInput } from "@/components/file-drop-input";
import { salvarCampo } from "../actions";

type Equipamento = { id: string; label: string };

const FOTOS = [
  { name: "foto_frente", label: "1. Frente do veículo, com a placa visível" },
  { name: "foto_traseira", label: "2. Teste sendo realizado (opacímetro no escapamento)" },
  { name: "foto_painel", label: "3. Painel / odômetro" },
];

/** Fotos extras opcionais — caso as 3 fixas não sejam suficientes pra documentar o ensaio. */
function FotosExtras() {
  const [slots, setSlots] = useState<number[]>([]);
  const [proximoId, setProximoId] = useState(0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">Fotos extras (opcional)</p>
        <button
          type="button"
          onClick={() => {
            setSlots((s) => [...s, proximoId]);
            setProximoId((n) => n + 1);
          }}
          className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Plus className="size-3.5" />
          Adicionar foto
        </button>
      </div>
      {slots.map((id) => (
        <div key={id} className="flex items-start gap-2">
          <div className="flex-1">
            <FileDropInput id={`foto_extra_${id}`} name={`foto_extra_${id}`} accept="image/*" capture="environment" />
          </div>
          <button
            type="button"
            onClick={() => setSlots((s) => s.filter((x) => x !== id))}
            aria-label="Remover"
            className="mt-1 shrink-0 rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function CampoForm({ testeId, equipamentos }: { testeId: string; equipamentos: Equipamento[] }) {
  const router = useRouter();
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await salvarCampo(testeId, formData);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-6 mx-auto max-w-lg space-y-6">
      <div className="space-y-2">
        <Label>Equipamento usado neste teste</Label>
        <Select
          name="equipamento_id"
          items={Object.fromEntries(equipamentos.map((eq) => [eq.id, eq.label]))}
        >
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

      <div className="space-y-4 rounded-md border border-neutral-200 p-4">
        <p className="text-sm font-medium text-neutral-700">Fotos do veículo</p>
        {FOTOS.map((foto) => (
          <div key={foto.name} className="space-y-1">
            <Label htmlFor={foto.name} className="text-sm font-normal">
              {foto.label}
            </Label>
            <FileDropInput id={foto.name} name={foto.name} accept="image/*" capture="environment" required />
          </div>
        ))}
        <FotosExtras />
      </div>

      {!confirmado ? (
        <div className="rounded-md border border-brand/30 bg-brand/5 p-4 text-center">
          <p className="text-sm text-neutral-700">Agora faça o teste com o opacímetro.</p>
          <Button type="button" className="mt-3 bg-brand hover:bg-brand-dark" onClick={() => setConfirmado(true)}>
            Teste executado com sucesso
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-md border border-neutral-200 p-4">
          <div className="space-y-2">
            <Label htmlFor="numero_teste">Número do teste (impresso na etiqueta)</Label>
            <Input id="numero_teste" name="numero_teste" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="foto_etiqueta" className="text-sm font-normal">
              4. Foto da etiqueta do resultado
            </Label>
            <FileDropInput id="foto_etiqueta" name="foto_etiqueta" accept="image/*" capture="environment" required />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {confirmado && (
        <Button type="submit" disabled={pending} className="w-full bg-brand hover:bg-brand-dark">
          {pending ? "Enviando..." : "Concluir campo"}
        </Button>
      )}
    </form>
  );
}
