"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VeiculoForm } from "./veiculo-form";

export function NovoVeiculoButton({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Novo veículo/equipamento
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo veículo/equipamento</DialogTitle>
          </DialogHeader>
          {open && (
            <VeiculoForm
              clienteId={clienteId}
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
