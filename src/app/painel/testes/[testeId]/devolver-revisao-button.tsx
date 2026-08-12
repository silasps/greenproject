"use client";

import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { devolverRevisao } from "../actions";

/** "Algo errado?" da tela de revisão — devolve o teste pro escritório (reimportar PDF) ou pro técnico (refazer campo), com motivo opcional. */
export function DevolverRevisaoButton({ testeId }: { testeId: string }) {
  const [open, setOpen] = useState(false);
  const [destino, setDestino] = useState<"escritorio" | "campo">("escritorio");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        <Undo2 className="size-4" />
        Algo errado? Devolver pra correção
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver este teste</DialogTitle>
            <DialogDescription>
              Volta o status pra corrigir. O resultado do PDF importado é descartado — vai precisar reimportar depois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                className="mt-1"
                checked={destino === "escritorio"}
                onChange={() => setDestino("escritorio")}
              />
              <span>
                <strong>Escritório</strong> — reimportar o PDF do opacímetro (ex.: PDF errado, número não bateu)
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" className="mt-1" checked={destino === "campo"} onChange={() => setDestino("campo")} />
              <span>
                <strong>Técnico de campo</strong> — refazer fotos/número (ex.: foto ruim, dado errado)
              </span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (opcional)"
              rows={2}
              className="mt-2 w-full rounded-md border border-neutral-300 p-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await devolverRevisao(testeId, destino, motivo.trim() || undefined);
                    setOpen(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Erro ao devolver.");
                  }
                })
              }
            >
              {pending ? "Devolvendo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
