"use client";

import { useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import { bucketDoTeste, FILTROS_STATUS, type FiltroStatus } from "./status";
import { useTestesFiltro } from "../testes-filtro-context";

export type LinhaTeste = {
  id: string;
  data_hora: string;
  nome_contato: string | null;
  clientes: { nome: string } | null;
  veiculos_maquinas: { identificador: string } | null;
  testes_opacidade: { status: string; resultado: string | null; laudos: { emitido_em: string }[] | null }[] | null;
};

/** Válido até = emitido_em + 1 ano — mesma regra de src/lib/laudo/validade.ts. */
function validadeTexto(linha: LinhaTeste): string | null {
  const emitidoEm = linha.testes_opacidade?.[0]?.laudos?.[0]?.emitido_em;
  if (!emitidoEm) return null;
  const validade = new Date(emitidoEm);
  validade.setFullYear(validade.getFullYear() + 1);
  return validade.toLocaleDateString("pt-BR");
}

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
      <div className="mt-2 space-y-3">
        {testes.map((linha) => {
          const { label, classe } = statusInfo(linha);
          const validade = validadeTexto(linha);
          return (
            <Link
              key={linha.id}
              href={`/painel/agenda/${linha.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50"
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
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${classe}`}>{label}</span>
                {validade && <span className="text-xs text-neutral-400">Válido até {validade}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Recebe todas as linhas já buscadas no server (uma vez só) e filtra
 * inteiramente no client, a partir do `TestesFiltroContext` — trocar o
 * filtro na sidebar não navega, só reorganiza o que já está na tela.
 */
export function TestesListaCliente({ linhas }: { linhas: LinhaTeste[] }) {
  const searchParams = useSearchParams();
  const { filtro, setFiltro } = useTestesFiltro();

  // Deep link (ex.: link vindo de fora com ?status=...) — só na primeira montagem.
  useEffect(() => {
    const status = searchParams.get("status") as FiltroStatus | null;
    if (status) setFiltro(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <p className="mt-2 text-neutral-600">
        {filtro
          ? "Filtrado pelo menu lateral — "
          : "Todos os testes agendados, ordenados por data — outra forma de ver o que já está na agenda."}
        {filtro && (
          <button type="button" onClick={() => setFiltro(null)} className="text-brand hover:underline">
            ver todos
          </button>
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
    </>
  );
}
