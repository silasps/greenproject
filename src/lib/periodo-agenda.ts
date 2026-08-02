import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type VisaoAgenda = "dia" | "semana" | "mes" | "ano";

export const VISOES: { valor: VisaoAgenda; label: string }[] = [
  { valor: "dia", label: "Dia" },
  { valor: "semana", label: "Semana" },
  { valor: "mes", label: "Mês" },
  { valor: "ano", label: "Ano" },
];

/** Interpreta "yyyy-MM-dd" como data local (evita o offset de `new Date(string)` em UTC). */
export function parseDataParam(data: string | undefined): Date {
  const match = data ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(data) : null;
  if (match) {
    const [, ano, mes, dia] = match;
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  }
  return new Date();
}

export function formatarDataParam(data: Date): string {
  return format(data, "yyyy-MM-dd");
}

/**
 * Intervalo de busca/exibição de cada visão. Na visão Mês, o intervalo já
 * inclui os dias de preenchimento do mês anterior/seguinte (a grade sempre
 * mostra semanas completas), pra manter a busca e a grade em sincronia.
 */
export function calcularIntervalo(visao: VisaoAgenda, dataRef: Date): { inicio: Date; fim: Date } {
  switch (visao) {
    case "dia":
      return { inicio: startOfDay(dataRef), fim: endOfDay(dataRef) };
    case "semana":
      return {
        inicio: startOfWeek(dataRef, { weekStartsOn: 0 }),
        fim: endOfWeek(dataRef, { weekStartsOn: 0 }),
      };
    case "ano":
      return { inicio: startOfYear(dataRef), fim: endOfYear(dataRef) };
    case "mes":
    default:
      return {
        inicio: startOfWeek(startOfMonth(dataRef), { weekStartsOn: 0 }),
        fim: endOfWeek(endOfMonth(dataRef), { weekStartsOn: 0 }),
      };
  }
}

export function navegarPeriodo(visao: VisaoAgenda, dataRef: Date, direcao: 1 | -1): Date {
  switch (visao) {
    case "dia":
      return direcao === 1 ? addDays(dataRef, 1) : subDays(dataRef, 1);
    case "semana":
      return direcao === 1 ? addWeeks(dataRef, 1) : subWeeks(dataRef, 1);
    case "ano":
      return direcao === 1 ? addYears(dataRef, 1) : subYears(dataRef, 1);
    case "mes":
    default:
      return direcao === 1 ? addMonths(dataRef, 1) : subMonths(dataRef, 1);
  }
}

export function rotuloPeriodo(visao: VisaoAgenda, dataRef: Date): string {
  const { inicio, fim } = calcularIntervalo(visao, dataRef);
  switch (visao) {
    case "dia":
      return format(dataRef, "EEEE, d 'de' MMMM", { locale: ptBR });
    case "semana":
      return `${format(inicio, "d 'de' MMM", { locale: ptBR })} – ${format(fim, "d 'de' MMM", { locale: ptBR })}`;
    case "ano":
      return format(dataRef, "yyyy");
    case "mes":
    default:
      return format(dataRef, "MMMM", { locale: ptBR });
  }
}

export const DIAS_SEMANA_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const MESES_LABEL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
