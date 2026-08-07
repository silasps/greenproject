import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { diasRestantes } from "@/lib/laudo/validade";
import { TestesListaCliente, type LinhaTeste } from "./testes-lista-cliente";
import { NovoTesteButton } from "./novo-teste-button";

export default async function TestesPage() {
  await requireRole(["escritorio", "gerencia"]);
  const supabase = await createClient();

  const [{ data }, { data: dadosEmpresa }, { data: validades }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id, data_hora, nome_contato, clientes(nome), veiculos_maquinas(identificador), testes_opacidade(status, resultado, laudos(emitido_em))",
      )
      .eq("tipo", "teste_opacidade")
      .neq("status", "cancelado")
      .order("data_hora", { ascending: true }),
    supabase.from("dados_empresa").select("dias_alerta_vencimento").single(),
    supabase.from("veiculos_validade").select("validade"),
  ]);

  const linhas = (data ?? []) as unknown as LinhaTeste[];
  const limiar = Math.max(...(dadosEmpresa?.dias_alerta_vencimento ?? [60]));
  const vencendo = (validades ?? []).filter((v) => diasRestantes(v.validade) <= limiar).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Testes de opacidade</h1>
        <div className="flex items-center gap-3">
          {vencendo > 0 && (
            <Link
              href="/painel/testes/vencendo"
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 shadow-sm hover:border-neutral-300"
            >
              <span className="text-base font-bold tabular-nums text-amber-700">{vencendo}</span>
              <span className="text-xs font-medium text-neutral-500">vencendo</span>
            </Link>
          )}
          <NovoTesteButton />
        </div>
      </div>

      <TestesListaCliente linhas={linhas} />
    </div>
  );
}
