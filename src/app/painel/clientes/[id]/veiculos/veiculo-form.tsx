"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ErrorModal } from "@/components/error-modal";
import { InfoTooltip } from "@/components/info-tooltip";
import { onlyDigits } from "@/lib/utils/mascaras";
import { buscarMarcasFipe, buscarModelosFipe, type MarcaFipe } from "@/lib/veiculos/fipe";
import { MarcaModeloCombobox } from "./marca-modelo-combobox";
import { salvarVeiculo, atualizarVeiculo } from "./actions";

/** Nome de modelo da FIPE geralmente traz o combustível embutido (ex.: "Etios XLS 1.5 Flex 16V"). */
const COMBUSTIVEIS_FIPE: { regex: RegExp; label: string }[] = [
  { regex: /\bflex\b/i, label: "Flex" },
  { regex: /\bdiesel\b/i, label: "Diesel" },
  { regex: /\bel[ée]tric[oa]\b/i, label: "Elétrico" },
  { regex: /\bh[íi]brid[oa]\b/i, label: "Híbrido" },
  { regex: /\bgnv\b/i, label: "GNV" },
  { regex: /\b[aá]lcool\b/i, label: "Álcool" },
  { regex: /\bgasolina\b/i, label: "Gasolina" },
];

function extrairCombustivel(texto: string): string | null {
  return COMBUSTIVEIS_FIPE.find(({ regex }) => regex.test(texto))?.label ?? null;
}

type EspecificacaoMotor = {
  marcha_lenta_min: number | null;
  marcha_lenta_max: number | null;
  rotacao_corte_min: number | null;
  rotacao_corte_max: number | null;
  limite_opacidade: number | null;
};

export type VeiculoEdicao = {
  id: string;
  tipo_ativo: "veiculo" | "maquina_equipamento";
  identificador: string;
  marca: string | null;
  modelo: string | null;
  identificacao_motor: string | null;
  combustivel: string | null;
  ano: number | null;
  chassi: string | null;
  renavam: string | null;
  patrimonio_cliente: string | null;
  especificacoes_motor: EspecificacaoMotor | null;
};

