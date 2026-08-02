"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { KPI_SECOES } from "@/lib/kpis/catalogo";
import { getRoleLevel, ROLE_LEVEL, ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { salvarFuncaoKpis } from "./actions";

type Funcao = { id: string; nome: string; nivel_acesso: Role };
type OverridesPorCargo = Record<string, Record<string, boolean>>;

export function KpisPorCargoForm({ funcoes, overrides }: { funcoes: Funcao[]; overrides: OverridesPorCargo }) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-neutral-900">Visibilidade de KPIs por cargo</h2>
      <p className="text-sm text-neutral-500">
        O que cada cargo vê por padrão na tela inicial do painel. Pra abrir exceção pra uma pessoa específica sem
        mudar o cargo dela, use a ficha dela em DP.
      </p>

      {funcoes.length === 0 && <p className="mt-4 text-sm text-neutral-500">Nenhum cargo cadastrado ainda.</p>}

      <div className="mt-4 space-y-3">
        {funcoes.map((funcao) => (
          <LinhaCargo key={funcao.id} funcao={funcao} overridesCargo={overrides[funcao.id] ?? {}} />
        ))}
      </div>
    </div>
  );
}

function LinhaCargo({ funcao, overridesCargo }: { funcao: Funcao; overridesCargo: Record<string, boolean> }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => salvarFuncaoKpis(formData))}
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="funcao_id" value={funcao.id} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900">{funcao.nome}</p>
          <p className="text-xs text-neutral-500">{ROLE_LABELS[funcao.nivel_acesso]}</p>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "..." : "Salvar"}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {KPI_SECOES.map((secao) => {
          const padrao = getRoleLevel(funcao.nivel_acesso) >= ROLE_LEVEL[secao.nivelPadrao];
          const valorAtual = overridesCargo[secao.key] ?? padrao;
          return (
            <label key={secao.key} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
              <Checkbox
                name={`kpi_${secao.key}`}
                defaultChecked={valorAtual}
                className="data-checked:border-brand data-checked:bg-brand"
              />
              {secao.label}
            </label>
          );
        })}
      </div>
    </form>
  );
}
