"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PessoaForm } from "./pessoa-form";
import { KpisPessoaForm } from "./kpis-pessoa-form";
import type { Role } from "@/lib/auth/permissions";

type Pessoa = {
  id: string;
  nome: string;
  role: Role;
  funcao_id: string | null;
  cpf: string | null;
  telefone: string | null;
  data_admissao: string | null;
  acesso_sistema: boolean;
};
type Funcao = { id: string; nome: string };

export function EditarPessoaButton({
  pessoa,
  funcoes,
  nivelAcessoCargo,
  overridesCargo,
  overridesPessoa,
}: {
  pessoa: Pessoa;
  funcoes: Funcao[];
  nivelAcessoCargo: Role;
  overridesCargo: Record<string, boolean>;
  overridesPessoa: Record<string, boolean>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Editar ${pessoa.nome}`}
        title="Editar"
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
      >
        <Pencil className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar pessoa</DialogTitle>
          </DialogHeader>
          {open && (
            <>
              <PessoaForm
                pessoa={pessoa}
                funcoes={funcoes}
                onCancelar={() => setOpen(false)}
                onSucesso={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
              <KpisPessoaForm
                usuarioId={pessoa.id}
                nivelAcessoCargo={nivelAcessoCargo}
                overridesCargo={overridesCargo}
                overridesPessoa={overridesPessoa}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
