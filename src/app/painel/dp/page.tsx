import Link from "next/link";
import { Users, UserCheck, UserX } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DpLista } from "./dp-lista";

export default async function DpPage() {
  await requireRole(["gerencia"]);
  const supabase = await createClient();

  const { data: pessoas } = await supabase
    .from("usuarios_perfis")
    .select("id, nome, role, acesso_sistema, funcoes(nome)")
    .order("nome");

  const linhas = pessoas ?? [];
  const ativos = linhas.filter((p) => p.acesso_sistema).length;
  const inativos = linhas.length - ativos;

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Departamento Pessoal</h1>
          <p className="mt-1 text-neutral-600">Pessoas cadastradas no sistema, ativas e inativas.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/dp/funcoes"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold whitespace-nowrap text-neutral-700 hover:bg-neutral-50"
          >
            Funções
          </Link>
          <Link
            href="/painel/dp/novo"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-brand-dark"
          >
            Nova pessoa
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Users className="size-4" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Total cadastrado</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-neutral-900 tabular-nums">{linhas.length}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <UserCheck className="size-4" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Ativos</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-neutral-900 tabular-nums">{ativos}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <UserX className="size-4" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Inativos</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-neutral-900 tabular-nums">{inativos}</p>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DpLista pessoas={linhas as any} />
    </div>
  );
}
