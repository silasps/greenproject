"use client";

import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

/** Botão "i": passar o mouse mostra a explicação (some ao tirar); clicar fixa aberto até clicar fora. */
export function InfoTooltip({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [fixado, setFixado] = useState(false);

  return (
    <Popover
      open={aberto}
      onOpenChange={(novoAberto) => {
        setAberto(novoAberto);
        if (!novoAberto) setFixado(false);
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Como funciona esse cálculo"
            onMouseEnter={() => setAberto(true)}
            onMouseLeave={() => !fixado && setAberto(false)}
            onClick={() => setFixado((f) => !f)}
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-brand"
          >
            <Info className="size-3.5" />
          </button>
        }
      />
      <PopoverContent align="start" className="text-xs text-neutral-600">
        {children}
      </PopoverContent>
    </Popover>
  );
}
