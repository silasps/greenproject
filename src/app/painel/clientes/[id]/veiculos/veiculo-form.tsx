"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ErrorModal } from "@/components/error-modal";
import { onlyDigits } from "@/lib/utils/mascaras";
import { buscarMarcasFipe, buscarModelosFipe, extrairCombustivel, type MarcaFipe } from "@/lib/veiculos/fipe";
import { encontrarEspecificacao, useEspecificacoesPorModelo } from "@/lib/veiculos/use-especificacoes-por-modelo";
import { MarcaModeloCombobox } from "./marca-modelo-combobox";
import { EspecificacaoMotorFields, type EspecificacaoMotorValues } from "./especificacao-motor-fields";
import { salvarVeiculo, atualizarVeiculo } from "./actions";
import { CrlvImportButton } from "./crlv-import-button";
import type { DadosCrlv } from "@/lib/veiculos/parse-crlv";

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
  // Diesel como padrão — é o único tipo de motor que a empresa testa (opacidade
  // só se aplica a motor diesel), evita ter que digitar em quase todo cadastro.
  const [combustivel, setCombustivel] = useState(veiculo?.combustivel ?? "Diesel");
  const [ano, setAno] = useState(veiculo?.ano?.toString() ?? "");
  const [chassi, setChassi] = useState(veiculo?.chassi ?? "");
  const [renavam, setRenavam] = useState(veiculo?.renavam ?? "");
  const [motor, setMotor] = useState(veiculo?.identificacao_motor ?? "");
  const motorRef = useRef(motor);
  const [marchaLentaMin, setMarchaLentaMin] = useState(especificacao?.marcha_lenta_min?.toString() ?? "");
  const [marchaLentaMax, setMarchaLentaMax] = useState(especificacao?.marcha_lenta_max?.toString() ?? "");
  const [rotacaoCorteMin, setRotacaoCorteMin] = useState(especificacao?.rotacao_corte_min?.toString() ?? "");
  const [rotacaoCorteMax, setRotacaoCorteMax] = useState(especificacao?.rotacao_corte_max?.toString() ?? "");
  const [limiteOpacidade, setLimiteOpacidade] = useState(especificacao?.limite_opacidade?.toString() ?? "");
  // Modelos dessa marca com especificação de motor já confirmada (ANFAVEA
  // ou cadastro manual anterior) — alimenta as sugestões do combobox de
  // "Modelo" (junto com a FIPE) e a tabela de auto-preenchimento abaixo.
  const especificacoesPorModelo = useEspecificacoesPorModelo(marca, tipoAtivo === "veiculo");
  // Mensagem do preenchimento automático por marca/modelo — distinta da mensagem
  // interna do botão "Buscar especificação" (essa vive dentro de EspecificacaoMotorFields).
  const [autoFillMsg, setAutoFillMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    motorRef.current = motor;
  }, [motor]);

  // Preenche motor+limites assim que o modelo digitado/selecionado bate com um
  // já confirmado — só em cadastro novo (edição já tem seus próprios dados) e só
  // se a pessoa ainda não tiver digitado um motor manualmente.
  useEffect(() => {
    if (veiculo || tipoAtivo !== "veiculo" || !modelo.trim() || motorRef.current.trim()) return;
    const espec = encontrarEspecificacao(especificacoesPorModelo, modelo);
    if (!espec) return;

    const timeout = setTimeout(() => {
      setMotor(espec.identificacaoMotor);
      setAutoFillMsg(
        espec.origem === "importado_anfavea"
          ? "Motor e limites preenchidos a partir da tabela oficial da ANFAVEA."
          : "Motor e limites preenchidos a partir de um veículo já cadastrado desse modelo.",
      );
      setMarchaLentaMin(espec.marchaLentaMin?.toString() ?? "");
      setMarchaLentaMax(espec.marchaLentaMax?.toString() ?? "");
      setRotacaoCorteMin(espec.rotacaoCorteMin?.toString() ?? "");
      setRotacaoCorteMax(espec.rotacaoCorteMax?.toString() ?? "");
      setLimiteOpacidade(espec.limiteOpacidade?.toString() ?? "");
    }, 0);
    return () => clearTimeout(timeout);
  }, [modelo, especificacoesPorModelo, veiculo, tipoAtivo]);

  // Combustível costuma vir embutido no nome do modelo da FIPE — preenche sozinho
  // se a pessoa ainda não tiver digitado nada nesse campo.
  function handleModeloChange(valor: string) {
    setModelo(valor);
    const detectado = extrairCombustivel(valor);
    if (detectado) setCombustivel((atual) => atual || detectado);
  }

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

  /** Só sobrescreve o que o e-CRLV trouxe — campo não reconhecido fica como está. */
  function aplicarCrlv(dados: DadosCrlv): string[] {
    const preenchidos: string[] = [];
    if (dados.placa) {
      setIdentificador(dados.placa);
      preenchidos.push("placa");
    }
    if (dados.marca) preenchidos.push("marca");
    if (dados.modelo) {
      handleModeloChange(dados.modelo);
      preenchidos.push("modelo");
    }
    if (dados.ano) {
      setAno(dados.ano);
      preenchidos.push("ano");
    }
    if (dados.combustivel) {
      setCombustivel(dados.combustivel);
      preenchidos.push("combustível");
    }
    if (dados.chassi) {
      setChassi(dados.chassi);
      preenchidos.push("chassi");
    }
    if (dados.renavam) {
      setRenavam(dados.renavam);
      preenchidos.push("renavam");
    }
    if (dados.marca) {
      const marcaCrlv = dados.marca;
      setMarca(marcaCrlv);
      // Mesmo efeito de escolher a marca no combobox: carrega os modelos da FIPE dela.
      buscarMarcasFipe().then((marcas) => {
        setMarcasFipe(marcas);
        const encontrada = marcas.find((m) => m.nome.toLowerCase() === marcaCrlv.toLowerCase());
        if (encontrada) buscarModelosFipe(encontrada).then(setModelosFipe);
      });
    }
    return preenchidos;
  }

  function handleMotorFieldsChange(patch: Partial<EspecificacaoMotorValues>) {
    if (patch.identificacaoMotor !== undefined) setMotor(patch.identificacaoMotor);
    if (patch.marchaLentaMin !== undefined) setMarchaLentaMin(patch.marchaLentaMin);
    if (patch.marchaLentaMax !== undefined) setMarchaLentaMax(patch.marchaLentaMax);
    if (patch.rotacaoCorteMin !== undefined) setRotacaoCorteMin(patch.rotacaoCorteMin);
    if (patch.rotacaoCorteMax !== undefined) setRotacaoCorteMax(patch.rotacaoCorteMax);
    if (patch.limiteOpacidade !== undefined) setLimiteOpacidade(patch.limiteOpacidade);
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

      {tipoAtivo === "veiculo" && <CrlvImportButton onDados={aplicarCrlv} />}

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
              itens={Array.from(new Set([...Object.keys(especificacoesPorModelo), ...modelosFipe]))}
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
              value={chassi}
              onChange={(e) => setChassi(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="renavam">Renavam</Label>
            <Input
              id="renavam"
              name="renavam"
              placeholder="11 dígitos"
              value={renavam}
              onChange={(e) => setRenavam(e.target.value.toUpperCase())}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="patrimonio_cliente">Patrimônio interno do cliente (opcional)</Label>
          <Input id="patrimonio_cliente" name="patrimonio_cliente" defaultValue={veiculo?.patrimonio_cliente ?? ""} />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-neutral-500">
          Opcional — marcha lenta, rotação de corte e limite de opacidade, usados como referência no laudo. Preenche
          sozinho ao escolher um modelo com especificação já confirmada.
        </p>
        {autoFillMsg && <p className="text-xs font-medium text-brand-dark">{autoFillMsg}</p>}
        <EspecificacaoMotorFields
          marca={marca}
          values={{
            identificacaoMotor: motor,
            marchaLentaMin,
            marchaLentaMax,
            rotacaoCorteMin,
            rotacaoCorteMax,
            limiteOpacidade,
          }}
          onChange={handleMotorFieldsChange}
        />
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
