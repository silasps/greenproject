"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoedaInput } from "@/components/moeda-input";
import { InfoTooltip } from "@/components/info-tooltip";
import { salvarValorKm, salvarFatorCorrecaoDistancia } from "./actions";

const EXPLICACAO_FATOR = (
  <>
    Cálculo: distância em linha reta (CEP do cliente ↔ empresa) × 2 (ida e
    volta) × este fator = km estimados cobrados. A linha reta é sempre menor
    que a rota real de carro, então o fator compensa essa diferença — ex.:
    com 1,4, 10 km em linha reta viram 10 × 2 × 1,4 = 28 km. Quanto maior o
    fator, mais a rota estimada se aproxima de ruas/curvas reais.
  </>
);

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ConfiguracoesForm({
  configuracoes,
}: {
  configuracoes: { valor_km: number; fator_correcao_distancia: number };
}) {
  return (
    <div className="mt-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-neutral-900">Parâmetros de orçamento</h2>
      <p className="text-sm text-neutral-500">Usados pra calcular a distância e o valor estimado do teste.</p>

      <div className="mt-4 space-y-3">
        <CardValorKm valorAtual={configuracoes.valor_km} />
        <CardFatorCorrecao valorAtual={configuracoes.fator_correcao_distancia} />
      </div>
    </div>
  );
}

function BotaoEditar({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar" className="text-brand hover:bg-brand/10" onClick={onClick}>
      <Pencil />
    </Button>
  );
}

function CardValorKm({ valorAtual }: { valorAtual: number }) {
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [valor, setValor] = useState(String(valorAtual));

  if (!editando) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <p className="font-medium text-neutral-900">Valor padrão por km</p>
          <p className="text-sm text-neutral-500">{formatarMoeda(valorAtual)}</p>
        </div>
        <BotaoEditar
          onClick={() => {
            setValor(String(valorAtual));
            setEditando(true);
          }}
        />
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await salvarValorKm(formData);
          setEditando(false);
        })
      }
      className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <span className="flex-1 text-sm font-medium text-neutral-900">Valor padrão por km</span>
      <MoedaInput name="valor_km" value={valor} onChange={setValor} className="w-40" />
      <Button type="submit" size="sm" disabled={pending} className="bg-brand hover:bg-brand-dark">
        {pending ? "..." : "Salvar"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setEditando(false)}>
        Cancelar
      </Button>
    </form>
  );
}

function CardFatorCorrecao({ valorAtual }: { valorAtual: number }) {
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [valor, setValor] = useState(String(valorAtual));

  if (!editando) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <p className="flex items-center gap-1.5 font-medium text-neutral-900">
            Fator de correção da distância
            <InfoTooltip>{EXPLICACAO_FATOR}</InfoTooltip>
          </p>
          <p className="text-sm text-neutral-500">{valorAtual.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</p>
        </div>
        <BotaoEditar
          onClick={() => {
            setValor(String(valorAtual));
            setEditando(true);
          }}
        />
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await salvarFatorCorrecaoDistancia(formData);
          setEditando(false);
        })
      }
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm font-medium text-neutral-900">Fator de correção da distância</span>
        <Input
          name="fator_correcao_distancia"
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-24"
        />
        <Button type="submit" size="sm" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "..." : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditando(false)}>
          Cancelar
        </Button>
      </div>
      <p className="mt-2 max-w-md text-xs text-neutral-400">
        Cálculo: linha reta × 2 (ida e volta) × este fator = km cobrados. Ex.: 10 km em linha reta ×2×
        {valor || "0"} = {(10 * 2 * (Number(valor) || 0)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
        estimados.
      </p>
    </form>
  );
}
