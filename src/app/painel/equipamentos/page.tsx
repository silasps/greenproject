import Link from "next/link";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateBr } from "@/lib/utils/data";

export default async function EquipamentosPage() {
  await requireArea("equipamentos");
  const supabase = await createClient();
  const { data: equipamentos } = await supabase
    .from("equipamentos_teste")
    .select("id, tipo, modelo, numero_serie, validade")
    .order("modelo");

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Equipamentos de teste</h1>
        <Link href="/painel/equipamentos/novo" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Novo equipamento
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {equipamentos?.length === 0 && <p className="text-sm text-neutral-500">Nenhum equipamento cadastrado.</p>}
        {equipamentos?.map((eq) => {
          const vencido = eq.validade && eq.validade < hoje;
          return (
            <Link
              key={eq.id}
              href={`/painel/equipamentos/${eq.id}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50"
            >
              <div>
                <p className="font-medium text-neutral-900">
                  {eq.modelo} · {eq.numero_serie}
                </p>
                <p className="text-sm text-neutral-500">
                  {eq.tipo === "opacimetro" ? "Opacímetro" : "Tacômetro"}
                </p>
              </div>
              {eq.validade && (
                <span className={`text-sm ${vencido ? "font-semibold text-red-600" : "text-neutral-400"}`}>
                  {vencido ? "Aferição vencida" : `Válido até ${formatDateBr(eq.validade)}`}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
