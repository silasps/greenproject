"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoedaInput } from "@/components/moeda-input";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { criarTipoServico, atualizarTipoServico, excluirTipoServico } from "./actions";

type TipoServico = { id: string; nome: string; valor: number };

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TiposServicoLista({ tiposServico }: { tiposServico: TipoServico[] }) {
  return (
    <div className="mt-8 max-w-2xl">
      <h2 className="text-lg font-semibold text-neutral-900">Tipos de serviço</h2>
      <p className="text-sm text-neutral-500">
        Valor de cada serviço — ao escolher o tipo no agendamento, esse valor já vem preenchido.
      </p>

      <div className="mt-4 space-y-3">
        {tiposServico.length === 0 && <p className="text-sm text-neutral-500">Nenhum serviço cadastrado.</p>}
        {tiposServico.map((tipo) => (
          <LinhaTipoServico key={tipo.id} tipo={tipo} />
        ))}
      </div>

      <NovoTipoServicoForm />
    </div>
  );
}

function LinhaTipoServico({ tipo }: { tipo: TipoServico }) {
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(tipo.valor));

  async function excluir() {
    await excluirTipoServico(tipo.id);
  }

  if (!editando) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <p className="font-medium text-neutral-900">{tipo.nome}</p>
          <p className="text-sm text-neutral-500">{formatarMoeda(tipo.valor)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Editar"
            className="text-brand hover:bg-brand/10"
            onClick={() => {
              setValor(String(tipo.valor));
              setEditando(true);
            }}
          >
            <Pencil />
          </Button>
          <ConfirmDeleteButton
            label={<Trash2 />}
            ariaLabel="Excluir tipo de serviço"
            variant="ghost"
            size="icon-sm"
            className="text-neutral-500 hover:bg-red-50 hover:text-red-600"
            title={`Excluir "${tipo.nome}"?`}
            description="Não afeta agendamentos já criados com esse tipo — só some da lista pra novos agendamentos."
            onConfirm={excluir}
          />
        </div>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await atualizarTipoServico(formData);
          setEditando(false);
        })
      }
      className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={tipo.id} />
      <span className="flex-1 text-sm font-medium text-neutral-900">{tipo.nome}</span>
      <MoedaInput name="valor" value={valor} onChange={setValor} className="w-40" />
      <Button type="submit" size="sm" disabled={pending} className="bg-brand hover:bg-brand-dark">
        {pending ? "..." : "Salvar"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setEditando(false)}>
        Cancelar
      </Button>
    </form>
  );
}

function NovoTipoServicoForm() {
  const [pending, startTransition] = useTransition();
  const [valor, setValor] = useState("0");

  return (
    <form
      action={(formData) => startTransition(() => criarTipoServico(formData))}
      className="mt-3 flex items-end gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white p-4"
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="nome_novo_servico">Novo serviço</Label>
        <Input id="nome_novo_servico" name="nome" placeholder="Ex.: Emissão de laudo" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="valor_novo_servico">Valor (R$)</Label>
        <MoedaInput id="valor_novo_servico" name="valor" value={valor} onChange={setValor} className="w-40" />
      </div>
      <Button type="submit" disabled={pending} variant="outline">
        {pending ? "..." : "Adicionar"}
      </Button>
    </form>
  );
}
