"use client";

import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

/**
 * `children` é a `LaudoPreviewCard` já renderizada no servidor (Server
 * Component passado como children pra este Client Component) — só o
 * botão/diálogo em volta precisa rodar no client, sem precisar buscar os
 * dados de novo.
 */
export function VisualizarLaudoButton({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 rounded-full border-2 border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
      >
        <Eye className="size-4" />
        Visualizar laudo
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogTitle className="sr-only">Laudo</DialogTitle>
          {children}
        </DialogContent>
      </Dialog>
    </>
  );
}
