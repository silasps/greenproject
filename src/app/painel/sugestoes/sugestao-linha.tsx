"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Trash2, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { atualizarStatusSugestao, salvarObservacaoSugestao, excluirSugestao, type StatusSugestao } from "./actions";
import { STATUS_INFO } from "./status-info";

export function SugestaoLinha({
  id,
  usuarioNome,
  pagina,
  mensagem,
  userAgent,
  status,
  observacao,
  criadoEm,
}: {
  id: string;
  usuarioNome: string;
  pagina: string;
  mensagem: string;
  userAgent: string | null;
  status: StatusSugestao;
  observacao: string | null;
  criadoEm: string;
}) {
  const [pendingStatus, startStatusTransition] = useTransition();
  const [pendingObs, startObsTransition] = useTransition();
  const [observacaoValue, setObservacaoValue] = useState(observacao ?? "");
  const info = STATUS_INFO[status];
  const obsAlterada = observacaoValue.trim() !== (observacao ?? "").trim();

  return (
    <div className={`rounded-lg border p-4 ${info.cardClassName}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-medium text-neutral-900">{usuarioNome}</p>
          <Badge className={info.badgeClassName}>{info.label}</Badge>
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
          <Select
            value={status}
            disabled={pendingStatus}
            onValueChange={(value) =>
              startStatusTransition(() => atualizarStatusSugestao(id, value as StatusSugestao))
            }
          >
            <SelectTrigger size="sm">
              {pendingStatus ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nova">Nova</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="feita">Feita</SelectItem>
              <SelectItem value="ignorada">Ignorada</SelectItem>
            </SelectContent>
          </Select>
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

      <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3">
        <Textarea
          rows={2}
          placeholder="Observação (só você vê — por que foi ignorada, o que foi feito, etc.)"
          value={observacaoValue}
          onChange={(e) => setObservacaoValue(e.target.value)}
          className="text-sm"
        />
        {obsAlterada && (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pendingObs}
              onClick={() => setObservacaoValue(observacao ?? "")}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingObs}
              onClick={() => startObsTransition(() => salvarObservacaoSugestao(id, observacaoValue))}
            >
              {pendingObs ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Salvar observação
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
