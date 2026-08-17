"use client";

import { useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2 } from "lucide-react";
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

function statusInfo(linha: LinhaTeste): { label: string; classe: string; dot: string } {
  const teste = linha.testes_opacidade?.[0];
  if (!teste) return { label: "Agendado", classe: "bg-amber-100 text-amber-800", dot: "bg-amber-500" };
  if (teste.resultado === "reprovado") return { label: "Reprovado", classe: "bg-red-100 text-red-700", dot: "bg-red-600" };
  if (teste.status === "aprovado") return { label: "Liberado", classe: "bg-green-100 text-green-800", dot: "bg-green-600" };
  // Pendência do escritório: campo já foi feito, falta importar o PDF do
  // opacímetro — normalmente porque isso só dá pra fazer de volta no escritório.
  if (teste.status === "aguardando_pdf_syscon")
    return { label: "Pendência: importar PDF", classe: "bg-orange-100 text-orange-800", dot: "bg-orange-500" };
  if (teste.status === "aguardando_revisao")
    return { label: "Aguardando revisão", classe: "bg-amber-100 text-amber-800", dot: "bg-amber-500" };
  return { label: "Aguardando execução", classe: "bg-amber-100 text-amber-800", dot: "bg-amber-500" };
}

function ehAberto(linha: LinhaTeste): boolean {
  const teste = linha.testes_opacidade?.[0];
  return !teste || teste.status !== "aprovado";
}

function ListaTestes({ titulo, testes, concluidos = false }: { titulo: string; testes: LinhaTeste[]; concluidos?: boolean }) {
  if (testes.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
        {titulo}
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">{testes.length}</span>
      </h2>
      <div className={`mt-2 space-y-3 ${concluidos ? "opacity-80" : ""}`}>
        {testes.map((linha) => {
          const { label, classe, dot } = statusInfo(linha);
          const validade = validadeTexto(linha);
          const liberado = label === "Liberado";
          return (
            <Link
              key={linha.id}
              href={`/painel/agenda/${linha.id}?voltar=${encodeURIComponent("/painel/testes")}`}
              className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:flex-row md:items-center"
            >
              <div className="min-w-0">
                <p className={`truncate font-semibold text-neutral-900 ${concluidos ? "decoration-neutral-300 line-through" : ""}`}>
                  {linha.clientes?.nome ?? linha.nome_contato ?? "Cliente não informado"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-4 text-neutral-400" />
                    {format(new Date(linha.data_hora), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                  {linha.veiculos_maquinas && (
                    <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-600">
                      {linha.veiculos_maquinas.identificador}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${classe}`}>
                  {liberado ? <CheckCircle2 className="size-3.5" /> : <span className={`size-1.5 rounded-full ${dot}`} />}
                  {label}
                </span>
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
  const { filtro, setFiltro, registrarLinhas } = useTestesFiltro();

  // Deep link (ex.: link vindo de fora com ?status=...) — só na primeira montagem.
  useEffect(() => {
    const status = searchParams.get("status") as FiltroStatus | null;
    if (status) setFiltro(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compartilha os dados (já vieram prontos do servidor) com a contagem da
  // sidebar, pra ela não precisar buscar de novo por conta própria e correr
  // o risco de mostrar um número diferente do que a lista de fato tem.
  useEffect(() => {
    registrarLinhas(linhas);
    return () => registrarLinhas(null);
  }, [linhas, registrarLinhas]);

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
          <ListaTestes titulo="Realizados" testes={linhas.filter((l) => !ehAberto(l))} concluidos />
        </>
      )}
    </>
  );
}
