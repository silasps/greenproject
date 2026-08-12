"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CircleCheck, Circle, ArrowUpRight, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { marcarSugestaoComoLida, excluirSugestao } from "./actions";

export function SugestaoLinha({
  id,
  usuarioNome,
  pagina,
  mensagem,
  userAgent,
  lida,
  criadoEm,
}: {
  id: string;
  usuarioNome: string;
  pagina: string;
  mensagem: string;
  userAgent: string | null;
  lida: boolean;
  criadoEm: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={`rounded-lg border p-4 ${lida ? "border-neutral-200 bg-white" : "border-brand/30 bg-brand/[0.03]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-medium text-neutral-900">{usuarioNome}</p>
          <Badge variant={lida ? "outline" : "default"} className={lida ? "" : "bg-brand text-white"}>
            {lida ? "Lida" : "Nova"}
          </Badge>
        </div>
        <p className="text-xs text-neutral-400">
          {new Date(criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      </div>

      <p className="mt-2 text-sm whitespace-pre-wrap text-neutral-700">{mensagem}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={pagina}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-brand"
          title={userAgent ?? undefined}
        >
          {pagina}
          <ArrowUpRight className="size-3" />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => marcarSugestaoComoLida(id, !lida))}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : lida ? (
              <Circle className="size-3.5" />
            ) : (
              <CircleCheck className="size-3.5" />
            )}
            {lida ? "Marcar como nova" : "Marcar como lida"}
          </Button>
          <ConfirmDeleteButton
            label={<Trash2 className="size-4" />}
            ariaLabel="Excluir sugestão"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-neutral-500 hover:bg-red-50 hover:text-red-600"
            title="Excluir sugestão?"
            description="Remove essa sugestão definitivamente. Não pode ser desfeito."
            onConfirm={() => excluirSugestao(id)}
          />
        </div>
      </div>
    </div>
  );
}
