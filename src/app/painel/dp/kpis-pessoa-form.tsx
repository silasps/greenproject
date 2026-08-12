"use client";

import { type ReactNode, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { KPI_SECOES_DASHBOARD, KPI_SECOES_ACESSO, type KpiSecaoDef } from "@/lib/kpis/catalogo";
import { getRoleLevel, ROLE_LEVEL, type Role } from "@/lib/auth/permissions";
import { salvarUsuarioKpis } from "./actions";

type Estado = "cargo" | "mostrar" | "esconder";
type Overrides = Record<string, boolean>;

function CardColapsavel({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={false}
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <CollapsibleTrigger type="button" className="group flex items-start justify-between gap-3">
        <span>
          <h2 className="font-semibold text-neutral-900">{titulo}</h2>
          <p className="mt-1 text-xs text-neutral-500">{descricao}</p>
        </span>
        <ChevronDown
          className="mt-0.5 size-4 shrink-0 text-neutral-400 transition-transform group-data-[panel-open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      {/* keepMounted: os campos continuam no FormData mesmo com o card
          fechado — as duas seções dividem um `salvarUsuarioKpis` só, que
          espera todas as chaves de KPI_SECOES presentes de uma vez. */}
      <CollapsibleContent keepMounted>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function SecaoRadios({
  secoes,
  nivelAcessoCargo,
  overridesCargo,
  overridesPessoa,
}: {
  secoes: KpiSecaoDef[];
  nivelAcessoCargo: Role;
  overridesCargo: Overrides;
  overridesPessoa: Overrides;
}) {
  return (
    <div className="mt-4 space-y-3">
      {secoes.map((secao) => {
        const padraoDoCargo = overridesCargo[secao.key] ?? getRoleLevel(nivelAcessoCargo) >= ROLE_LEVEL[secao.nivelPadrao];
        const atual: Estado = secao.key in overridesPessoa ? (overridesPessoa[secao.key] ? "mostrar" : "esconder") : "cargo";
        return (
          <fieldset
            key={secao.key}
            className="flex flex-col gap-1.5 border-t border-neutral-100 pt-3 first:border-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
          >
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
  );
}

// Mesmo padrão de kpis-por-cargo-form.tsx (Configurações → Visibilidade e
// acesso): checkbox direto, sem estado "seguir cargo" — ao contrário da
// exceção de KPI (que é um ajuste pontual em cima do padrão do cargo), o
// acesso da pessoa aqui é sempre um valor explícito, igual ao que já
// existe pra cargo.
function SecaoCheckboxes({
  secoes,
  nivelAcessoCargo,
  overridesCargo,
  overridesPessoa,
}: {
  secoes: KpiSecaoDef[];
  nivelAcessoCargo: Role;
  overridesCargo: Overrides;
  overridesPessoa: Overrides;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
      {secoes.map((secao) => {
        const padrao = overridesCargo[secao.key] ?? getRoleLevel(nivelAcessoCargo) >= ROLE_LEVEL[secao.nivelPadrao];
        const valorAtual = overridesPessoa[secao.key] ?? padrao;
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
  );
}

export function KpisPessoaForm({
  usuarioId,
  nivelAcessoCargo,
  overridesCargo,
  overridesPessoa,
}: {
  usuarioId: string;
  nivelAcessoCargo: Role;
  overridesCargo: Overrides;
  overridesPessoa: Overrides;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => salvarUsuarioKpis(formData))}
      className="mt-8 space-y-4"
    >
      <input type="hidden" name="usuario_id" value={usuarioId} />

      <CardColapsavel
        titulo="Exceção de KPIs pra essa pessoa"
        descricao="Por padrão ela vê o que o cargo dela libera na tela inicial do painel (configurado em Configurações). Só mexa aqui se essa pessoa precisa ver mais ou menos do que o cargo dela, sem trocar o cargo."
      >
        <SecaoRadios
          secoes={KPI_SECOES_DASHBOARD}
          nivelAcessoCargo={nivelAcessoCargo}
          overridesCargo={overridesCargo}
          overridesPessoa={overridesPessoa}
        />
      </CardColapsavel>

      <CardColapsavel
        titulo="Acessos dessa pessoa"
        descricao="Áreas do sistema que essa pessoa pode abrir — mesma lista de Configurações → Visibilidade e acesso, só que marcada pra essa pessoa em vez do cargo dela."
      >
        <SecaoCheckboxes
          secoes={KPI_SECOES_ACESSO}
          nivelAcessoCargo={nivelAcessoCargo}
          overridesCargo={overridesCargo}
          overridesPessoa={overridesPessoa}
        />
      </CardColapsavel>

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Salvando..." : "Salvar exceções"}
      </Button>
    </form>
  );
}
