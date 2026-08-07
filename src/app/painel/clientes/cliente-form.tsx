"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buscarCnpj } from "@/lib/utils/documento";
import { DocumentoInput } from "@/components/documento-input";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ErrorModal } from "@/components/error-modal";
import { isRedirectError } from "@/lib/utils/is-redirect-error";
import { salvarCliente } from "./actions";

type Cliente = {
  id: string;
  tipo: "pj" | "pf" | null;
  cnpj_cpf: string | null;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
};

export function ClienteForm({ cliente, cancelHref }: { cliente?: Cliente; cancelHref: string }) {
  const [tipo, setTipo] = useState<"pj" | "pf">(cliente?.tipo ?? "pj");
  const [cnpjCpf, setCnpjCpf] = useState(cliente?.cnpj_cpf ?? "");
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [endereco, setEndereco] = useState(cliente?.endereco ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentoValido, setDocumentoValido] = useState(true);
  const [pending, startTransition] = useTransition();

  async function handleBuscarCnpj() {
    setBuscando(true);
    setError(null);
    try {
      const dados = await buscarCnpj(cnpjCpf);
      if (!dados) {
        setError("CNPJ não encontrado.");
        return;
      }
      setNome(dados.nome);
      setEndereco(dados.endereco);
      if (dados.telefone) setTelefone(dados.telefone);
    } finally {
      setBuscando(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await salvarCliente(formData);
    } catch (e) {
      if (isRedirectError(e)) throw e;
      setError(e instanceof Error ? e.message : "Não foi possível salvar o cliente.");
    }
  }

  return (
    <form
      action={(formData) => startTransition(() => handleSubmit(formData))}
      className="mt-6 mx-auto max-w-lg space-y-4"
    >
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      {cliente && <input type="hidden" name="voltar" value={cancelHref} />}

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="tipo" value="pj" checked={tipo === "pj"} onChange={() => setTipo("pj")} />
          Empresa (CNPJ)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="tipo" value="pf" checked={tipo === "pf"} onChange={() => setTipo("pf")} />
          Pessoa física (CPF)
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cnpj_cpf">{tipo === "pj" ? "CNPJ" : "CPF"}</Label>
        <div className="flex gap-2">
          <DocumentoInput
            id="cnpj_cpf"
            name="cnpj_cpf"
            tipo={tipo}
            required
            value={cnpjCpf}
            onChange={setCnpjCpf}
            onValidChange={setDocumentoValido}
            className="flex-1"
          />
          {tipo === "pj" && (
            <Button type="button" variant="outline" disabled={buscando} onClick={handleBuscarCnpj}>
              {buscando ? "Buscando..." : "Buscar"}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome">{tipo === "pj" ? "Razão social" : "Nome completo"}</Label>
        <Input id="nome" name="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Input id="endereco" name="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={cliente?.email ?? ""} />
        </div>
      </div>

      <ErrorModal erro={error} onClose={() => setError(null)} />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !documentoValido} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar cliente"}
        </Button>
        <ConfirmLeaveButton to={cancelHref} label="Cancelar" variant="outline" />
      </div>
    </form>
  );
}
