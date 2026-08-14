"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VeiculoForm } from "../../clientes/[id]/veiculos/veiculo-form";
import { vincularVeiculo } from "../actions";

type Veiculo = { id: string; identificador: string; marca: string | null; modelo: string | null };

const botaoClasse = "rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark";

/**
 * Um modal só, dois modos — em vez de mandar pro cadastro do cliente em
 * outra tela quando não há veículo ainda: "selecionar" (veículo já
 * cadastrado, o caso comum) e "cadastrar" (formulário completo de
 * veículo/equipamento — mesmo `VeiculoForm` da tela de clientes — que já
 * vincula ao agendamento sozinho ao salvar). Começa no modo que faz
 * sentido pro que já se sabe (sem veículo → cadastrar direto), mas sempre
 * dá pra trocar, pro caso de descobrir no meio do cadastro que o cliente
 * já tinha um veículo registrado.
 */
export function VincularVeiculoButton({
  agendamentoId,
  clienteId,
  veiculos,
}: {
  agendamentoId: string;
  clienteId: string;
  veiculos: Veiculo[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"selecionar" | "cadastrar">(veiculos.length > 0 ? "selecionar" : "cadastrar");
  const [veiculoId, setVeiculoId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function vincular(idVeiculo: string) {
    setErro(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("agendamento_id", agendamentoId);
        fd.set("veiculo_id", idVeiculo);
        await vincularVeiculo(fd);
        setAberto(false);
        setVeiculoId("");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível vincular.");
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setAberto(true)} className={botaoClasse}>
        Vincular veículo/equipamento
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular veículo/equipamento</DialogTitle>
          </DialogHeader>

          {modo === "selecionar" ? (
            <div className="space-y-3">
              {veiculos.length > 0 ? (
                <select
                  value={veiculoId}
                  onChange={(e) => setVeiculoId(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.identificador} {[v.marca, v.modelo].filter(Boolean).join(" ")}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-neutral-500">Esse cliente ainda não tem veículo/equipamento cadastrado.</p>
              )}
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <Button
                type="button"
                disabled={pending || !veiculoId}
                onClick={() => vincular(veiculoId)}
                className="w-full bg-brand hover:bg-brand-dark"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Vincular"}
              </Button>
              <button
                type="button"
                onClick={() => setModo("cadastrar")}
                className="w-full text-center text-sm text-brand hover:underline"
              >
                Não achou? Cadastrar novo veículo/equipamento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <VeiculoForm
                clienteId={clienteId}
                onCancelar={() => setAberto(false)}
                onSucesso={(veiculoIdCriado) => {
                  if (veiculoIdCriado) vincular(veiculoIdCriado);
                }}
              />
              {erro && (
                <p className="text-sm text-red-600">
                  Veículo cadastrado, mas não foi possível vincular ao agendamento: {erro} Tente selecionar ele na aba
                  &ldquo;selecionar existente&rdquo;.
                </p>
              )}
              {veiculos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModo("selecionar")}
                  className="w-full text-center text-sm text-brand hover:underline"
                >
                  Esse cliente já tem veículo cadastrado — selecionar existente
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
