"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { excluirSlide } from "./actions";

export function ExcluirSlideBotao({ id, servico }: { id: string; servico: string }) {
  return (
    <ConfirmDeleteButton
      label={<Trash2 className="size-4" />}
      ariaLabel="Excluir slide"
      variant="ghost"
      size="icon-sm"
      className="shrink-0 text-neutral-500 hover:bg-red-50 hover:text-red-600"
      title={`Excluir slide "${servico}"?`}
      description="Remove o slide do carrossel da home. Não pode ser desfeito. Precisa manter pelo menos 1 slide."
      onConfirm={() => excluirSlide(id)}
    />
  );
}
