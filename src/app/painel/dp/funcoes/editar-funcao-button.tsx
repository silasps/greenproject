"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FuncaoForm } from "./funcao-form";
import type { Role } from "@/lib/auth/permissions";

type Funcao = { id: string; nome: string; descricao: string | null; nivel_acesso: Role };

export function EditarFuncaoButton({ funcao, iconOnly = false }: { funcao: Funcao; iconOnly?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Editar ${funcao.nome}`}
          title="Editar"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
        >
          <Pencil className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Editar função
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar função</DialogTitle>
          </DialogHeader>
          {open && (
            <FuncaoForm
              funcao={funcao}
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
