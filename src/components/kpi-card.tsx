import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const TOM_CORES = {
  bom: "#0ca30c",
  atencao: "#a3760c",
  critico: "#d03b3b",
} as const;

type Tom = keyof typeof TOM_CORES;

export function KpiCard({
  href,
  icon: Icon,
  cor,
  eyebrow,
  label,
  valor,
  pill,
  children,
  className,
}: {
  href: string;
  icon: LucideIcon;
  cor: string;
  eyebrow: string;
  label: string;
  valor: number | string;
  pill?: { label: string; tom: Tom };
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${cor}1a`, color: cor }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">{eyebrow}</span>
        </span>
        {pill && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${TOM_CORES[pill.tom]}1a`, color: TOM_CORES[pill.tom] }}
          >
            {pill.label}
          </span>
        )}
      </div>

      <p className="mt-4 text-sm font-medium text-neutral-500">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-neutral-900">{valor}</p>

      {children && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">{children}</div>}
    </Link>
  );
}

/** Estatística de apoio dentro de um card — com `tom` vira uma bolinha colorida de status, sem `tom` é só texto informativo. */
export function KpiStat({ label, tom }: { label: string; tom?: Tom }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">
      {tom && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TOM_CORES[tom] }} />}
      {label}
    </span>
  );
}
