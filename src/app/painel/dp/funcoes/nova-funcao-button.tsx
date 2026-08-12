"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FuncaoForm } from "./funcao-form";

export function NovaFuncaoButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-brand-dark"
      >
        Nova função
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova função</DialogTitle>
          </DialogHeader>
          {open && (
            <FuncaoForm
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
