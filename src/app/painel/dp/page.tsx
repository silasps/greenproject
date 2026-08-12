import Link from "next/link";
import { Users, UserCheck, UserX } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DpLista } from "./dp-lista";

export default async function DpPage() {
  await requireRole(["gerencia"]);
  const supabase = await createClient();

  const [{ data: pessoas }, { data: funcoes }, { data: usuariosKpis }, { data: funcoesKpis }] = await Promise.all([
    supabase
      .from("usuarios_perfis")
      .select("id, nome, role, funcao_id, cpf, telefone, data_admissao, acesso_sistema, funcoes(nome)")
      .order("nome"),
    supabase.from("funcoes").select("id, nome, nivel_acesso").order("nome"),
    supabase.from("usuarios_kpis").select("usuario_id, kpi_secao, visivel"),
    supabase.from("funcoes_kpis").select("funcao_id, kpi_secao, visivel"),
  ]);

  const linhas = pessoas ?? [];
  const ativos = linhas.filter((p) => p.acesso_sistema).length;
  const inativos = linhas.length - ativos;

  const overridesCargoPorFuncao: Record<string, Record<string, boolean>> = {};
  for (const r of funcoesKpis ?? []) {
    (overridesCargoPorFuncao[r.funcao_id] ??= {})[r.kpi_secao] = r.visivel;
  }
  const overridesPorPessoa: Record<string, Record<string, boolean>> = {};
  for (const r of usuariosKpis ?? []) {
    (overridesPorPessoa[r.usuario_id] ??= {})[r.kpi_secao] = r.visivel;
  }

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

      <DpLista
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pessoas={linhas as any}
        funcoes={funcoes ?? []}
        overridesCargoPorFuncao={overridesCargoPorFuncao}
        overridesPorPessoa={overridesPorPessoa}
      />
    </div>
  );
}
