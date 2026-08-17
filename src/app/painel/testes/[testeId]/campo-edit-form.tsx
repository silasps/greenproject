"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileDropInput } from "@/components/file-drop-input";
import { FotosPreviewGrid } from "@/components/foto-preview";
import { editarCampo } from "../actions";

type Equipamento = { id: string; label: string };

const FOTOS = [
  { name: "foto_frente", label: "Frente do veículo" },
  { name: "foto_traseira", label: "Teste sendo realizado" },
  { name: "foto_painel", label: "Painel / odômetro" },
  { name: "foto_etiqueta", label: "Etiqueta do resultado (completa)" },
  { name: "foto_etiqueta_numero", label: "Etiqueta — número em destaque" },
];

/**
 * "Dados de campo" já concluídos (número do teste, equipamento, fotos) —
 * mostra o resumo com um "Editar" pra corrigir depois (ex.: número digitado
 * errado). Cada foto é opcional na edição: só troca a que vier preenchida,
 * o upload sobrescreve o mesmo arquivo de sempre.
 */
export function CampoEditForm({
  testeId,
  numeroTeste,
  equipamentoId,
  equipamentos,
  fotosAtuais,
  bloqueado,
}: {
  testeId: string;
  numeroTeste: string | null;
  equipamentoId: string | null;
  equipamentos: Equipamento[];
  fotosAtuais: [string, string | null, string | null][];
  bloqueado: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // "Editar dados de campo" em outras telas (prévia do laudo, passo a passo
  // do agendamento) é só um link `#dados-campo` — como essa seção às vezes
  // já está na mesma página, o clique não navega, só muda o hash (sem
  // recarregar/remontar nada), por isso é `hashchange`, não só um efeito de
  // montagem. Precisa rodar a checagem já na montagem também, pro caso de
  // chegar aqui vindo de outra página com o hash na URL desde o primeiro load.
  useEffect(() => {
    if (bloqueado) return;
    function verificarHash() {
      if (window.location.hash === "#dados-campo") setEditando(true);
    }
    verificarHash();
    window.addEventListener("hashchange", verificarHash);
    return () => window.removeEventListener("hashchange", verificarHash);
  }, [bloqueado]);

  // Limpa o hash ao fechar (qualquer caminho: Cancelar, salvar, clicar fora)
  // — sem isso, fechar e clicar em "Editar dados de campo" de novo não
  // reabria: o hash já era `#dados-campo`, então não mudava, e sem mudança
  // não tem `hashchange` pra pegar.
  useEffect(() => {
    if (!editando && window.location.hash === "#dados-campo") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [editando]);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await editarCampo(testeId, formData);
        setEditando(false);
        // Server Component (numero_teste, fotos, e o resumo em
        // testes/[testeId]/page.tsx) só reflete o que mudou depois de um
        // refresh — sem isso ficava mostrando os dados antigos.
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <div id="dados-campo" className="mt-6 scroll-mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-800">Dados de campo</p>
        {!bloqueado && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/10"
          >
            <Pencil className="size-3.5" />
            Editar
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-neutral-600">
        Número do teste: <strong className="text-neutral-800">{numeroTeste ?? "—"}</strong>
      </p>
      <FotosPreviewGrid fotos={fotosAtuais} />
      {bloqueado && (
        <p className="mt-2 text-xs text-neutral-400">Laudo já liberado — dados de campo não podem mais ser editados.</p>
      )}

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar dados de campo</DialogTitle>
          </DialogHeader>

          {editando && (
            <form action={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="numero_teste_edicao">Número do teste (impresso na etiqueta)</Label>
                  <Input id="numero_teste_edicao" name="numero_teste" required defaultValue={numeroTeste ?? ""} />
                </div>

                <div className="space-y-2">
                  <Label>Equipamento usado neste teste</Label>
                  <Select
                    name="equipamento_id"
                    items={Object.fromEntries(equipamentos.map((eq) => [eq.id, eq.label]))}
                    defaultValue={equipamentoId ?? undefined}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o opacímetro" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipamentos.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Fotos</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FOTOS.map((foto, i) => (
                    <div key={foto.name} className="space-y-1.5">
                      <Label htmlFor={foto.name} className="text-sm font-normal">
                        {foto.label}
                      </Label>
                      <FileDropInput
                        id={foto.name}
                        name={foto.name}
                        accept="image/*"
                        capture="environment"
                        previaAtualUrl={fotosAtuais[i]?.[1]}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2 border-t border-neutral-100 pt-4">
                <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
                  {pending ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
