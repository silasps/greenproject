import type { StatusSugestao } from "./actions";

// Compartilhado entre page.tsx (cabeçalho das colunas) e sugestao-linha.tsx
// (badge do card) — um lugar só pra rótulo/cor de cada etapa.
export const STATUS_INFO: Record<StatusSugestao, { label: string; badgeClassName: string; cardClassName: string }> = {
  nova: {
    label: "Nova",
    badgeClassName: "bg-brand text-white",
    cardClassName: "border-brand/30 bg-brand/[0.03]",
  },
  em_andamento: {
    label: "Em andamento",
    badgeClassName: "bg-amber-100 text-amber-700",
    cardClassName: "border-amber-200 bg-white",
  },
  feita: {
    label: "Feita",
    badgeClassName: "bg-emerald-100 text-emerald-700",
    cardClassName: "border-neutral-200 bg-white",
  },
  ignorada: {
    label: "Ignorada",
    badgeClassName: "bg-neutral-200 text-neutral-500",
    cardClassName: "border-neutral-200 bg-neutral-50",
  },
};

export const COLUNAS_STATUS: StatusSugestao[] = ["nova", "em_andamento", "feita", "ignorada"];
