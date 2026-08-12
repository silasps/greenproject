"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Search } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { richTextClasses } from "@/components/rich-text-editor";
import { EditarFuncaoButton } from "./editar-funcao-button";

export type FuncaoLinha = {
  id: string;
  nome: string;
  descricao: string | null;
  nivel_acesso: string;
  pessoas: number;
};

export function FuncoesLista({ funcoes }: { funcoes: FuncaoLinha[] }) {
  const [busca, setBusca] = useState("");

  const filtradas = funcoes.filter((f) => f.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 bg-neutral-50 p-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar função..."
            className="h-11 w-full rounded-xl border border-neutral-200 bg-white pr-4 pl-10 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
          />
        </div>
      </div>

      <div className="divide-y divide-neutral-100">
        {filtradas.length === 0 && (
          <p className="p-6 text-sm text-neutral-500">Nenhuma função encontrada.</p>
        )}
        {filtradas.map((f) => (
          <div
            key={f.id}
            className="group relative flex flex-col items-start justify-between gap-4 p-5 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-center"
          >
            <Link href={`/painel/dp/funcoes/${f.id}`} className="absolute inset-0 z-0" aria-label={f.nome} />
            <div className="flex min-w-0 items-start gap-4">
              <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Briefcase className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900">{f.nome}</p>
                <p className="mt-0.5 text-sm text-neutral-500">{ROLE_LABELS[f.nivel_acesso as Role]}</p>
                {f.descricao && (
                  <div
                    className={`mt-1 line-clamp-1 overflow-hidden text-sm text-neutral-400 ${richTextClasses}`}
                    dangerouslySetInnerHTML={{ __html: f.descricao }}
                  />
                )}
              </div>
            </div>
            <div className="relative z-10 flex shrink-0 items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold text-neutral-900 tabular-nums">{f.pessoas}</span>
                <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
                  {f.pessoas === 1 ? "pessoa" : "pessoas"}
                </span>
              </div>
              <EditarFuncaoButton
                iconOnly
                funcao={{ id: f.id, nome: f.nome, descricao: f.descricao, nivel_acesso: f.nivel_acesso as Role }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
