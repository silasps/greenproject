import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { bucketDoTeste, FILTROS_STATUS } from "./status";

type LinhaTeste = {
  id: string;
  data_hora: string;
  nome_contato: string | null;
  clientes: { nome: string } | null;
  veiculos_maquinas: { identificador: string } | null;
  testes_opacidade: { status: string; resultado: string | null }[] | null;
};

function statusInfo(linha: LinhaTeste): { label: string; classe: string } {
  const teste = linha.testes_opacidade?.[0];
  if (!teste) return { label: "Agendado", classe: "bg-amber-100 text-amber-800" };
  if (teste.resultado === "reprovado") return { label: "Reprovado", classe: "bg-red-100 text-red-700" };
  if (teste.status === "aprovado") return { label: "Liberado", classe: "bg-green-100 text-green-800" };
  // Pendência do escritório: campo já foi feito, falta importar o PDF do
  // opacímetro — normalmente porque isso só dá pra fazer de volta no escritório.
  if (teste.status === "aguardando_pdf_syscon") return { label: "Pendência: importar PDF", classe: "bg-orange-100 text-orange-800" };
  if (teste.status === "aguardando_revisao") return { label: "Aguardando revisão", classe: "bg-amber-100 text-amber-800" };
  return { label: "Aguardando execução", classe: "bg-amber-100 text-amber-800" };
}

function ehAberto(linha: LinhaTeste): boolean {
  const teste = linha.testes_opacidade?.[0];
  return !teste || teste.status !== "aprovado";
}

function ListaTestes({ titulo, testes }: { titulo: string; testes: LinhaTeste[] }) {
  if (testes.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        {titulo} ({testes.length})
      </h2>
      <div className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {testes.map((linha) => {
          const { label, classe } = statusInfo(linha);
          return (
            <Link
              key={linha.id}
              href={`/painel/agenda/${linha.id}`}
              className="flex items-center justify-between gap-3 p-4 hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-900">
                  {linha.clientes?.nome ?? linha.nome_contato ?? "Cliente não informado"}
                </p>
                <p className="text-sm text-neutral-500">
                  {format(new Date(linha.data_hora), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  {linha.veiculos_maquinas && ` · ${linha.veiculos_maquinas.identificador}`}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${classe}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function TestesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["escritorio", "gerencia"]);
  const supabase = await createClient();
  const params = await searchParams;
  const filtro = FILTROS_STATUS.find((f) => f.key === params.status)?.key;

  const { data } = await supabase
    .from("agendamentos")
    .select(
      "id, data_hora, nome_contato, clientes(nome), veiculos_maquinas(identificador), testes_opacidade(status, resultado)",
    )
    .eq("tipo", "teste_opacidade")
    .neq("status", "cancelado")
    .order("data_hora", { ascending: true });

  const linhas = (data ?? []) as unknown as LinhaTeste[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Testes de opacidade</h1>
        <div className="flex items-center gap-4">
          <Link href="/painel/testes/vencendo" className="text-sm text-brand hover:underline">
            Testes vencendo →
          </Link>
          <Link href="/painel/agenda" className="text-sm text-brand hover:underline">
            Ver na agenda →
          </Link>
        </div>
      </div>
      <p className="mt-2 text-neutral-600">
        {filtro
          ? "Filtrado pelo menu lateral — "
          : "Todos os testes agendados, ordenados por data — outra forma de ver o que já está na agenda."}
        {filtro && (
          <Link href="/painel/testes" className="text-brand hover:underline">
            ver todos
          </Link>
        )}
      </p>

      {linhas.length === 0 && <p className="mt-6 text-sm text-neutral-500">Nenhum teste agendado.</p>}

      {filtro ? (
        <ListaTestes
          titulo={FILTROS_STATUS.find((f) => f.key === filtro)!.label}
          testes={linhas.filter((l) => bucketDoTeste(l) === filtro)}
        />
      ) : (
        <>
          <ListaTestes titulo="Em aberto" testes={linhas.filter(ehAberto)} />
          <ListaTestes titulo="Realizados" testes={linhas.filter((l) => !ehAberto(l))} />
        </>
      )}
    </div>
  );
}
