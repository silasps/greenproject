"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";
import { alternarExibirNaHome } from "./actions";

export function ExibirNaHomeToggle({ id, exibirNaHome }: { id: string; exibirNaHome: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => alternarExibirNaHome(id, !exibirNaHome))}
      aria-pressed={exibirNaHome}
      title={exibirNaHome ? "Remover da home" : "Exibir na home"}
      className={`shrink-0 rounded-md border p-2 transition-colors disabled:opacity-50 ${
        exibirNaHome
          ? "border-brand/40 bg-brand/10 text-brand hover:bg-brand/20"
          : "border-neutral-300 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
      }`}
    >
      <Star className="size-4" fill={exibirNaHome ? "currentColor" : "none"} />
    </button>
  );
}
