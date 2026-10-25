"use client";

import { useEffect, useRef, useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentoInput } from "@/components/documento-input";
import { buscarCnpj, formatCpfCnpj, onlyDigits } from "@/lib/utils/documento";
import { buscarMarcasFipe, buscarModelosFipe, type MarcaFipe } from "@/lib/veiculos/fipe";
import { encontrarEspecificacao, useEspecificacoesPorModelo } from "@/lib/veiculos/use-especificacoes-por-modelo";
import { MarcaModeloCombobox } from "../clientes/[id]/veiculos/marca-modelo-combobox";
import { EspecificacaoMotorFields, type EspecificacaoMotorValues } from "../clientes/[id]/veiculos/especificacao-motor-fields";
import { CrlvImportButton } from "../clientes/[id]/veiculos/crlv-import-button";
import type { DadosCrlv } from "@/lib/veiculos/parse-crlv";
import { ClienteExistentePicker } from "./cliente-existente-picker";

function CamposVeiculo({
  tipoAtivo,
  setTipoAtivo,
  identificador,
  setIdentificador,
  onProprietario,
}: {
  tipoAtivo: "veiculo" | "maquina_equipamento";
  setTipoAtivo: (v: "veiculo" | "maquina_equipamento") => void;
  identificador: string;
  setIdentificador: (v: string) => void;
  /** Só no "Cadastrar novo": dono do veículo no e-CRLV vira o cliente. Devolve se aplicou. */
  onProprietario?: (nome: string | null, documento: string) => boolean;
}) {
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [chassi, setChassi] = useState("");
  const [renavam, setRenavam] = useState("");
  const [marcasFipe, setMarcasFipe] = useState<MarcaFipe[]>([]);
  const [modelosFipe, setModelosFipe] = useState<string[]>([]);
  const [motor, setMotor] = useState("");
  const motorRef = useRef(motor);
  const [marchaLentaMin, setMarchaLentaMin] = useState("");
  const [marchaLentaMax, setMarchaLentaMax] = useState("");
  const [rotacaoCorteMin, setRotacaoCorteMin] = useState("");
  const [rotacaoCorteMax, setRotacaoCorteMax] = useState("");
  const [limiteOpacidade, setLimiteOpacidade] = useState("");
  const [autoFillMsg, setAutoFillMsg] = useState<string | null>(null);

  // Modelos dessa marca com especificação de motor já confirmada (ANFAVEA ou
  // cadastro manual anterior) — mesmo mecanismo do cadastro completo de
  // veículo (`VeiculoForm`), só que aqui sempre é cadastro novo.
  const especificacoesPorModelo = useEspecificacoesPorModelo(marca, tipoAtivo === "veiculo");

  useEffect(() => {
    motorRef.current = motor;
  }, [motor]);

  // Preenche motor+limites assim que o modelo digitado/selecionado bate com um
  // já confirmado — só se a pessoa ainda não tiver digitado um motor manualmente.
  useEffect(() => {
    if (tipoAtivo !== "veiculo" || !modelo.trim() || motorRef.current.trim()) return;
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
  }, [modelo, especificacoesPorModelo, tipoAtivo]);

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
    if (dados.proprietarioDocumento && onProprietario?.(dados.proprietarioNome, dados.proprietarioDocumento)) {
      preenchidos.push("cliente (nome e CPF/CNPJ do proprietário)");
    }
    if (dados.placa) {
      setIdentificador(dados.placa);
      preenchidos.push("placa");
    }
    if (dados.marca) {
      const marcaCrlv = dados.marca;
      setMarca(marcaCrlv);
      preenchidos.push("marca");
      // Mesmo efeito de escolher a marca no combobox: carrega os modelos da FIPE dela.
      buscarMarcasFipe().then((marcas) => {
        setMarcasFipe(marcas);
        const encontrada = marcas.find((m) => m.nome.toLowerCase() === marcaCrlv.toLowerCase());
        if (encontrada) buscarModelosFipe(encontrada).then(setModelosFipe);
      });
    }
    if (dados.modelo) {
      setModelo(dados.modelo);
      preenchidos.push("modelo");
    }
    if (dados.chassi) {
      setChassi(dados.chassi);
      preenchidos.push("chassi");
    }
    if (dados.renavam) {
      setRenavam(dados.renavam);
      preenchidos.push("renavam");
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

  return (
    <>
      <p className="border-t border-neutral-200 pt-2 text-sm font-semibold text-neutral-700">Veículo/equipamento</p>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="veiculo_tipo_ativo"
            value="veiculo"
            checked={tipoAtivo === "veiculo"}
            onChange={() => setTipoAtivo("veiculo")}
          />
          Veículo
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="veiculo_tipo_ativo"
            value="maquina_equipamento"
            checked={tipoAtivo === "maquina_equipamento"}
            onChange={() => setTipoAtivo("maquina_equipamento")}
          />
          Máquina/Equipamento
        </label>
      </div>

      {tipoAtivo === "veiculo" && <CrlvImportButton onDados={aplicarCrlv} />}

      <div className="space-y-2">
        <Label htmlFor="veiculo_identificador">{tipoAtivo === "veiculo" ? "Placa" : "Número de série"}</Label>
        <Input
          id="veiculo_identificador"
          name="veiculo_identificador"
          required
          value={identificador}
          onChange={(e) => setIdentificador(tipoAtivo === "veiculo" ? e.target.value.toUpperCase() : e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="veiculo_marca">Marca</Label>
          {tipoAtivo === "veiculo" ? (
            <MarcaModeloCombobox
              id="veiculo_marca"
              name="veiculo_marca"
              value={marca}
              onValueChange={handleMarcaChange}
              itens={marcasFipe.map((m) => m.nome)}
              placeholder="Digite para buscar (ex: Mercedes-Benz)"
              onFocus={carregarMarcasFipe}
            />
          ) : (
            <Input id="veiculo_marca" name="veiculo_marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="veiculo_modelo">Modelo</Label>
          {tipoAtivo === "veiculo" ? (
            <MarcaModeloCombobox
              id="veiculo_modelo"
              name="veiculo_modelo"
              value={modelo}
              onValueChange={setModelo}
              itens={Array.from(new Set([...Object.keys(especificacoesPorModelo), ...modelosFipe]))}
              placeholder={modelosFipe.length > 0 ? "Digite para buscar" : "Selecione a marca primeiro"}
            />
          ) : (
            <Input id="veiculo_modelo" name="veiculo_modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
          )}
        </div>
      </div>

      {tipoAtivo === "veiculo" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="veiculo_chassi">Chassi (opcional)</Label>
            <Input
              id="veiculo_chassi"
              name="veiculo_chassi"
              value={chassi}
              onChange={(e) => setChassi(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="veiculo_renavam">Renavam (opcional)</Label>
            <Input
              id="veiculo_renavam"
              name="veiculo_renavam"
              inputMode="numeric"
              value={renavam}
              onChange={(e) => setRenavam(onlyDigits(e.target.value))}
            />
          </div>
        </div>
      )}

      {tipoAtivo === "veiculo" && (
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
            idPrefix="veiculo_novo_"
          />
        </div>
      )}
    </>
  );
}

/**
 * Cadastro de cliente + veículo direto no orçamento — opcional: se a pessoa
 * não preencher agora, o cliente fica "pendente" (fluxo já existente) e
 * qualquer um da equipe completa depois pela tela do teste. Se o cliente já
 * existe, busca em vez de criar de novo (evita duplicar CNPJ/CPF) e, se o
 * veículo também já existe, é um reteste — pula os dois cadastros.
 */
export function CadastroClienteVeiculo({
  nomeSugerido,
  clienteIdPreSelecionado,
  veiculoIdPreSelecionado,
}: {
  nomeSugerido: string;
  clienteIdPreSelecionado?: string;
  veiculoIdPreSelecionado?: string;
}) {
  const [ativo, setAtivo] = useState(Boolean(clienteIdPreSelecionado));
  const [modo, setModo] = useState<"novo" | "existente">(clienteIdPreSelecionado ? "existente" : "novo");

  // Cadastro de cliente novo
  const [tipo, setTipo] = useState<"pj" | "pf">("pj");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [email, setEmail] = useState("");
  const [buscando, setBuscando] = useState(false);

  // Veículo — usado tanto no cadastro novo quanto no "cliente existente + veículo novo"
  const [tipoAtivo, setTipoAtivo] = useState<"veiculo" | "maquina_equipamento">("veiculo");
  const [identificador, setIdentificador] = useState("");
  const [veiculoNovoParaExistente, setVeiculoNovoParaExistente] = useState(false);

  /** Dono do veículo no e-CRLV vira o cliente — só se o CNPJ/CPF ainda estiver vazio (não atropela o que foi digitado). */
  function aplicarProprietario(nomeDono: string | null, documento: string): boolean {
    if (onlyDigits(cnpjCpf)) return false;
    setTipo(documento.length === 14 ? "pj" : "pf");
    setCnpjCpf(formatCpfCnpj(documento));
    if (nomeDono) setNome(nomeDono);
    return true;
  }

  async function handleBuscarCnpj() {
    setBuscando(true);
    try {
      const dados = await buscarCnpj(cnpjCpf);
      if (dados) {
        setNome(dados.nome);
        setEndereco(dados.endereco);
      }
    } finally {
      setBuscando(false);
    }
  }

  if (!ativo) {
    return (
      <button
        type="button"
        onClick={() => {
          setAtivo(true);
          setNome((atual) => atual || nomeSugerido);
        }}
        className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
      >
        <Building2 className="size-3.5" />
        Cadastrar cliente e veículo agora (opcional)
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      {modo === "novo" && <input type="hidden" name="cadastro_cliente" value="on" />}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-700">Cadastro do cliente</p>
        <button type="button" onClick={() => setAtivo(false)} className="text-xs text-neutral-400 hover:underline">
          Deixar pra depois
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setModo("novo")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${modo === "novo" ? "bg-brand/15 text-brand" : "bg-neutral-200 text-neutral-500"}`}
        >
          Cadastrar novo
        </button>
        <button
          type="button"
          onClick={() => setModo("existente")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${modo === "existente" ? "bg-brand/15 text-brand" : "bg-neutral-200 text-neutral-500"}`}
        >
          Já é cliente
        </button>
      </div>

      {modo === "existente" && (
        <>
          <ClienteExistentePicker
            clienteIdInicial={clienteIdPreSelecionado}
            veiculoIdInicial={veiculoIdPreSelecionado}
            onVeiculoNovo={setVeiculoNovoParaExistente}
          />
          {veiculoNovoParaExistente && (
            <CamposVeiculo
              tipoAtivo={tipoAtivo}
              setTipoAtivo={setTipoAtivo}
              identificador={identificador}
              setIdentificador={setIdentificador}
            />
          )}
        </>
      )}

      {modo === "novo" && (
        <>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="cliente_tipo" value="pj" checked={tipo === "pj"} onChange={() => setTipo("pj")} />
              Empresa (CNPJ)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="cliente_tipo" value="pf" checked={tipo === "pf"} onChange={() => setTipo("pf")} />
              Pessoa física (CPF)
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_cnpj_cpf">{tipo === "pj" ? "CNPJ" : "CPF"}</Label>
            <div className="flex gap-2">
              {/* Obrigatórios com o cadastro aberto: sem documento+nome o servidor descarta o
                  cadastro inteiro (inclusive o veículo) e o cliente fica "pendente" sem aviso. */}
              <DocumentoInput id="cliente_cnpj_cpf" name="cliente_cnpj_cpf" tipo={tipo} value={cnpjCpf} onChange={setCnpjCpf} required className="flex-1" />
              {tipo === "pj" && (
                <Button type="button" variant="outline" size="sm" disabled={buscando} onClick={handleBuscarCnpj}>
                  {buscando ? "Buscando..." : "Buscar"}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_nome">{tipo === "pj" ? "Razão social" : "Nome completo"}</Label>
            <Input id="cliente_nome" name="cliente_nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cliente_endereco">Endereço</Label>
              <Input id="cliente_endereco" name="cliente_endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente_email">E-mail</Label>
              <Input id="cliente_email" name="cliente_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <CamposVeiculo
            tipoAtivo={tipoAtivo}
            setTipoAtivo={setTipoAtivo}
            identificador={identificador}
            setIdentificador={setIdentificador}
            onProprietario={aplicarProprietario}
          />
        </>
      )}
    </div>
  );
}
