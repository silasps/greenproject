"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { liberarLaudo } from "../actions";

type Responsavel = { id: string; label: string };

export function LiberarForm({
  testeId,
  responsaveis,
  defaultResponsavelId,
  resultado,
  clienteEmail,
}: {
  testeId: string;
  responsaveis: Responsavel[];
  /** Pré-seleciona quem está logado — a lista continua editável pra declarar outro engenheiro como responsável. */
  defaultResponsavelId?: string | null;
  resultado: "aprovado" | "reprovado" | null;
  clienteEmail: string | null;
}) {
  const router = useRouter();
  const [responsavelId, setResponsavelId] = useState(defaultResponsavelId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<{ emailEnviado: boolean; emailErro: string | null } | null>(null);
  const [pending, startTransition] = useTransition();

  function abrirConfirmacao() {
    setError(null);
    if (!responsavelId) {
      setError("Selecione o responsável técnico.");
      return;
    }
    setConfirmando(true);
  }

  function validar(enviarEmail: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("responsavel_tecnico_id", responsavelId);
        fd.set("enviar_email", enviarEmail ? "true" : "false");
        const res = await liberarLaudo(testeId, fd);
        if (enviarEmail) {
          setResultadoEnvio(res ?? { emailEnviado: false, emailErro: "Erro inesperado." });
        } else {
          setConfirmando(false);
          router.refresh();
        }
      } catch (e) {
        setConfirmando(false);
        setError(e instanceof Error ? e.message : "Erro ao liberar.");
      }
    });
  }

  const resultadoLabel = resultado === "aprovado" ? "APROVADO" : "REPROVADO";

  return (
    <div className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label>Responsável técnico</Label>
        <Select
          name="responsavel_tecnico_id"
          items={Object.fromEntries(responsaveis.map((r) => [r.id, r.label]))}
          value={responsavelId}
          onValueChange={(v) => v && setResponsavelId(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione quem está liberando" />
          </SelectTrigger>
          <SelectContent>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-neutral-500">Já vem com o seu nome selecionado — troque se outro engenheiro estiver liberando.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" onClick={abrirConfirmacao} className="bg-brand hover:bg-brand-dark">
        Validar teste
      </Button>

      <Dialog
        open={confirmando}
        onOpenChange={(open) => {
          if (!pending) {
            setConfirmando(open);
            if (!open) setResultadoEnvio(null);
          }
        }}
      >
        <DialogContent>
          {resultadoEnvio ? (
            <>
              <DialogHeader>
                <DialogTitle>Laudo liberado</DialogTitle>
              </DialogHeader>
              {resultadoEnvio.emailEnviado ? (
                <p className="text-sm text-neutral-600">
                  Laudo liberado e cópia enviada por e-mail para <strong>{clienteEmail}</strong>.
                </p>
              ) : (
                <p className="text-sm text-neutral-600">
                  Laudo liberado, mas o e-mail não pôde ser enviado
                  {resultadoEnvio.emailErro ? `: ${resultadoEnvio.emailErro}` : "."} Você pode tentar de novo (ou mandar por
                  WhatsApp) na tela do laudo emitido.
                </p>
              )}
              <DialogFooter>
                <Button
                  onClick={() => {
                    setConfirmando(false);
                    setResultadoEnvio(null);
                    router.refresh();
                  }}
                  className="bg-brand hover:bg-brand-dark"
                >
                  Continuar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Validar teste</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-neutral-600">
                O laudo será liberado com resultado <strong>{resultadoLabel}</strong>. Deseja enviar uma cópia por e-mail para
                o cliente agora{clienteEmail ? ` (${clienteEmail})` : ""}?
              </p>
              {!clienteEmail && (
                <p className="text-xs text-amber-700">Cliente sem e-mail cadastrado — só dá pra liberar sem enviar agora.</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={pending} onClick={() => validar(false)}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : "Não, só validar"}
                </Button>
                <Button
                  type="button"
                  disabled={pending || !clienteEmail}
                  onClick={() => validar(true)}
                  className="bg-brand hover:bg-brand-dark"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  Sim, validar e enviar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
