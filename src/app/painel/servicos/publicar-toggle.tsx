"use client";

import { useTransition } from "react";
import { alternarPublicado } from "./actions";

export function PublicarToggle({ id, publicado }: { id: string; publicado: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => alternarPublicado(id, !publicado))}
      className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
    >
      {publicado ? "Despublicar" : "Publicar"}
    </button>
  );
}
