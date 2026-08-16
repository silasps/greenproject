"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verificarAtualizacaoAnfavea } from "./actions";

type Fonte = { marca: string; url_tabela_pdf: string; verificado_em: string | null };

function formatarData(iso: string | null) {
  if (!iso) return "nunca verificado";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function FontesLista({ fontes }: { fontes: Fonte[] }) {
  if (fontes.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-neutral-900">Marcas monitoradas</h2>
      <p className="text-sm text-neutral-500">
        Verificação automática a cada 3 meses — se a tabela oficial mudar, as linhas alteradas voltam a ficar
        pendentes de revisão.
      </p>
      <div className="mt-3 space-y-2">
        {fontes.map((fonte) => (
          <LinhaFonte key={fonte.marca} fonte={fonte} />
        ))}
      </div>
    </div>
  );
}

function LinhaFonte({ fonte }: { fonte: Fonte }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function verificar() {
    setErro(null);
    startTransition(async () => {
      try {
        await verificarAtualizacaoAnfavea(fonte.marca);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao verificar.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="font-medium text-neutral-900">{fonte.marca}</p>
        <p className="truncate text-xs text-neutral-500">Última verificação: {formatarData(fonte.verificado_em)}</p>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={verificar} className="shrink-0">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-3.5" />}
        Verificar agora
      </Button>
    </div>
  );
}