export function VeiculoForm({
  clienteId,
  veiculo,
  onSucesso,
  onCancelar,
}: {
  clienteId: string;
  veiculo?: VeiculoEdicao;
  /** Só roda quando informado — chamado após salvar com sucesso, pra fechar o modal.
   * Recebe o id do veículo recém-criado (undefined numa edição). */
  onSucesso?: (veiculoIdCriado?: string) => void;
  /** Quando informado, o botão "Cancelar" só fecha o modal em vez de navegar. */
  onCancelar?: () => void;
}) {
  const destino = `/painel/clientes/${clienteId}`;
  const formRef = useRef<HTMLFormElement>(null);
  const especificacao = veiculo?.especificacoes_motor;
  const [tipoAtivo, setTipoAtivo] = useState<"veiculo" | "maquina_equipamento">(veiculo?.tipo_ativo ?? "veiculo");
  const [identificador, setIdentificador] = useState(veiculo?.identificador ?? "");
  const [marca, setMarca] = useState(veiculo?.marca ?? "");
  const [modelo, setModelo] = useState(veiculo?.modelo ?? "");
  const [marcasFipe, setMarcasFipe] = useState<MarcaFipe[]>([]);
  const [modelosFipe, setModelosFipe] = useState<string[]>([]);
  const [combustivel, setCombustivel] = useState(veiculo?.combustivel ?? "");
  const [ano, setAno] = useState(veiculo?.ano?.toString() ?? "");
  const [motor, setMotor] = useState(veiculo?.identificacao_motor ?? "");
  const motorRef = useRef(motor);
  const [marchaLentaMin, setMarchaLentaMin] = useState(especificacao?.marcha_lenta_min?.toString() ?? "");
  const [marchaLentaMax, setMarchaLentaMax] = useState(especificacao?.marcha_lenta_max?.toString() ?? "");
  const [rotacaoCorteMin, setRotacaoCorteMin] = useState(especificacao?.rotacao_corte_min?.toString() ?? "");
  const [rotacaoCorteMax, setRotacaoCorteMax] = useState(especificacao?.rotacao_corte_max?.toString() ?? "");
  const [limiteOpacidade, setLimiteOpacidade] = useState(especificacao?.limite_opacidade?.toString() ?? "");
  const [buscaMotorMsg, setBuscaMotorMsg] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
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

  /** Mesma marca/modelo já foi cadastrado antes com um motor identificado? Reaproveita
   * o motor e os limites, sem precisar que a pessoa saiba de cor a ID do motor. */
  async function buscarEspecificacaoPorModelo(marcaValor: string, modeloValor: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("veiculos_maquinas")
      .select(
        "identificacao_motor, especificacoes_motor(marcha_lenta_min, marcha_lenta_max, rotacao_corte_min, rotacao_corte_max, limite_opacidade)",
      )
      .eq("tipo_ativo", "veiculo")
      .ilike("marca", marcaValor)
      .ilike("modelo", modeloValor)
      .not("identificacao_motor", "is", null)
      .neq("identificacao_motor", "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.identificacao_motor || motorRef.current.trim()) return;

    setMotor(data.identificacao_motor);
    setBuscaMotorMsg("Motor e limites preenchidos a partir de um veículo já cadastrado desse modelo.");
    const espec = data.especificacoes_motor as unknown as EspecificacaoMotor | null;
    if (espec) {
      setMarchaLentaMin(espec.marcha_lenta_min?.toString() ?? "");
      setMarchaLentaMax(espec.marcha_lenta_max?.toString() ?? "");
      setRotacaoCorteMin(espec.rotacao_corte_min?.toString() ?? "");
      setRotacaoCorteMax(espec.rotacao_corte_max?.toString() ?? "");
      setLimiteOpacidade(espec.limite_opacidade?.toString() ?? "");
    }
  }

  useEffect(() => {
    motorRef.current = motor;
  }, [motor]);

  // Combustível costuma vir embutido no nome do modelo da FIPE — preenche sozinho
  // se a pessoa ainda não tiver digitado nada nesse campo.
  function handleModeloChange(valor: string) {
    setModelo(valor);
    const detectado = extrairCombustivel(valor);
    if (detectado) setCombustivel((atual) => atual || detectado);
  }

  // Só busca em cadastro novo (edição já tem seus próprios dados) e só se a pessoa
  // ainda não digitou um motor manualmente. Debounce pra não bater no banco a cada tecla.
  useEffect(() => {
    if (veiculo || tipoAtivo !== "veiculo" || !marca.trim() || !modelo.trim()) return;
    const timeout = setTimeout(() => buscarEspecificacaoPorModelo(marca, modelo), 500);
    return () => clearTimeout(timeout);
  }, [modelo, marca, veiculo, tipoAtivo]);

  async function carregarMarcasFipe() {
    if (marcasFipe.length > 0) return;
    setMarcasFipe(await buscarMarcasFipe());
  }

  function handleMarcaChange(valor: string) {
    setMarca(valor);
    const encontrada = marcasFipe.find((m) => m.nome.toLowerCase() === valor.trim().toLowerCase());
    if (!encontrada) {
      setModelosFipe([]);
      return;
    }
    buscarModelosFipe(encontrada).then(setModelosFipe);
  }

  async function handleSubmit(formData: FormData) {
    setErro(null);
    try {
      if (veiculo) {
        await atualizarVeiculo(veiculo.id, formData);
        onSucesso?.();
      } else {
        const { id } = await salvarVeiculo(formData);
        onSucesso?.(id);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar o veículo/equipamento.");
    }
  }

  return (
    <form
      ref={formRef}
      action={(formData) => startTransition(() => handleSubmit(formData))}
      className={onCancelar ? "space-y-4" : "mt-6 mx-auto max-w-lg space-y-4"}
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
          placeholder={tipoAtivo === "veiculo" ? "Ex: ABC1D23" : undefined}
          value={identificador}
          onChange={(e) => setIdentificador(tipoAtivo === "veiculo" ? e.target.value.toUpperCase() : e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="marca">Marca</Label>
          {tipoAtivo === "veiculo" ? (
            <MarcaModeloCombobox
              id="marca"
              name="marca"
              value={marca}
              onValueChange={handleMarcaChange}
              itens={marcasFipe.map((m) => m.nome)}
              placeholder="Digite para buscar (ex: Mercedes-Benz)"
              onFocus={carregarMarcasFipe}
            />
          ) : (
            <Input id="marca" name="marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo</Label>
          {tipoAtivo === "veiculo" ? (
            <MarcaModeloCombobox
              id="modelo"
              name="modelo"
              value={modelo}
              onValueChange={handleModeloChange}
              itens={modelosFipe}
              placeholder={modelosFipe.length > 0 ? "Digite para buscar" : "Selecione a marca primeiro"}
            />
          ) : (
            <Input id="modelo" name="modelo" value={modelo} onChange={(e) => handleModeloChange(e.target.value)} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="combustivel">Combustível</Label>
          <Input
            id="combustivel"
            name="combustivel"
            placeholder="Diesel"
            value={combustivel}
            onChange={(e) => setCombustivel(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ano">Ano</Label>
          <Input
            id="ano"
            name="ano"
            inputMode="numeric"
            maxLength={4}
            placeholder="Ex: 2020"
            value={ano}
            onChange={(e) => setAno(onlyDigits(e.target.value).slice(0, 4))}
          />
        </div>
      </div>

      {tipoAtivo === "veiculo" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="chassi">Chassi</Label>
            <Input
              id="chassi"
              name="chassi"
              placeholder="17 caracteres"
              defaultValue={veiculo?.chassi ?? ""}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="renavam">Renavam</Label>
            <Input
              id="renavam"
              name="renavam"
              placeholder="11 dígitos"
              defaultValue={veiculo?.renavam ?? ""}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="patrimonio_cliente">Patrimônio interno do cliente (opcional)</Label>
          <Input id="patrimonio_cliente" name="patrimonio_cliente" defaultValue={veiculo?.patrimonio_cliente ?? ""} />
        </div>
      )}

      <div className="rounded-md border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="identificacao_motor">Identificação do motor</Label>
            <InfoTooltip>
              Código de identificação do motor, gravado na etiqueta/bloco do motor ou no
              manual do fabricante. Usado pra localizar automaticamente os limites já
              cadastrados pra esse motor (botão &ldquo;Buscar especificação&rdquo;).
            </InfoTooltip>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={buscando} onClick={buscarMotor}>
            {buscando ? "Buscando..." : "Buscar especificação"}
          </Button>
        </div>
        <Input
          id="identificacao_motor"
          name="identificacao_motor"
          className="mt-2"
          placeholder="Ex: OM904LA"
          value={motor}
          onChange={(e) => setMotor(e.target.value)}
        />
        {buscaMotorMsg && <p className="mt-2 text-xs text-neutral-500">{buscaMotorMsg}</p>}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Marcha lenta — mín/máx (RPM)</Label>
              <InfoTooltip>
                Rotação do motor em marcha lenta (parado, sem acelerar), em RPM
                (rotações por minuto), conforme especificação do fabricante.
              </InfoTooltip>
            </div>
            <div className="flex gap-2">
              <Input
                name="marcha_lenta_min"
                placeholder="Ex: 700"
                value={marchaLentaMin}
                onChange={(e) => setMarchaLentaMin(e.target.value)}
              />
              <Input
                name="marcha_lenta_max"
                placeholder="Ex: 900"
                value={marchaLentaMax}
                onChange={(e) => setMarchaLentaMax(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Rotação de corte — mín/máx (RPM)</Label>
              <InfoTooltip>
                Rotação máxima do motor em que ocorre o corte automático de combustível
                (rotação de corte/governador), em RPM.
              </InfoTooltip>
            </div>
            <div className="flex gap-2">
              <Input
                name="rotacao_corte_min"
                placeholder="Ex: 2200"
                value={rotacaoCorteMin}
                onChange={(e) => setRotacaoCorteMin(e.target.value)}
              />
              <Input
                name="rotacao_corte_max"
                placeholder="Ex: 2600"
                value={rotacaoCorteMax}
                onChange={(e) => setRotacaoCorteMax(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="limite_opacidade">Limite de opacidade K(m-1)</Label>
            <InfoTooltip>
              Coeficiente de absorção de luz da fumaça, em m⁻¹ (por metro) — o valor
              máximo permitido pelo fabricante pra esse motor no teste de opacidade.
            </InfoTooltip>
          </div>
          <Input
            id="limite_opacidade"
            name="limite_opacidade"
            placeholder="Ex: 2.5"
            value={limiteOpacidade}
            onChange={(e) => setLimiteOpacidade(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {onCancelar ? (
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
        ) : (
          <ConfirmLeaveButton to={destino} label="Cancelar" variant="outline" />
        )}
      </div>

      <ErrorModal erro={erro} onClose={() => setErro(null)} formRef={formRef} />
    </form>
  );
}
