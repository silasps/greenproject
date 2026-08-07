"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { aceitarPropostaComoStaff, type CanalAceiteProposta } from "./actions";

const CANAIS: { valor: CanalAceiteProposta; label: string }[] = [
  { valor: "whatsapp", label: "Pelo WhatsApp" },
  { valor: "email", label: "Por e-mail" },
  { valor: "presencial", label: "Cliente confirmou pessoalmente/por telefone" },
  { valor: "outro", label: "Outra forma" },
];

/** Botão "Marcar como aceita" do passo a passo — pede como o cliente confirmou antes de gravar o aceite (fica junto da proposta pra referência futura). */
export function AceitarPropostaButton({ agendamentoId, className }: { agendamentoId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [canal, setCanal] = useState<CanalAceiteProposta>("whatsapp");
  const [detalhe, setDetalhe] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Marcar como aceita
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como o cliente confirmou o aceite?</DialogTitle>
            <DialogDescription>Fica registrado junto com a proposta, pra referência futura.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {CANAIS.map((c) => (
              <label key={c.valor} className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="radio" name="canal" checked={canal === c.valor} onChange={() => setCanal(c.valor)} />
                {c.label}
              </label>
            ))}
            {canal === "outro" && (
              <Input
                placeholder="Descreva como foi"
                value={detalhe}
                onChange={(e) => setDetalhe(e.target.value)}
                className="mt-1"
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={pending || (canal === "outro" && !detalhe.trim())}
              className="bg-brand hover:bg-brand-dark"
              onClick={() =>
                startTransition(async () => {
                  await aceitarPropostaComoStaff(agendamentoId, canal, canal === "outro" ? detalhe.trim() : undefined);
                  setOpen(false);
                })
              }
            >
              {pending ? "Confirmando..." : "Confirmar aceite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
