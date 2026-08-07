"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, Check } from "lucide-react";
import { enviarLaudoEmail } from "../actions";

export function EnviarLaudoEmailButton({ testeId }: { testeId: string }) {
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function handleClick() {
    setErro(null);
    startTransition(async () => {
      try {
        await enviarLaudoEmail(testeId);
        setEnviado(true);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
      }
    });
  }

  return (
    <div className="flex w-20 flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex w-20 flex-col items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-2 text-center text-xs text-brand hover:border-brand/40 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : enviado ? (
          <Check className="size-4" />
        ) : (
          <Mail className="size-4" />
        )}
        {pending ? "Enviando..." : enviado ? "E-mail enviado" : "Enviar por e-mail"}
      </button>
      {erro && <p className="mt-1 text-center text-[10px] text-red-600">{erro}</p>}
    </div>
  );
}
