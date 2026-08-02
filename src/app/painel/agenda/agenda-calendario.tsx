"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { format, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Printer, Plus, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  VISOES,
  DIAS_SEMANA_LABEL,
  MESES_LABEL,
  parseDataParam,
  formatarDataParam,
  calcularIntervalo,
  navegarPeriodo,
  rotuloPeriodo,
  type VisaoAgenda,
} from "@/lib/periodo-agenda";
import { getFeriadosNoIntervalo, type Feriado } from "@/lib/feriados";
import { useAgendaNav } from "../agenda-nav-context";
import { buscarAgendamentosDoAno } from "./query";
import type { AgendamentoItem } from "./tipos";
import { CriarModal } from "./criar-modal";
import { VerEventoModal } from "./ver-evento-modal";
import { BuscaAgenda } from "./busca-agenda";

export function AgendaCalendario({
  visaoInicial,
  dataRefInicial,
  anoInicial,
  agendamentosDoAno,
  usuarioId,
  podeCriarTeste,
}: {
  visaoInicial: VisaoAgenda;
  dataRefInicial: string;
  anoInicial: number;
  agendamentosDoAno: AgendamentoItem[];
  usuarioId: string;
  podeCriarTeste: boolean;
}) {
  const pathname = usePathname();
  const { registrar, desregistrar, categoriasOcultas, notificarCategorias } = useAgendaNav();

  // Fonte da verdade é 100% local — trocar de período não deve depender de
  // round-trip ao servidor. A URL é só espelhada (history.replaceState, sem
  // passar pelo router do Next) pra manter deep link/compartilhamento.
  const [visao, setVisao] = useState<VisaoAgenda>(visaoInicial);
  const [dataRef, setDataRef] = useState<Date>(() => parseDataParam(dataRefInicial));
  const [cache, setCache] = useState<Record<number, AgendamentoItem[]>>({ [anoInicial]: agendamentosDoAno });
  const anosCarregandoRef = useRef<Set<number>>(new Set());

  const [modalAberto, setModalAberto] = useState(false);
  const [dataModal, setDataModal] = useState<string | undefined>(undefined);
  const [horaModal, setHoraModal] = useState<string | undefined>(undefined);
  const [eventoAberto, setEventoAberto] = useState<AgendamentoItem | null>(null);

  const { inicio, fim } = useMemo(() => calcularIntervalo(visao, dataRef), [visao, dataRef]);
  const anosNecessarios = useMemo(
    () => Array.from(new Set([inicio.getFullYear(), fim.getFullYear()])),
    [inicio, fim],
  );

  const garantirAno = useCallback((ano: number) => {
    setCache((prev) => {
      if (prev[ano] || anosCarregandoRef.current.has(ano)) return prev;
      anosCarregandoRef.current.add(ano);
      const supabase = createClient();
      buscarAgendamentosDoAno(supabase, ano).then((dados) => {
        anosCarregandoRef.current.delete(ano);
        setCache((atual) => (atual[ano] ? atual : { ...atual, [ano]: dados }));
      });
      return prev;
    });
  }, []);

  useEffect(() => {
    anosNecessarios.forEach(garantirAno);
  }, [anosNecessarios, garantirAno]);

  const agendamentosVisiveis = useMemo(
    () =>
      anosNecessarios
        .flatMap((ano) => cache[ano] ?? [])
        .filter((item) => !item.categoria || !categoriasOcultas.has(item.categoria.id)),
    [anosNecessarios, cache, categoriasOcultas],
  );

  const feriados = useMemo(() => getFeriadosNoIntervalo(anosNecessarios), [anosNecessarios]);

  // Eventos que passam de um dia pro outro aparecem em cada dia do
  // intervalo (limitado a 60 dias, só por segurança), não só no dia inicial.
  const porDia = useMemo(() => {
    const mapa: Record<string, AgendamentoItem[]> = {};
    for (const item of agendamentosVisiveis) {
      const inicioItem = new Date(item.data_hora);
      const fimItem = item.data_hora_fim ? new Date(item.data_hora_fim) : inicioItem;
      const dias =
        fimItem > inicioItem ? eachDayOfInterval({ start: inicioItem, end: fimItem }).slice(0, 60) : [inicioItem];
      for (const dia of dias) {
        const key = format(dia, "yyyy-MM-dd");
        (mapa[key] ??= []).push(item);
      }
    }
    return mapa;
  }, [agendamentosVisiveis]);

  const agendamentosNoPeriodo = useMemo(
    () =>
      agendamentosVisiveis.filter(
        (item) => item.data_hora <= fim.toISOString() && (item.data_hora_fim ?? item.data_hora) >= inicio.toISOString(),
      ),
    [agendamentosVisiveis, inicio, fim],
  );

  // Dias com evento em todos os anos já carregados até agora — alimenta as
  // bolinhas do mini calendário da sidebar, que navega meses de forma
  // independente da visão principal.
  const todosDiasComEvento = useMemo(() => {
    const set = new Set<string>();
    for (const lista of Object.values(cache)) {
      for (const item of lista) {
        const inicioItem = new Date(item.data_hora);
        const fimItem = item.data_hora_fim ? new Date(item.data_hora_fim) : inicioItem;
        const dias =
          fimItem > inicioItem ? eachDayOfInterval({ start: inicioItem, end: fimItem }).slice(0, 60) : [inicioItem];
        for (const dia of dias) set.add(format(dia, "yyyy-MM-dd"));
      }
    }
    return set;
  }, [cache]);

  function irPara(novaVisao: VisaoAgenda, novaData: Date) {
    setVisao(novaVisao);
    setDataRef(novaData);
    window.history.replaceState(null, "", `${pathname}?view=${novaVisao}&data=${formatarDataParam(novaData)}`);
  }

  // Clicar num dia no mini calendário abre a visão Dia — mudar só a data
  // (mantendo Mês/Semana) não dava nenhum retorno visual claro pro usuário.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selecionarDiaMini = useCallback((dia: Date) => irPara("dia", dia), []);

  useEffect(() => {
    registrar({ dataRef, diasComEvento: todosDiasComEvento, selecionarDia: selecionarDiaMini, garantirAno });
    return () => desregistrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRef, todosDiasComEvento, selecionarDiaMini, garantirAno]);

  function abrirCriar(data?: Date, hora?: string) {
    setDataModal(data ? formatarDataParam(data) : undefined);
    setHoraModal(hora);
    setModalAberto(true);
  }

  function abrirEvento(item: AgendamentoItem) {
    setEventoAberto(item);
  }

  // Depois de criar/editar/excluir, os anos já carregados podem estar
  // desatualizados — recarrega todos de uma vez (client-side, sem afetar a
  // navegação) em vez de tentar calcular exatamente o que mudou.
  function recarregarTudo() {
    const supabase = createClient();
    Object.keys(cache).forEach((anoStr) => {
      const ano = Number(anoStr);
      buscarAgendamentosDoAno(supabase, ano).then((dados) => {
        setCache((atual) => ({ ...atual, [ano]: dados }));
      });
    });
    // Criar/editar pode ter gerado a categoria pessoal automática — avisa a
    // lista de categorias da sidebar pra ela recarregar e mostrar.
    notificarCategorias();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">
        Agenda {dataRef.getFullYear()}
        <span
          className={cn(
            "ml-2 text-lg font-normal capitalize",
            visao === "dia" && isSameDay(dataRef, new Date()) ? "text-blue-700" : "text-neutral-500",
          )}
        >
          – {rotuloPeriodo(visao, dataRef)}
        </span>
      </h1>

      <div className="sticky top-0 z-20 space-y-2 bg-neutral-50 py-2 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            {VISOES.map((v) => (
              <button
                key={v.valor}
                type="button"
                onClick={() => irPara(v.valor, dataRef)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  visao === v.valor ? "bg-brand/10 text-brand" : "text-neutral-600 hover:bg-neutral-100",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="text-brand"
              onClick={() => irPara(visao, navegarPeriodo(visao, dataRef, -1))}
            >
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" onClick={() => irPara("dia", new Date())}>
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-brand"
              onClick={() => irPara(visao, navegarPeriodo(visao, dataRef, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BuscaAgenda onIrParaData={(data) => irPara("dia", data)} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("agenda-do-periodo")?.scrollIntoView({ behavior: "smooth" })}
          >
            <ArrowDown className="size-3.5" />
            Ver lista
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Imprimir
          </Button>
          <Button size="sm" className="bg-brand hover:bg-brand-dark" onClick={() => abrirCriar(dataRef)}>
            <Plus className="size-3.5" />
            Criar
          </Button>
        </div>
      </div>

      <div className="mt-2">
        {visao === "mes" && (
          <GradeMes dataRef={dataRef} porDia={porDia} feriados={feriados} aoClicarDia={abrirCriar} aoAbrirEvento={abrirEvento} />
        )}
        {visao === "semana" && (
          <GradeSemana
            dataRef={dataRef}
            porDia={porDia}
            feriados={feriados}
            irPara={irPara}
            aoAbrirEvento={abrirEvento}
            aoClicarHorario={(dia, hora) => abrirCriar(dia, `${String(hora).padStart(2, "0")}:00`)}
          />
        )}
        {visao === "dia" && (
          <GradeDia
            dataRef={dataRef}
            porDia={porDia}
            feriados={feriados}
            aoAbrirEvento={abrirEvento}
            aoClicarHorario={(hora) => abrirCriar(dataRef, `${String(hora).padStart(2, "0")}:00`)}
          />
        )}
        {visao === "ano" && (
          <GradeAno dataRef={dataRef} porDia={porDia} feriados={feriados} irPara={irPara} aoClicarDia={abrirCriar} />
        )}
      </div>

      <div id="agenda-do-periodo" className="mt-6 scroll-mt-16 print:mt-4">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">Agenda do período</h2>
        <div className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {agendamentosNoPeriodo.length === 0 && (
            <p className="p-4 text-sm text-neutral-500">Nenhum agendamento no período.</p>
          )}
          {agendamentosNoPeriodo.map((item) => (
            <ItemLinha key={item.id} item={item} usuarioId={usuarioId} aoAbrirEvento={abrirEvento} />
          ))}
        </div>
      </div>

      <CriarModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        podeCriarTeste={podeCriarTeste}
        dataInicial={dataModal}
        horaInicial={horaModal}
        onSucesso={() => {
          setModalAberto(false);
          recarregarTudo();
        }}
      />

      <VerEventoModal
        item={eventoAberto}
        usuarioId={usuarioId}
        podeCriarTeste={podeCriarTeste}
        open={eventoAberto !== null}
        onOpenChange={(open) => !open && setEventoAberto(null)}
        onAlterado={recarregarTudo}
      />
    </div>
  );
}

type Navegar = (visao: VisaoAgenda, data: Date) => void;
type AoClicarDia = (data: Date) => void;
type AoAbrirEvento = (item: AgendamentoItem) => void;

function BannerFeriado({ feriado }: { feriado?: Feriado }) {
  if (!feriado) return null;
  return (
    <p className={cn("truncate text-[11px] font-medium", feriado.tipo === "nacional" ? "text-red-600" : "text-amber-600 italic")}>
      {feriado.nome}
    </p>
  );
}

function GradeMes({
  dataRef,
  porDia,
  feriados,
  aoClicarDia,
  aoAbrirEvento,
}: {
  dataRef: Date;
  porDia: Record<string, AgendamentoItem[]>;
  feriados: Record<string, Feriado>;
  aoClicarDia: AoClicarDia;
  aoAbrirEvento: AoAbrirEvento;
}) {
  const { inicio, fim } = calcularIntervalo("mes", dataRef);
  const dias = eachDayOfInterval({ start: inicio, end: fim });
  const hoje = new Date();

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-center text-xs font-medium text-neutral-500">
        {DIAS_SEMANA_LABEL.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const key = format(dia, "yyyy-MM-dd");
          const feriado = feriados[key];
          const itens = porDia[key] ?? [];
          const foraDoMes = !isSameMonth(dia, dataRef);
          const ehHoje = isSameDay(dia, hoje);

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => aoClicarDia(dia)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && aoClicarDia(dia)}
              aria-label={`Criar em ${format(dia, "d/MM")}`}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col gap-1 border-b border-r border-neutral-100 p-1.5 text-left align-top last:border-r-0 hover:bg-neutral-50/80",
                foraDoMes && "bg-neutral-50/60 text-neutral-400",
                ehHoje && "bg-blue-50/70",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-sm font-medium",
                  ehHoje && "bg-blue-600 text-white",
                )}
              >
                {format(dia, "d")}
              </span>
              <BannerFeriado feriado={feriado} />
              <div className="flex flex-1 flex-col gap-0.5">
                {itens.slice(0, 3).map((item) => (
                  <ItemResumo key={item.id} item={item} aoAbrirEvento={aoAbrirEvento} />
                ))}
                {itens.length > 3 && <span className="text-[11px] text-neutral-400">+{itens.length - 3} mais</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HORAS_DIA = Array.from({ length: 15 }, (_, i) => i + 6); // 06:00–20:00, horário comercial
const ALTURA_HORA_PX = 56;

/** Minuto atual, atualizado a cada 30s — useSyncExternalStore em vez de useState+useEffect pra não
 * gerar warning de hidratação (o snapshot do servidor, null, bate com o primeiro render do client). */
function useMinutoAtual() {
  return useSyncExternalStore(
    (callback) => {
      const id = setInterval(callback, 30_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}

type BlocoEvento = { item: AgendamentoItem; inicio: Date; fim: Date; coluna: number; totalColunas: number };

/**
 * Recorta cada item pro expediente (06h–21h) do dia informado — eventos de
 * vários dias só mostram a fatia que cabe nesse dia — e organiza os que se
 * sobrepõem em colunas lado a lado (mesmo algoritmo do Google Agenda: cada
 * evento pega a primeira coluna livre; quando não sobra nenhuma, abre uma
 * nova), pra nenhum ficar escondido atrás do outro.
 */
function layoutEventosDoDia(dia: Date, itens: AgendamentoItem[]): { blocos: BlocoEvento[]; foraExpediente: AgendamentoItem[] } {
  const inicioGrade = new Date(dia);
  inicioGrade.setHours(6, 0, 0, 0);
  const fimGrade = new Date(dia);
  fimGrade.setHours(21, 0, 0, 0);

  const foraExpediente: AgendamentoItem[] = [];
  const brutos: { item: AgendamentoItem; inicio: Date; fim: Date }[] = [];
  for (const item of itens) {
    const itemInicio = new Date(item.data_hora);
    const itemFim = item.data_hora_fim ? new Date(item.data_hora_fim) : itemInicio;
    const inicio = itemInicio < inicioGrade ? inicioGrade : itemInicio;
    const fim = itemFim > fimGrade ? fimGrade : itemFim;
    if (fim > inicio) brutos.push({ item, inicio, fim });
    else foraExpediente.push(item);
  }
  brutos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const blocos: BlocoEvento[] = [];
  let clusterItens: { item: AgendamentoItem; inicio: Date; fim: Date; coluna: number }[] = [];
  let colunasFim: number[] = [];
  let clusterFimMax = -Infinity;

  const fecharCluster = () => {
    const total = colunasFim.length;
    for (const c of clusterItens) blocos.push({ ...c, totalColunas: total });
    clusterItens = [];
    colunasFim = [];
  };

  for (const b of brutos) {
    if (clusterItens.length > 0 && b.inicio.getTime() >= clusterFimMax) fecharCluster();
    let coluna = colunasFim.findIndex((fimCol) => fimCol <= b.inicio.getTime());
    if (coluna === -1) {
      coluna = colunasFim.length;
      colunasFim.push(b.fim.getTime());
    } else {
      colunasFim[coluna] = b.fim.getTime();
    }
    clusterItens.push({ ...b, coluna });
    clusterFimMax = Math.max(clusterFimMax, b.fim.getTime());
  }
  fecharCluster();

  return { blocos, foraExpediente };
}

function CardEvento({ bloco, aoAbrirEvento }: { bloco: BlocoEvento; aoAbrirEvento: AoAbrirEvento }) {
  const { item, inicio, fim, coluna, totalColunas } = bloco;
  const inicioGrade = new Date(inicio);
  inicioGrade.setHours(6, 0, 0, 0);
  const topoPx = ((inicio.getTime() - inicioGrade.getTime()) / 60_000) * (ALTURA_HORA_PX / 60);
  const alturaPx = Math.max(((fim.getTime() - inicio.getTime()) / 60_000) * (ALTURA_HORA_PX / 60), 20);
  const larguraPct = 100 / totalColunas;
  const cor = item.categoria?.cor ?? (item.tipo === "evento" ? "#8b5cf6" : "#16a34a");
  const label = item.tipo === "evento" ? item.titulo : item.cliente;

  const style = {
    top: `${topoPx}px`,
    height: `${alturaPx}px`,
    left: `calc(${coluna * larguraPct}% + 2px)`,
    width: `calc(${larguraPct}% - 4px)`,
    backgroundColor: `${cor}22`,
    borderLeft: `3px solid ${cor}`,
    color: cor,
  };
  const className =
    "absolute z-10 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm ring-1 ring-black/5 hover:z-20 hover:shadow-md";
  const conteudo = (
    <>
      <p className="truncate font-medium">{label}</p>
      {alturaPx > 30 && (
        <p className="truncate opacity-80">
          {format(inicio, "HH:mm")} – {format(fim, "HH:mm")}
        </p>
      )}
    </>
  );

  return (
    <button
      type="button"
      style={style}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        aoAbrirEvento(item);
      }}
    >
      {conteudo}
    </button>
  );
}

/** Coluna de um único dia com a grade de horários — usada tanto na visão Dia (uma coluna) quanto na Semana (7 colunas lado a lado). */
function ColunaDia({
  dia,
  itens,
  aoAbrirEvento,
  aoClicarHorario,
}: {
  dia: Date;
  itens: AgendamentoItem[];
  aoAbrirEvento: AoAbrirEvento;
  aoClicarHorario: (dia: Date, hora: number) => void;
}) {
  const { blocos, foraExpediente } = useMemo(() => layoutEventosDoDia(dia, itens), [dia, itens]);

  const minutoAtual = useMinutoAtual();
  const agora = minutoAtual !== null ? new Date(minutoAtual * 60_000) : null;
  const mostrarLinhaAgora = agora !== null && isSameDay(dia, agora) && agora.getHours() >= 6 && agora.getHours() < 21;
  const topoLinhaAgora = agora ? ((agora.getHours() - 6) * 60 + agora.getMinutes()) * (ALTURA_HORA_PX / 60) : 0;

  return (
    <div>
      {foraExpediente.length > 0 && (
        <div className="space-y-0.5 border-b border-neutral-100 bg-neutral-50 p-1">
          {foraExpediente.map((item) => (
            <ItemResumo key={item.id} item={item} aoAbrirEvento={aoAbrirEvento} />
          ))}
        </div>
      )}
      <div className="relative" style={{ height: HORAS_DIA.length * ALTURA_HORA_PX }}>
        {HORAS_DIA.map((hora, i) => (
          <button
            key={hora}
            type="button"
            onClick={() => aoClicarHorario(dia, hora)}
            aria-label={`Criar às ${String(hora).padStart(2, "0")}:00 em ${format(dia, "d/MM")}`}
            className="absolute inset-x-0 border-t border-neutral-100 hover:bg-blue-50/40"
            style={{ top: i * ALTURA_HORA_PX, height: ALTURA_HORA_PX }}
          />
        ))}
        {mostrarLinhaAgora && (
          <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: `${topoLinhaAgora}px` }}>
            <span className="-ml-1 size-2 shrink-0 rounded-full bg-red-500" />
            <span className="h-px flex-1 bg-red-500" />
          </div>
        )}
        {blocos.map((bloco) => (
          <CardEvento key={bloco.item.id} bloco={bloco} aoAbrirEvento={aoAbrirEvento} />
        ))}
      </div>
    </div>
  );
}

function GutterHoras() {
  return (
    <div>
      {HORAS_DIA.map((hora) => (
        <div key={hora} style={{ height: ALTURA_HORA_PX }} className="pr-2 text-right">
          <span className="relative -top-2 text-xs font-medium text-neutral-400">{String(hora).padStart(2, "0")}:00</span>
        </div>
      ))}
    </div>
  );
}

/** Evento que passa de um dia pro outro — some do bloco por hora e vira uma faixa no topo (Semana/Dia), como no Google Agenda. */
function ehMultiDia(item: AgendamentoItem): boolean {
  if (!item.data_hora_fim) return false;
  return !isSameDay(new Date(item.data_hora), new Date(item.data_hora_fim));
}

/** Evento "dia inteiro" (00:00–23:59 do mesmo dia) — mesmo cabendo num único dia, também vira faixa, não bloco por hora. */
function ehDiaInteiro(item: AgendamentoItem): boolean {
  if (!item.data_hora_fim) return false;
  const inicio = new Date(item.data_hora);
  const fim = new Date(item.data_hora_fim);
  return inicio.getHours() === 0 && inicio.getMinutes() === 0 && fim.getHours() === 23 && fim.getMinutes() >= 59;
}

/** Vai pra faixa do topo (em vez do bloco por hora): multi-dia OU dia inteiro. */
function vaiNaFaixaSuperior(item: AgendamentoItem): boolean {
  return ehMultiDia(item) || ehDiaInteiro(item);
}

/** Em quais colunas (0–6) da semana a faixa do evento cai, e se ela continua antes/depois da semana visível. */
function spanNaSemana(item: AgendamentoItem, dias: Date[]) {
  const chaves = dias.map((d) => format(d, "yyyy-MM-dd"));
  const chaveInicio = format(new Date(item.data_hora), "yyyy-MM-dd");
  const chaveFim = format(item.data_hora_fim ? new Date(item.data_hora_fim) : new Date(item.data_hora), "yyyy-MM-dd");

  let colInicio = chaves.findIndex((k) => k >= chaveInicio);
  if (colInicio === -1) colInicio = 0;
  let colFim = 0;
  for (let i = chaves.length - 1; i >= 0; i--) {
    if (chaves[i] <= chaveFim) {
      colFim = i;
      break;
    }
  }
  return {
    colInicio,
    colFim,
    continuaAntes: chaveInicio < chaves[0],
    continuaDepois: chaveFim > chaves[chaves.length - 1],
  };
}

/** Empilha as faixas em linhas: cada uma pega a primeira linha onde não colide (por coluna) com nenhuma outra já colocada. */
function empilharFaixas<T extends { colInicio: number; colFim: number }>(faixas: T[]): (T & { linha: number })[] {
  const ocupadoPorLinha: { colInicio: number; colFim: number }[][] = [];
  return faixas.map((faixa) => {
    let linha = 0;
    while (
      (ocupadoPorLinha[linha] ?? []).some((o) => !(faixa.colFim < o.colInicio || faixa.colInicio > o.colFim))
    ) {
      linha++;
    }
    (ocupadoPorLinha[linha] ??= []).push(faixa);
    return { ...faixa, linha };
  });
}

function BannerMultiDia({
  item,
  continuaAntes,
  continuaDepois,
  aoAbrirEvento,
  style,
}: {
  item: AgendamentoItem;
  continuaAntes: boolean;
  continuaDepois: boolean;
  aoAbrirEvento: AoAbrirEvento;
  style?: CSSProperties;
}) {
  const cor = item.categoria?.cor ?? (item.tipo === "evento" ? "#8b5cf6" : "#16a34a");
  const label = item.tipo === "evento" ? item.titulo : item.cliente;
  const entalhe = "5px";
  const clipPath =
    continuaAntes && continuaDepois
      ? `polygon(${entalhe} 0, calc(100% - ${entalhe}) 0, 100% 50%, calc(100% - ${entalhe}) 100%, ${entalhe} 100%, 0 50%)`
      : continuaAntes
        ? `polygon(${entalhe} 0, 100% 0, 100% 100%, ${entalhe} 100%, 0 50%)`
        : continuaDepois
          ? `polygon(0 0, calc(100% - ${entalhe}) 0, 100% 50%, calc(100% - ${entalhe}) 100%, 0 100%)`
          : undefined;

  // rounded-lg vale só onde não tem seta — o clip-path da seta já define a
  // borda inteira daquele lado (ponta reta), então o arredondamento nunca
  // entra em conflito com ela, só aparece nas pontas sem seta.
  const commonStyle: CSSProperties = { ...style, backgroundColor: cor, clipPath };
  const className = "block w-full truncate rounded-lg px-2.5 py-1 text-left text-xs font-medium text-white shadow-sm hover:brightness-95";
  // Só mostra o horário no dia em que o evento realmente começa (e não é
  // dia inteiro) — nos dias seguintes (continuaAntes) ele só "está
  // passando", e "dia inteiro" não tem um horário que faça sentido mostrar.
  const inicioData = new Date(item.data_hora);
  const semHorario = continuaAntes || ehDiaInteiro(item);
  const conteudo = semHorario ? label : `${format(inicioData, "HH:mm")} ${label}`;

  if (item.tipo === "evento") {
    return (
      <button
        type="button"
        style={commonStyle}
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          aoAbrirEvento(item);
        }}
      >
        {conteudo}
      </button>
    );
  }
  return (
    <Link href={`/painel/agenda/${item.id}`} style={commonStyle} className={className} onClick={(e) => e.stopPropagation()}>
      {conteudo}
    </Link>
  );
}

