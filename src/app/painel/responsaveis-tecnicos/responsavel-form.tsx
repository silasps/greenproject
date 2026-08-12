"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { FileDropInput } from "@/components/file-drop-input";
import { salvarResponsavelTecnico } from "./actions";

type Usuario = { id: string; nome: string };

export function ResponsavelForm({ cancelHref, usuarios }: { cancelHref: string; usuarios: Usuario[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => salvarResponsavelTecnico(formData))}
      className="mt-6 mx-auto max-w-lg space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="formacao">Formação</Label>
        <Input id="formacao" name="formacao" placeholder="Engenheiro Mecânico" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="registro_conselho">Registro no conselho</Label>
        <Input id="registro_conselho" name="registro_conselho" placeholder="CREA-MG 211875D" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contato">Contato</Label>
        <Input id="contato" name="contato" />
      </div>
      <div className="space-y-2">
        <Label>Conta de acesso vinculada</Label>
        <Select name="usuario_id" items={{ none: "Nenhuma (responsável externo, sem login)", ...Object.fromEntries(usuarios.map((u) => [u.id, u.nome])) }} defaultValue="none">
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma (responsável externo, sem login)</SelectItem>
            {usuarios.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-neutral-500">
          Se essa pessoa faz login no sistema, vincule a conta — é o que permite liberar laudo aparecer pra ela e já vir com o próprio nome selecionado.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assinatura">Imagem da assinatura</Label>
        <FileDropInput id="assinatura" name="assinatura" accept="image/*" label="Clique para enviar a imagem da assinatura" />
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <ConfirmLeaveButton to={cancelHref} label="Cancelar" variant="outline" />
      </div>
    </form>
  );
}
