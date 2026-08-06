"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentoInput } from "@/components/documento-input";
import { buscarCnpj } from "@/lib/utils/documento";
import { ClienteExistentePicker } from "./cliente-existente-picker";

function CamposVeiculo({
  tipoAtivo,
  setTipoAtivo,
  identificador,
  setIdentificador,
}: {
  tipoAtivo: "veiculo" | "maquina_equipamento";
  setTipoAtivo: (v: "veiculo" | "maquina_equipamento") => void;
  identificador: string;
  setIdentificador: (v: string) => void;
}) {
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
          <Input id="veiculo_marca" name="veiculo_marca" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="veiculo_modelo">Modelo</Label>
          <Input id="veiculo_modelo" name="veiculo_modelo" />
        </div>
      </div>

      {tipoAtivo === "veiculo" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="veiculo_chassi">Chassi (opcional)</Label>
            <Input id="veiculo_chassi" name="veiculo_chassi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="veiculo_renavam">Renavam (opcional)</Label>
            <Input id="veiculo_renavam" name="veiculo_renavam" />
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Detalhes técnicos do motor (rotação, limite de opacidade) ficam pro cadastro completo do veículo, depois.
      </p>
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
              <DocumentoInput id="cliente_cnpj_cpf" name="cliente_cnpj_cpf" tipo={tipo} value={cnpjCpf} onChange={setCnpjCpf} className="flex-1" />
              {tipo === "pj" && (
                <Button type="button" variant="outline" size="sm" disabled={buscando} onClick={handleBuscarCnpj}>
                  {buscando ? "Buscando..." : "Buscar"}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_nome">{tipo === "pj" ? "Razão social" : "Nome completo"}</Label>
            <Input id="cliente_nome" name="cliente_nome" value={nome} onChange={(e) => setNome(e.target.value)} />
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
          />
        </>
      )}
    </div>
  );
}