function GradeSemana({
  dataRef,
  porDia,
  feriados,
  irPara,
  aoAbrirEvento,
  aoClicarHorario,
}: {
  dataRef: Date;
  porDia: Record<string, AgendamentoItem[]>;
  feriados: Record<string, Feriado>;
  irPara: Navegar;
  aoAbrirEvento: AoAbrirEvento;
  aoClicarHorario: (dia: Date, hora: number) => void;
}) {
  const { inicio, fim } = calcularIntervalo("semana", dataRef);
  const dias = eachDayOfInterval({ start: inicio, end: fim });
  const hoje = new Date();

  const faixasMultiDia = useMemo(() => {
    const vistos = new Map<string, AgendamentoItem>();
    for (const dia of dias) {
      for (const item of porDia[format(dia, "yyyy-MM-dd")] ?? []) {
        if (vaiNaFaixaSuperior(item)) vistos.set(item.id, item);
      }
    }
    return empilharFaixas(Array.from(vistos.values(), (item) => ({ item, ...spanNaSemana(item, dias) })));
  }, [dias, porDia]);
  const linhasMultiDia = faixasMultiDia.length === 0 ? 0 : Math.max(...faixasMultiDia.map((f) => f.linha)) + 1;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="flex border-b border-neutral-200">
        <div className="w-12 shrink-0" />
        {dias.map((dia) => {
          const feriado = feriados[format(dia, "yyyy-MM-dd")];
          const ehHoje = isSameDay(dia, hoje);
          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => irPara("dia", dia)}
              className="min-w-0 flex-1 border-l border-neutral-100 py-2 text-center hover:bg-neutral-50"
            >
              <p className="text-xs font-medium text-neutral-500 uppercase">{DIAS_SEMANA_LABEL[dia.getDay()]}</p>
              <p
                className={cn(
                  "mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                  ehHoje ? "bg-blue-600 text-white" : "text-neutral-900",
                )}
              >
                {format(dia, "d")}
              </p>
              {feriado && <p className="truncate px-1 text-[9px] text-red-600">{feriado.nome}</p>}
            </button>
          );
        })}
      </div>
      {linhasMultiDia > 0 && (
        <div className="flex border-b border-neutral-100 bg-white pb-2">
          <div className="w-12 shrink-0" />
          <div
            className="grid flex-1 gap-y-1 px-2 pt-1"
            style={{ gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: `repeat(${linhasMultiDia}, auto)` }}
          >
            {faixasMultiDia.map(({ item, colInicio, colFim, linha, continuaAntes, continuaDepois }) => (
              <BannerMultiDia
                key={item.id}
                item={item}
                continuaAntes={continuaAntes}
                continuaDepois={continuaDepois}
                aoAbrirEvento={aoAbrirEvento}
                style={{ gridColumn: `${colInicio + 1} / ${colFim + 2}`, gridRow: linha + 1 }}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex overflow-y-auto" style={{ maxHeight: "70vh" }}>
        <div className="w-12 shrink-0">
          <GutterHoras />
        </div>
        {dias.map((dia) => {
          const key = format(dia, "yyyy-MM-dd");
          const itens = (porDia[key] ?? []).filter((item) => !vaiNaFaixaSuperior(item));
          return (
            <div key={key} className="min-w-0 flex-1 border-l border-neutral-100">
              <ColunaDia dia={dia} itens={itens} aoAbrirEvento={aoAbrirEvento} aoClicarHorario={aoClicarHorario} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GradeDia({
  dataRef,
  porDia,
  feriados,
  aoAbrirEvento,
  aoClicarHorario,
}: {
  dataRef: Date;
  porDia: Record<string, AgendamentoItem[]>;
  feriados: Record<string, Feriado>;
  aoAbrirEvento: AoAbrirEvento;
  aoClicarHorario: (hora: number) => void;
}) {
  const key = format(dataRef, "yyyy-MM-dd");
  const feriado = feriados[key];
  const todosOsItens = porDia[key] ?? [];
  const itens = todosOsItens.filter((item) => !vaiNaFaixaSuperior(item));
  const faixasMultiDia = todosOsItens
    .filter(vaiNaFaixaSuperior)
    .map((item) => ({ item, ...spanNaSemana(item, [dataRef]) }));

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="h-2" />
      {feriado && (
        <p
          className={cn(
            "border-b border-neutral-100 p-3 text-sm font-medium",
            feriado.tipo === "nacional" ? "text-red-600" : "text-amber-600 italic",
          )}
        >
          {feriado.nome} {feriado.tipo === "facultativo" && "(ponto facultativo)"}
        </p>
      )}
      {faixasMultiDia.length > 0 && (
        <div className="space-y-1 border-b border-neutral-100 bg-white px-2 pb-2">
          {faixasMultiDia.map(({ item, continuaAntes, continuaDepois }) => (
            <BannerMultiDia
              key={item.id}
              item={item}
              continuaAntes={continuaAntes}
              continuaDepois={continuaDepois}
              aoAbrirEvento={aoAbrirEvento}
            />
          ))}
        </div>
      )}
      <div className="flex overflow-y-auto" style={{ maxHeight: "70vh" }}>
        <div className="w-12 shrink-0">
          <GutterHoras />
        </div>
        <div className="min-w-0 flex-1">
          <ColunaDia dia={dataRef} itens={itens} aoAbrirEvento={aoAbrirEvento} aoClicarHorario={(_dia, hora) => aoClicarHorario(hora)} />
        </div>
      </div>
    </div>
  );
}

function GradeAno({
  dataRef,
  porDia,
  feriados,
  irPara,
  aoClicarDia,
}: {
  dataRef: Date;
  porDia: Record<string, AgendamentoItem[]>;
  feriados: Record<string, Feriado>;
  irPara: Navegar;
  aoClicarDia: AoClicarDia;
}) {
  const ano = dataRef.getFullYear();
  const hoje = new Date();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {MESES_LABEL.map((nomeMes, mesIndice) => {
        const mesRef = new Date(ano, mesIndice, 1);
        const { inicio, fim } = calcularIntervalo("mes", mesRef);
        const dias = eachDayOfInterval({ start: inicio, end: fim });

        return (
          <div key={nomeMes} className="rounded-lg border border-neutral-200 bg-white p-2">
            <button
              type="button"
              onClick={() => irPara("mes", mesRef)}
              className="mb-1 text-sm font-semibold text-neutral-900 hover:text-brand"
            >
              {nomeMes}
            </button>
            <div className="grid grid-cols-7 gap-y-0.5 text-center text-[10px]">
              {dias.map((dia) => {
                const key = format(dia, "yyyy-MM-dd");
                const itens = porDia[key] ?? [];
                const feriado = feriados[key];
                const foraDoMes = !isSameMonth(dia, mesRef);
                const ehHoje = isSameDay(dia, hoje);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => aoClicarDia(dia)}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded",
                      foraDoMes && "text-neutral-300",
                      ehHoje && "bg-blue-600 text-white",
                    )}
                  >
                    {format(dia, "d")}
                    {(feriado || itens.length > 0) && !foraDoMes && (
                      <span
                        className={cn(
                          "absolute bottom-0 size-1 rounded-full",
                          feriado ? "bg-red-500" : "bg-brand",
                          ehHoje && "bg-white",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Bolinha de cor — usa a cor da categoria quando o item tem uma, senão cai no padrão por tipo. */
function PontoCor({ item, className }: { item: AgendamentoItem; className: string }) {
  if (item.categoria) return <span className={className} style={{ backgroundColor: item.categoria.cor }} />;
  return <span className={cn(className, item.tipo === "evento" ? "bg-violet-500" : "bg-brand")} />;
}

function ItemResumo({ item, aoAbrirEvento }: { item: AgendamentoItem; aoAbrirEvento: AoAbrirEvento }) {
  const label = item.tipo === "evento" ? item.titulo : item.cliente;
  const className =
    "flex w-full items-center gap-1 truncate rounded bg-neutral-100 px-1 py-0.5 text-left text-[11px] text-neutral-700 hover:bg-neutral-200";
  const conteudo = (
    <>
      <PontoCor item={item} className="size-1.5 shrink-0 rounded-full" />
      <span className="truncate">
        {format(new Date(item.data_hora), "HH:mm")} {label}
      </span>
    </>
  );

  // Abre sempre no modal (resumo rápido) — precisa parar a propagação pro
  // clique não "vazar" pro clique do dia (que abriria o Criar por cima).
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        aoAbrirEvento(item);
      }}
      className={className}
    >
      {conteudo}
    </button>
  );
}

function ItemLinha({
  item,
  usuarioId,
  compacto = false,
  aoAbrirEvento,
}: {
  item: AgendamentoItem;
  usuarioId: string;
  compacto?: boolean;
  aoAbrirEvento?: AoAbrirEvento;
}) {
  const inicio = new Date(item.data_hora);
  const fim = item.data_hora_fim ? new Date(item.data_hora_fim) : null;
  const mesmoDia = !fim || isSameDay(inicio, fim);

  // Evento de vários dias: mostra o período completo, não só o horário de início.
  const hora = mesmoDia
    ? format(inicio, compacto ? "HH:mm" : "dd/MM/yyyy HH:mm")
    : compacto
      ? `${format(inicio, "dd/MM")}–${format(fim, "dd/MM")}`
      : `${format(inicio, "dd/MM/yyyy HH:mm")} – ${format(fim, "dd/MM/yyyy HH:mm")}`;
  const label = item.tipo === "evento" ? item.titulo : item.cliente;

  const conteudo = (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <div className="min-w-0">
        {compacto ? (
          <p className="truncate text-[11px] font-medium text-neutral-900">
            <PontoCor item={item} className="mr-1 inline-block size-1.5 rounded-full align-middle" />
            {hora} · {label}
          </p>
        ) : (
          <>
            <p className="truncate text-sm font-semibold text-neutral-900">
              <PontoCor item={item} className="mr-1.5 inline-block size-1.5 rounded-full align-middle" />
              {label}
            </p>
            <p className="truncate pl-3 text-xs text-neutral-500">{hora}</p>
          </>
        )}
        {!compacto && item.tipo === "evento" && item.participantes.length > 0 && (
          <p className="truncate pl-3 text-xs text-neutral-500">
            Com: {item.participantes.map((p) => (p.id === usuarioId ? "Você" : p.nome)).join(", ")}
          </p>
        )}
        {!compacto && item.tipo === "teste_opacidade" && (
          <p className="truncate pl-3 text-xs text-neutral-500">
            {item.veiculo ? `${item.veiculo} · Técnico: ${item.tecnico ?? "-"}` : "Aguardando cadastro do cliente/veículo"}
          </p>
        )}
      </div>
      {!compacto && item.tipo === "teste_opacidade" && (
        <span className="shrink-0 text-xs text-neutral-400 capitalize">{item.status.replace("_", " ")}</span>
      )}
    </div>
  );

  const className = cn("block hover:bg-neutral-50", compacto ? "rounded px-1 py-0.5" : "px-3 py-2");

  if (aoAbrirEvento) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          aoAbrirEvento(item);
        }}
        className={cn(className, "w-full text-left")}
      >
        {conteudo}
      </button>
    );
  }

  return (
    <Link href={`/painel/agenda/${item.id}`} onClick={(e) => e.stopPropagation()} className={className}>
      {conteudo}
    </Link>
  );
}
