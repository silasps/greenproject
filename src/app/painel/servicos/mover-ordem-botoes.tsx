"use client";

import { useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { moverOrdem } from "./actions";

export function MoverOrdemBotoes({
  id,
  podeSubir,
  podeDescer,
}: {
  id: string;
  podeSubir: boolean;
  podeDescer: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 flex-col gap-0.5">
      <button
        type="button"
        disabled={!podeSubir || pending}
        onClick={() => startTransition(() => moverOrdem(id, "cima"))}
        aria-label="Mover para cima"
        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30"
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        disabled={!podeDescer || pending}
        onClick={() => startTransition(() => moverOrdem(id, "baixo"))}
        aria-label="Mover para baixo"
        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30"
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}
