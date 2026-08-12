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
    // Link "esticado" (position absolute z-0 cobrindo o card inteiro) em vez de
    // envolver tudo num <Link> — assim os KpiStat com href podem ser links próprios
    // por cima (z-10), sem cair na regra de HTML de não aninhar <a> dentro de <a>.
    <div
      className={`group relative rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${className ?? ""}`}
    >
      <Link href={href} aria-label={label} className="absolute inset-0 z-0 rounded-2xl" />

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

      {children && (
        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">{children}</div>
      )}
    </div>
  );
}

/** Estatística de apoio dentro de um card — com `tom` vira uma bolinha colorida de status, sem `tom` é só texto informativo.
 *  Com `href`, vira link próprio (ex.: já filtrado) por cima do link esticado do card. */
export function KpiStat({ label, tom, href }: { label: string; tom?: Tom; href?: string }) {
  const conteudo = (
    <>
      {tom && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TOM_CORES[tom] }} />}
      {label}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:underline">
        {conteudo}
      </Link>
    );
  }

  return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">{conteudo}</span>;
}
