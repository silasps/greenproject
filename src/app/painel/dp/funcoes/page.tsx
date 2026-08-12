import Link from "next/link";
import { Briefcase, HardHat, Building2 } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FuncoesLista } from "./funcoes-lista";
import { NovaFuncaoButton } from "./nova-funcao-button";

export default async function FuncoesPage() {
  await requireRole(["gerencia"]);
  const supabase = await createClient();

  const [{ data: funcoes }, { data: pessoas }] = await Promise.all([
    supabase.from("funcoes").select("id, nome, descricao, nivel_acesso").order("nome"),
    supabase.from("usuarios_perfis").select("funcao_id"),
  ]);

  const pessoasPorFuncao = new Map<string, number>();
  for (const p of pessoas ?? []) {
    if (!p.funcao_id) continue;
    pessoasPorFuncao.set(p.funcao_id, (pessoasPorFuncao.get(p.funcao_id) ?? 0) + 1);
  }

  const linhas = (funcoes ?? []).map((f) => ({ ...f, pessoas: pessoasPorFuncao.get(f.id) ?? 0 }));
  const operacionais = linhas.filter((f) => f.nivel_acesso === "tecnico").length;
  const administrativas = linhas.length - operacionais;

  return (
    <div>
      <Link href="/painel/dp" className="text-sm text-neutral-500 hover:underline">
        ← Voltar
      </Link>
      <div className="mt-2 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Funções</h1>
          <p className="mt-1 text-neutral-600">Cargos operacionais e administrativos e quantas pessoas ocupam cada um.</p>
        </div>
        <NovaFuncaoButton />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Briefcase className="size-4" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Total de funções</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-neutral-900 tabular-nums">{linhas.length}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <HardHat className="size-4" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Operacionais</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-neutral-900 tabular-nums">{operacionais}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <Building2 className="size-4" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Administrativas</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-neutral-900 tabular-nums">{administrativas}</p>
        </div>
      </div>

      <FuncoesLista funcoes={linhas} />
    </div>
  );
}
