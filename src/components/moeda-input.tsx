"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Extrai os dígitos digitados e trata como centavos (últimos 2 dígitos = casas decimais). */
function paraCentavos(valorExibido: string): number {
  const digitos = valorExibido.replace(/\D/g, "");
  return digitos ? parseInt(digitos, 10) : 0;
}

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Campo de valor "estilo caixa eletrônico": só aceita dígitos, e cada tecla
 * empurra a vírgula — digitar 1, 2, 5 vira 0,01 → 0,12 → 1,25. `value`/
 * `onChange` continuam em decimal (ex.: "1.25"), pra bater com o resto do
 * formulário (Number(formData.get(...))).
 */
export function MoedaInput({
  id,
  name,
  value,
  onChange,
  className,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (valorDecimal: string) => void;
  className?: string;
}) {
  const centavos = Math.round((parseFloat(value || "0") || 0) * 100);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-400">R$</span>
      <Input
        id={id}
        inputMode="numeric"
        value={formatarCentavos(centavos)}
        onChange={(e) => onChange((paraCentavos(e.target.value) / 100).toFixed(2))}
        className="pl-9 text-right tabular-nums"
      />
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
