"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DIAS_MINI = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Mini calendário da sidebar (estilo Google Agenda): navega de mês de
 * forma independente da visão principal; clicar num dia recentraliza a
 * agenda nesse dia (via onSelecionarDia). Segue `dataSelecionada` quando
 * ela muda por outro caminho (botões de período, "Hoje" etc).
 */
export function MiniCalendario({
  dataSelecionada,
  diasComEvento,
  onSelecionarDia,
  garantirAno,
}: {
  dataSelecionada: Date;
  diasComEvento: Set<string>;
  onSelecionarDia: (dia: Date) => void;
  garantirAno?: (ano: number) => void;
}) {
  const [mesExibido, setMesExibido] = useState(() => startOfMonth(dataSelecionada));
  const chaveSelecionada = format(dataSelecionada, "yyyy-MM");

  // Segue `dataSelecionada` quando ela muda por fora (botões de período,
  // "Hoje" etc) — ajuste de estado durante a renderização, não em efeito,
  // pra não gerar uma passada de render extra.
  const [chaveSincronizada, setChaveSincronizada] = useState(chaveSelecionada);
  if (chaveSelecionada !== chaveSincronizada) {
    setChaveSincronizada(chaveSelecionada);
    setMesExibido(startOfMonth(dataSelecionada));
  }

  useEffect(() => {
    garantirAno?.(mesExibido.getFullYear());
  }, [mesExibido, garantirAno]);

  const dias = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesExibido), { weekStartsOn: 0 });
    const fim = endOfWeek(endOfMonth(mesExibido), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [mesExibido]);

  const hoje = new Date();

  return (
    <div className="px-3 py-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium capitalize text-neutral-300">
          {format(mesExibido, "MMMM yyyy", { locale: ptBR })}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Mês anterior"
            className="flex size-6 items-center justify-center rounded-full text-brand hover:bg-white/10 hover:text-white"
            onClick={() => setMesExibido((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            className="flex size-6 items-center justify-center rounded-full text-brand hover:bg-white/10 hover:text-white"
            onClick={() => setMesExibido((m) => addMonths(m, 1))}
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 place-items-center gap-y-1">
        {DIAS_MINI.map((label, i) => (
          <span key={i} className="text-[10px] font-medium text-neutral-500">
            {label}
          </span>
        ))}
        {dias.map((dia) => {
          const key = format(dia, "yyyy-MM-dd");
          const foraDoMes = !isSameMonth(dia, mesExibido);
          const ehHoje = isSameDay(dia, hoje);
          const ehSelecionado = isSameDay(dia, dataSelecionada);
          const temEvento = diasComEvento.has(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelecionarDia(dia)}
              className={cn(
                "relative flex size-7 items-center justify-center rounded-full text-[11px]",
                foraDoMes ? "text-neutral-600" : "text-neutral-200",
                ehHoje && !ehSelecionado && "font-semibold text-blue-400 ring-1 ring-blue-400",
                ehSelecionado && "bg-brand font-semibold text-white",
                !ehSelecionado && "hover:bg-white/10",
              )}
            >
              {format(dia, "d")}
              {temEvento && !ehSelecionado && <span className="absolute bottom-0.5 size-1 rounded-full bg-brand" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
