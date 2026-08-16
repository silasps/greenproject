"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { verificarAtualizacaoAnfavea, verificarTodasAsFontes } from "./actions";

type Fonte = { marca: string; url_tabela_pdf: string; verificado_em: string | null };

function formatarData(iso: string | null) {
  if (!iso) return "nunca verificado";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function FontesLista({ fontes, totalFontes }: { fontes: Fonte[]; totalFontes: number }) {
  if (fontes.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Marcas monitoradas</h2>
          <p className="text-sm text-neutral-500">
            Verificação automática a cada 3 meses — se a tabela oficial mudar, as linhas alteradas voltam a ficar
            pendentes de revisão.
          </p>
        </div>
        <VerificarTodosButton totalFontes={totalFontes} />
      </div>
      <div className="mt-3 space-y-2">
        {fontes.map((fonte) => (
          <LinhaFonte key={fonte.marca} fonte={fonte} />
        ))}
      </div>
    </div>
  );
}

/**
 * Confirma antes (pode demorar minutos na primeira vez — cada marca é uma
 * chamada de rede + parser). Depois de confirmar, dispara e libera a tela —
 * a pessoa continua navegando normalmente enquanto roda; um aviso fixo no
 * topo avisa quando terminar (ver `resultado`/`rodando` abaixo).
 */
function VerificarTodosButton({ totalFontes }: { totalFontes: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<{ verificadas: number; comErro: number; total: number } | null>(null);
  const [, startTransition] = useTransition();

  const estimativaMin = Math.max(1, Math.ceil((totalFontes * 12) / 60));

  function confirmar() {
    setConfirmando(false);
    setRodando(true);
    setResultado(null);
    startTransition(async () => {
      try {
        const r = await verificarTodasAsFontes();
        setResultado(r);
      } finally {
        setRodando(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={rodando} onClick={() => setConfirmando(true)} className="shrink-0">
        {rodando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-3.5" />}
        {rodando ? "Verificando todas..." : "Verificar todos"}
      </Button>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar todas as {totalFontes} marcas?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Pode levar até ~{estimativaMin} min na primeira vez (cada marca baixa e lê o PDF de novo). Reverificações
            seguintes são bem mais rápidas — só reprocessa a marca cujo PDF realmente mudou. Dá pra continuar usando
            o sistema normalmente enquanto isso roda.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={confirmar} className="bg-brand hover:bg-brand-dark">
              Verificar agora
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {(rodando || resultado) && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-sm text-white shadow-lg">
          {rodando ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Verificando tabelas ANFAVEA em segundo plano...
            </>
          ) : (
            resultado && (
              <>
                Verificação concluída: {resultado.verificadas} de {resultado.total} marcas
                {resultado.comErro > 0 ? ` (${resultado.comErro} com erro)` : ""}.
                <button type="button" onClick={() => setResultado(null)} className="ml-1 underline">
                  Fechar
                </button>
              </>
            )
          )}
        </div>
      )}
    </>
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
        <a
          href={fonte.url_tabela_pdf}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-xs text-brand hover:underline"
        >
          Ver PDF oficial →
        </a>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={verificar} className="shrink-0">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-3.5" />}
        Verificar agora
      </Button>
    </div>
  );
}
