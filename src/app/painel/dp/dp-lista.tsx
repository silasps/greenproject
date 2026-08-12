"use client";

import { useState } from "react";
import { Search, CheckCircle2, User } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { EditarPessoaButton } from "./editar-pessoa-button";

export type PessoaLinha = {
  id: string;
  nome: string;
  role: Role;
  funcao_id: string | null;
  cpf: string | null;
  telefone: string | null;
  data_admissao: string | null;
  acesso_sistema: boolean;
  funcoes: { nome: string } | null;
};
type Funcao = { id: string; nome: string; nivel_acesso: Role };

function ListaPessoas({
  titulo,
  pessoas,
  ativos,
  funcoes,
  overridesCargoPorFuncao,
  overridesPorPessoa,
}: {
  titulo: string;
  pessoas: PessoaLinha[];
  ativos: boolean;
  funcoes: Funcao[];
  overridesCargoPorFuncao: Record<string, Record<string, boolean>>;
  overridesPorPessoa: Record<string, Record<string, boolean>>;
}) {
  if (pessoas.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
        {titulo}
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">{pessoas.length}</span>
      </h2>
      <div className={`mt-2 space-y-3 ${ativos ? "" : "opacity-80"}`}>
        {pessoas.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <User className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-neutral-900">{p.nome}</p>
                <p className="text-sm text-neutral-500">
                  {ROLE_LABELS[p.role]} {p.funcoes?.nome && `· ${p.funcoes.nome}`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  ativos ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {ativos ? <CheckCircle2 className="size-3.5" /> : <span className="size-1.5 rounded-full bg-neutral-400" />}
                {ativos ? "Ativo" : "Inativo"}
              </span>
              <EditarPessoaButton
                pessoa={p}
                funcoes={funcoes}
                nivelAcessoCargo={(p.funcao_id && funcoes.find((f) => f.id === p.funcao_id)?.nivel_acesso) || p.role}
                overridesCargo={(p.funcao_id && overridesCargoPorFuncao[p.funcao_id]) || {}}
                overridesPessoa={overridesPorPessoa[p.id] ?? {}}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DpLista({
  pessoas,
  funcoes,
  overridesCargoPorFuncao,
  overridesPorPessoa,
}: {
  pessoas: PessoaLinha[];
  funcoes: Funcao[];
  overridesCargoPorFuncao: Record<string, Record<string, boolean>>;
  overridesPorPessoa: Record<string, Record<string, boolean>>;
}) {
  const [busca, setBusca] = useState("");

  const filtradas = pessoas.filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()));
  const ativos = filtradas.filter((p) => p.acesso_sistema);
  const inativos = filtradas.filter((p) => !p.acesso_sistema);

  return (
    <div>
      <div className="relative mt-6 w-full sm:w-80">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pessoa..."
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pr-4 pl-10 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
        />
      </div>

      {filtradas.length === 0 && <p className="mt-6 text-sm text-neutral-500">Nenhuma pessoa encontrada.</p>}

      <ListaPessoas
        titulo="Ativos"
        pessoas={ativos}
        ativos
        funcoes={funcoes}
        overridesCargoPorFuncao={overridesCargoPorFuncao}
        overridesPorPessoa={overridesPorPessoa}
      />
      <ListaPessoas
        titulo="Inativos"
        pessoas={inativos}
        ativos={false}
        funcoes={funcoes}
        overridesCargoPorFuncao={overridesCargoPorFuncao}
        overridesPorPessoa={overridesPorPessoa}
      />
    </div>
  );
}
