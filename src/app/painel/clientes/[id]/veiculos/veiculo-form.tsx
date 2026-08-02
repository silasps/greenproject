"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { salvarVeiculo } from "./actions";

export function VeiculoForm({ clienteId }: { clienteId: string }) {
  const [tipoAtivo, setTipoAtivo] = useState<"veiculo" | "maquina_equipamento">("veiculo");
  const [identificador, setIdentificador] = useState("");
  const [marca, setMarca] = useState("");
  const [motor, setMotor] = useState("");
  const [marchaLentaMin, setMarchaLentaMin] = useState("");
  const [marchaLentaMax, setMarchaLentaMax] = useState("");
  const [rotacaoCorteMin, setRotacaoCorteMin] = useState("");
  const [rotacaoCorteMax, setRotacaoCorteMax] = useState("");
  const [limiteOpacidade, setLimiteOpacidade] = useState("");
  const [buscaMotorMsg, setBuscaMotorMsg] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [pending, startTransition] = useTransition();

  async function buscarMotor() {
    if (!marca || !motor) return;
    setBuscando(true);
    setBuscaMotorMsg(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("especificacoes_motor")
      .select("marcha_lenta_min, marcha_lenta_max, rotacao_corte_min, rotacao_corte_max, limite_opacidade")
      .eq("marca", marca)
      .eq("identificacao_motor", motor)
      .eq("status", "confirmado")
      .maybeSingle();
    setBuscando(false);

    if (!data) {
      setBuscaMotorMsg("Motor não encontrado — preencha os limites manualmente.");
      return;
    }
    setMarchaLentaMin(data.marcha_lenta_min?.toString() ?? "");
    setMarchaLentaMax(data.marcha_lenta_max?.toString() ?? "");
    setRotacaoCorteMin(data.rotacao_corte_min?.toString() ?? "");
    setRotacaoCorteMax(data.rotacao_corte_max?.toString() ?? "");
    setLimiteOpacidade(data.limite_opacidade?.toString() ?? "");
    setBuscaMotorMsg("Preenchido a partir de um cadastro existente.");
  }

  return (
    <form
      action={(formData) => startTransition(() => salvarVeiculo(formData))}
      className="mt-6 mx-auto max-w-lg space-y-4"
    >
      <input type="hidden" name="cliente_id" value={clienteId} />

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="tipo_ativo"
            value="veiculo"
            checked={tipoAtivo === "veiculo"}
            onChange={() => setTipoAtivo("veiculo")}
          />
          Veículo (circula em via pública)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="tipo_ativo"
            value="maquina_equipamento"
            checked={tipoAtivo === "maquina_equipamento"}
            onChange={() => setTipoAtivo("maquina_equipamento")}
          />
          Máquina/Equipamento
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="identificador">{tipoAtivo === "veiculo" ? "Placa" : "Número de série do fabricante"}</Label>
        <Input
          id="identificador"
          name="identificador"
          required
          value={identificador}
          onChange={(e) => setIdentificador(tipoAtivo === "veiculo" ? e.target.value.toUpperCase() : e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="marca">Marca</Label>
          <Input id="marca" name="marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo</Label>
          <Input id="modelo" name="modelo" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="combustivel">Combustível</Label>
          <Input id="combustivel" name="combustivel" placeholder="Diesel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ano">Ano</Label>
          <Input id="ano" name="ano" type="number" />
        </div>
      </div>

      {tipoAtivo === "veiculo" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="chassi">Chassi</Label>
            <Input id="chassi" name="chassi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="renavam">Renavam</Label>
            <Input id="renavam" name="renavam" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="patrimonio_cliente">Patrimônio interno do cliente (opcional)</Label>
          <Input id="patrimonio_cliente" name="patrimonio_cliente" />
        </div>
      )}

      <div className="rounded-md border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="identificacao_motor">Identificação do motor</Label>
          <Button type="button" variant="outline" size="sm" disabled={buscando} onClick={buscarMotor}>
            {buscando ? "Buscando..." : "Buscar especificação"}
          </Button>
        </div>
        <Input
          id="identificacao_motor"
          name="identificacao_motor"
          className="mt-2"
          value={motor}
          onChange={(e) => setMotor(e.target.value)}
        />
        {buscaMotorMsg && <p className="mt-2 text-xs text-neutral-500">{buscaMotorMsg}</p>}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Marcha lenta (mín/máx)</Label>
            <div className="flex gap-2">
              <Input name="marcha_lenta_min" value={marchaLentaMin} onChange={(e) => setMarchaLentaMin(e.target.value)} />
              <Input name="marcha_lenta_max" value={marchaLentaMax} onChange={(e) => setMarchaLentaMax(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rotação de corte (mín/máx)</Label>
            <div className="flex gap-2">
              <Input name="rotacao_corte_min" value={rotacaoCorteMin} onChange={(e) => setRotacaoCorteMin(e.target.value)} />
              <Input name="rotacao_corte_max" value={rotacaoCorteMax} onChange={(e) => setRotacaoCorteMax(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="limite_opacidade">Limite de opacidade K(m-1)</Label>
          <Input
            id="limite_opacidade"
            name="limite_opacidade"
            value={limiteOpacidade}
            onChange={(e) => setLimiteOpacidade(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <ConfirmLeaveButton to={`/painel/clientes/${clienteId}`} label="Cancelar" variant="outline" />
      </div>
    </form>
  );
}
