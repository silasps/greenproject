"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { vincularVeiculo } from "../actions";

type Veiculo = { id: string; identificador: string; marca: string | null; modelo: string | null };

/**
 * Antes era um link de âncora que rolava até um card mais abaixo na mesma
 * página — inconsistente com o resto do sistema (que já usa modal pra ação
 * rápida, ver `agenda/criar-modal.tsx`) e, no App Router, o clique nem
 * sempre rolava até o card de verdade. Vira modal: abre, escolhe o
 * veículo, fecha sozinho e atualiza a tela ao vincular.
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
  const [veiculoId, setVeiculoId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        await vincularVeiculo(formData);
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
      <Button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
      >
        Vincular veículo/equipamento
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="size-4 text-brand" />
              Vincular veículo/equipamento
            </DialogTitle>
          </DialogHeader>

          {veiculos.length > 0 ? (
            <form action={handleSubmit} className="space-y-3">
              <input type="hidden" name="agendamento_id" value={agendamentoId} />
              <select
                name="veiculo_id"
                required
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
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <Button type="submit" disabled={pending} className="w-full bg-brand hover:bg-brand-dark">
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Vincular"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-neutral-600">
              Esse cliente ainda não tem veículo/equipamento cadastrado.{" "}
              <Link href={`/painel/clientes/${clienteId}`} className="text-brand hover:underline">
                Cadastrar agora →
              </Link>
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
