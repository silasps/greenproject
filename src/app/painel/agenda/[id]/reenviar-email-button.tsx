"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, Check } from "lucide-react";
import { reenviarPropostaEmail } from "../actions";

export function ReenviarEmailButton({ agendamentoId }: { agendamentoId: string }) {
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function handleClick() {
    setErro(null);
    startTransition(async () => {
      try {
        await reenviarPropostaEmail(agendamentoId);
        setEnviado(true);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : enviado ? (
          <Check className="size-4 text-brand" />
        ) : (
          <Mail className="size-4" />
        )}
        {pending ? "Enviando..." : enviado ? "E-mail enviado" : "Reenviar por e-mail"}
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
