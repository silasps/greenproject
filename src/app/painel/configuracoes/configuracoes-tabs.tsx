"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Role } from "@/lib/auth/permissions";
import { ConfiguracoesForm } from "./configuracoes-form";
import { TiposServicoLista } from "./tipos-servico-lista";
import { KpisPorCargoForm } from "./kpis-por-cargo-form";
import { DadosEmpresaForm } from "./dados-empresa-form";

type TipoServico = { id: string; nome: string; valor: number };
type Funcao = { id: string; nome: string; nivel_acesso: Role };
type DadosEmpresa = { razao_social: string; cnpj: string; endereco: string; telefone: string };

export function ConfiguracoesTabs({
  configuracoes,
  tiposServico,
  funcoes,
  overridesPorCargo,
  dadosEmpresa,
}: {
  configuracoes: { valor_km: number; fator_correcao_distancia: number };
  tiposServico: TipoServico[];
  funcoes: Funcao[];
  overridesPorCargo: Record<string, Record<string, boolean>>;
  dadosEmpresa: DadosEmpresa;
}) {
  return (
    <Tabs defaultValue="orcamento" className="mt-6">
      <TabsList variant="line">
        <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
        <TabsTrigger value="visibilidade">Visibilidade e acesso</TabsTrigger>
        <TabsTrigger value="empresa">Empresa</TabsTrigger>
      </TabsList>

      <TabsContent value="orcamento">
        <ConfiguracoesForm configuracoes={configuracoes} />
        <TiposServicoLista tiposServico={tiposServico} />
      </TabsContent>

      <TabsContent value="visibilidade">
        <KpisPorCargoForm funcoes={funcoes} overrides={overridesPorCargo} />
      </TabsContent>

      <TabsContent value="empresa">
        <DadosEmpresaForm dados={dadosEmpresa} />
      </TabsContent>
    </Tabs>
  );
}
