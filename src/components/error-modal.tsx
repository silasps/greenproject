"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { focarPrimeiroCampoInvalido } from "@/lib/utils/focar-campo-invalido";

export function ErrorModal({
  erro,
  onClose,
  title = "Não foi possível salvar",
  formRef,
}: {
  erro: string | null;
  onClose: () => void;
  title?: string;
  /** Quando informado, ao fechar o modal o cursor vai direto pro primeiro campo pendente. */
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  function fechar() {
    onClose();
    // Espera o modal desmontar antes de focar, senão a animação de saída rouba o foco.
    requestAnimationFrame(() => focarPrimeiroCampoInvalido(formRef?.current ?? null));
  }

  return (
    <Dialog open={!!erro} onOpenChange={(open) => !open && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{erro}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="bg-brand hover:bg-brand-dark" onClick={fechar}>
            Ok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
