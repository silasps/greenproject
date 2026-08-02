"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ErrorModal } from "@/components/error-modal";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { isRedirectError } from "@/lib/utils/is-redirect-error";
import { criarFuncao, atualizarFuncao } from "../actions";

const NIVEIS: Role[] = ["tecnico", "escritorio", "gerencia"];

type Funcao = { id: string; nome: string; descricao: string | null; nivel_acesso: Role };

export function FuncaoForm({ funcao }: { funcao?: Funcao }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState(funcao?.nome ?? "");
  const action = funcao ? atualizarFuncao : criarFuncao;
  const cancelHref = funcao ? `/painel/dp/funcoes/${funcao.id}` : "/painel/dp/funcoes";

  async function handleSubmit(formData: FormData) {
    setErro(null);
    try {
      await action(formData);
    } catch (e) {
      if (isRedirectError(e)) throw e;
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a função.");
    }
  }

  function fecharErro() {
    setErro(null);
    const input = document.getElementById("nome") as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }

  return (
    <form action={(formData) => startTransition(() => handleSubmit(formData))} className="mt-6 mx-auto max-w-lg space-y-4">
      {funcao && <input type="hidden" name="id" value={funcao.id} />}

      <div className="space-y-2">
        <Label htmlFor="nome">Nome do cargo</Label>
        <Input
          id="nome"
          name="nome"
          required
          placeholder="Ex.: Técnico de Campo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Nível de acesso</Label>
        <Select
          name="nivel_acesso"
          defaultValue={funcao?.nivel_acesso ?? "tecnico"}
          items={Object.fromEntries(NIVEIS.map((n) => [n, ROLE_LABELS[n]]))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {NIVEIS.map((n) => (
              <SelectItem key={n} value={n}>
                {ROLE_LABELS[n]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-neutral-500">
          Toda pessoa cadastrada com esta função recebe este nível de acesso no sistema.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Descrição das responsabilidades</Label>
        <RichTextEditor name="descricao" defaultValue={funcao?.descricao ?? ""} />
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <ConfirmLeaveButton to={cancelHref} label="Cancelar" variant="outline" />
      </div>
      <ErrorModal erro={erro} onClose={fecharErro} />
    </form>
  );
}
