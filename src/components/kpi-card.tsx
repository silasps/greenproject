import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function KpiCard({
  href,
  icon: Icon,
  cor,
  label,
  valor,
  children,
}: {
  href: string;
  icon: LucideIcon;
  cor: string;
  label: string;
  valor: number | string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${cor}1a`, color: cor }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-neutral-300 transition-colors group-hover:text-neutral-500" />
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-neutral-900">{valor}</p>
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      {children && <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3">{children}</div>}
    </Link>
  );
}

/** Cores de status fixas (nunca reaproveitadas como cor de seção/categoria) — usadas nas pílulas de resultado dentro de um card. */
export const KPI_STATUS_CORES = {
  bom: { texto: "#0ca30c", fundo: "#0ca30c1a" },
  atencao: { texto: "#a3760c", fundo: "#fab2191a" },
  critico: { texto: "#d03b3b", fundo: "#d03b3b1a" },
} as const;

export function KpiPill({ label, tom }: { label: string; tom: keyof typeof KPI_STATUS_CORES }) {
  const cores = KPI_STATUS_CORES[tom];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: cores.fundo, color: cores.texto }}
    >
      {label}
    </span>
  );
}

/** Pílula neutra pra informação complementar (sem carga de status). */
export function KpiInfoPill({ label }: { label: string }) {
  return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{label}</span>;
}
