"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { CriarModal } from "../agenda/criar-modal";

/** Botão "+" da lista de Testes — abre o mesmo modal de criação da Agenda, mas travado em "Teste" (sem a opção Evento). */
export function NovoTesteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Novo teste"
        title="Novo teste"
        className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        <Plus className="size-4" />
        Novo teste
      </button>
      <CriarModal
        open={open}
        onOpenChange={setOpen}
        podeCriarTeste
        apenasTeste
        onSucesso={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
