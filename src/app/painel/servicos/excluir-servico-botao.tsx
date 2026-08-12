"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { excluirServico } from "./actions";

export function ExcluirServicoBotao({ id, titulo }: { id: string; titulo: string }) {
  return (
    <ConfirmDeleteButton
      label={<Trash2 className="size-4" />}
      ariaLabel="Excluir serviço"
      variant="ghost"
      size="icon-sm"
      className="shrink-0 text-neutral-500 hover:bg-red-50 hover:text-red-600"
      title={`Excluir "${titulo}"?`}
      description="Remove o serviço e todas as fotos dele do site público. Não pode ser desfeito — se for só uma pausa, use Despublicar em vez de excluir."
      onConfirm={() => excluirServico(id)}
    />
  );
}
