"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTelefone } from "@/lib/utils/mascaras";
import { salvarDadosEmpresa } from "./actions";

type DadosEmpresa = { razao_social: string; cnpj: string; endereco: string; telefone: string };

export function DadosEmpresaForm({ dados }: { dados: DadosEmpresa }) {
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [razaoSocial, setRazaoSocial] = useState(dados.razao_social);
  const [cnpj, setCnpj] = useState(dados.cnpj);
  const [endereco, setEndereco] = useState(dados.endereco);
  const [telefone, setTelefone] = useState(formatTelefone(dados.telefone));

  if (!editando) {
    return (
      <div className="mt-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-neutral-900">Dados da empresa</h2>
        <p className="text-sm text-neutral-500">Aparecem no PDF de orçamento oficial e nas propostas emitidas.</p>

        <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="space-y-1 text-sm text-neutral-700">
            <p className="font-medium text-neutral-900">{dados.razao_social}</p>
            <p>CNPJ: {dados.cnpj}</p>
            <p>{dados.endereco}</p>
            <p>{dados.telefone}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Editar"
            className="text-brand hover:bg-brand/10"
            onClick={() => setEditando(true)}
          >
            <Pencil />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-neutral-900">Dados da empresa</h2>
      <form
        action={(formData) =>
          startTransition(async () => {
            await salvarDadosEmpresa(formData);
            setEditando(false);
          })
        }
        className="mt-4 space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="razao_social">Razão social</Label>
          <Input id="razao_social" name="razao_social" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input id="cnpj" name="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            name="telefone"
            inputMode="numeric"
            value={telefone}
            onChange={(e) => setTelefone(formatTelefone(e.target.value))}
          />
          <p className="text-xs text-neutral-500">
            Esse é o mesmo número usado no cabeçalho, no botão de WhatsApp e no
            &ldquo;Ligar agora&rdquo; do site — muda em qualquer um dos dois lugares
            (aqui ou em Gerenciamento do site → Informações de contato), sempre fica
            igual nos dois.
          </p>
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
            {pending ? "..." : "Salvar"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
