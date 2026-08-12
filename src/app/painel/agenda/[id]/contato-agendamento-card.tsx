"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { User, Pencil } from "lucide-react";
import { formatTelefone } from "@/lib/utils/mascaras";
import { atualizarContatoAgendamento } from "../actions";

/** Mesmo visual do Cartao de page.tsx (não exportado de lá) — cabeçalho com ícone/título, corpo abaixo. */
export function ContatoAgendamentoCard({
  agendamentoId,
  nomeContato,
  telefoneContato,
  whatsappContato,
  podeEditar,
  clientePendente,
  hrefEditarCliente,
}: {
  agendamentoId: string;
  nomeContato: string;
  telefoneContato: string | null;
  whatsappContato: string | null;
  podeEditar: boolean;
  clientePendente: boolean;
  hrefEditarCliente?: string;
}) {
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState(nomeContato);
  const [telefone, setTelefone] = useState(formatTelefone(telefoneContato ?? ""));
  const [whatsapp, setWhatsapp] = useState(formatTelefone(whatsappContato ?? ""));

  function cancelar() {
    setEditando(false);
    setErro(null);
    setNome(nomeContato);
    setTelefone(formatTelefone(telefoneContato ?? ""));
    setWhatsapp(formatTelefone(whatsappContato ?? ""));
  }

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        await atualizarContatoAgendamento(agendamentoId, formData);
        setEditando(false);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          <User className="size-4 text-brand" />
          Contato
        </div>
        {podeEditar && !editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            aria-label="Editar contato"
            className="rounded p-1 text-brand hover:bg-brand/10"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>

      {editando ? (
        <form action={handleSubmit} className="mt-3 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600" htmlFor="nome_contato">
              Nome
            </label>
            <input
              id="nome_contato"
              name="nome_contato"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600" htmlFor="telefone_contato">
                Telefone
              </label>
              <input
                id="telefone_contato"
                name="telefone_contato"
                inputMode="numeric"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600" htmlFor="whatsapp_contato">
                WhatsApp
              </label>
              <input
                id="whatsapp_contato"
                name="whatsapp_contato"
                inputMode="numeric"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatTelefone(e.target.value))}
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-neutral-400">Preencha telefone ou WhatsApp (pelo menos um dos dois).</p>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={cancelar}
              className="rounded-full px-4 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-2 text-base font-medium text-neutral-900">
            {nomeContato} · {telefoneContato}
          </p>
          {clientePendente && hrefEditarCliente && (
            <Link href={hrefEditarCliente} className="mt-2 inline-block text-sm text-brand hover:underline">
              Completar cadastro do cliente (CNPJ/CPF) →
            </Link>
          )}
        </>
      )}
    </div>
  );
}
