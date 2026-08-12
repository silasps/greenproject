"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { KPI_SECOES } from "@/lib/kpis/catalogo";
import { getRoleLevel, ROLE_LEVEL, type Role } from "@/lib/auth/permissions";
import { salvarUsuarioKpis } from "./actions";

type Estado = "cargo" | "mostrar" | "esconder";

export function KpisPessoaForm({
  usuarioId,
  nivelAcessoCargo,
  overridesCargo,
  overridesPessoa,
}: {
  usuarioId: string;
  nivelAcessoCargo: Role;
  overridesCargo: Record<string, boolean>;
  overridesPessoa: Record<string, boolean>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => salvarUsuarioKpis(formData))}
      className="mt-8 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="usuario_id" value={usuarioId} />
      <h2 className="font-semibold text-neutral-900">Exceção de KPIs pra essa pessoa</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Por padrão ela vê o que o cargo dela libera (configurado em Configurações). Só mexa aqui se essa pessoa
        precisa ver mais ou menos do que o cargo dela, sem trocar o cargo.
      </p>

      <div className="mt-4 space-y-3">
        {KPI_SECOES.map((secao) => {
          const padraoDoCargo = overridesCargo[secao.key] ?? getRoleLevel(nivelAcessoCargo) >= ROLE_LEVEL[secao.nivelPadrao];
          const atual: Estado = secao.key in overridesPessoa ? (overridesPessoa[secao.key] ? "mostrar" : "esconder") : "cargo";
          return (
            <fieldset key={secao.key} className="flex flex-col gap-1.5 border-t border-neutral-100 pt-3 first:border-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <legend className="text-sm font-medium text-neutral-700 sm:mb-0">{secao.label}</legend>
              <div className="flex gap-4 text-sm text-neutral-600">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`kpi_${secao.key}`} value="cargo" defaultChecked={atual === "cargo"} className="accent-brand" />
                  Seguir cargo ({padraoDoCargo ? "vê" : "não vê"})
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`kpi_${secao.key}`} value="mostrar" defaultChecked={atual === "mostrar"} className="accent-brand" />
                  Sempre mostrar
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`kpi_${secao.key}`} value="esconder" defaultChecked={atual === "esconder"} className="accent-brand" />
                  Sempre esconder
                </label>
              </div>
            </fieldset>
          );
        })}
      </div>

      <Button type="submit" size="sm" variant="outline" disabled={pending} className="mt-4">
        {pending ? "Salvando..." : "Salvar exceções"}
      </Button>
    </form>
  );
}
