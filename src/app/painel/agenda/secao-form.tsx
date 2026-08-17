import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Agrupa uma seção do modal com um ícone à esquerda (na cor da marca) e um traço acima, no estilo do Google Agenda. */
export function Secao({
  icon: Icon,
  comDivisor = true,
  children,
}: {
  icon: LucideIcon;
  comDivisor?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex gap-3", comDivisor && "border-t border-neutral-100 pt-3")}>
      <Icon className="mt-2 size-4 shrink-0 text-brand" />
      <div className="min-w-0 flex-1 space-y-2">{children}</div>
    </div>
  );
}
