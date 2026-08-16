"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmarEspecificacaoMotor, descartarEspecificacaoMotor } from "./actions";

type Pendente = {
  id: string;
  marca: string;
  identificacao_motor: string;
  marcha_lenta_min: number | null;
  marcha_lenta_max: number | null;
  rotacao_corte_min: number | null;
  rotacao_corte_max: number | null;
  limite_opacidade: number | null;
};

export function PendentesLista({ pendentes }: { pendentes: Pendente[] }) {
  if (pendentes.length === 0) return null;

  const porMarca = new Map<string, Pendente[]>();
  for (const p of pendentes) {
    if (!porMarca.has(p.marca)) porMarca.set(p.marca, []);
    porMarca.get(p.marca)!.push(p);
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-neutral-900">Pendentes de revisão ({pendentes.length})</h2>
      <p className="text-sm text-neutral-500">
        Importadas automaticamente — confira contra o PDF oficial antes de confirmar. Só depois de confirmada a
        linha passa a valer como referência pros laudos.
      </p>
      <div className="mt-3 space-y-6">
        {[...porMarca.entries()].map(([marca, linhas]) => (
          <div key={marca}>
            <p className="mb-2 text-sm font-semibold text-neutral-700">{marca}</p>
            <div className="space-y-2">
              {linhas.map((linha) => (
                <LinhaPendente key={linha.id} linha={linha} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinhaPendente({ linha }: { linha: Pendente }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirmar() {
    startTransition(async () => {
      await confirmarEspecificacaoMotor(linha.id);
      router.refresh();
    });
  }

  function descartar() {
    startTransition(async () => {
      await descartarEspecificacaoMotor(linha.id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="min-w-0 text-sm">
        <p className="font-medium text-neutral-900">{linha.identificacao_motor}</p>
        <p className="text-neutral-600">
          Marcha lenta {linha.marcha_lenta_min ?? "?"}-{linha.marcha_lenta_max ?? "?"} · Rotação de corte{" "}
          {linha.rotacao_corte_min ?? "?"}-{linha.rotacao_corte_max ?? "?"} · Opacidade{" "}
          {linha.limite_opacidade ?? "?"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Confirmar"
          disabled={pending}
          className="text-brand hover:bg-brand/10"
          onClick={confirmar}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Descartar"
          disabled={pending}
          className="text-neutral-500 hover:bg-red-50 hover:text-red-600"
          onClick={descartar}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
