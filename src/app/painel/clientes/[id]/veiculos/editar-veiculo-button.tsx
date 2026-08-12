"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VeiculoForm, type VeiculoEdicao } from "./veiculo-form";

export function EditarVeiculoButton({ clienteId, veiculo }: { clienteId: string; veiculo: VeiculoEdicao }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Editar ${veiculo.identificador}`}
        title="Editar"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
      >
        <Pencil className="size-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar veículo/equipamento</DialogTitle>
          </DialogHeader>
          {open && (
            <VeiculoForm
              clienteId={clienteId}
              veiculo={veiculo}
              onCancelar={() => setOpen(false)}
              onSucesso={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
