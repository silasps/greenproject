"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Input com sugestões filtradas por texto — não força seleção, aceita texto livre (veículo fora da lista). */
export function MarcaModeloCombobox({
  id,
  name,
  value,
  onValueChange,
  itens,
  placeholder,
  onFocus,
}: {
  id?: string;
  name?: string;
  value: string;
  onValueChange: (valor: string) => void;
  itens: string[];
  placeholder?: string;
  onFocus?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const fecharTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtrados = value.trim()
    ? itens.filter((item) => item.toLowerCase().includes(value.trim().toLowerCase()))
    : itens;

  function fecharComDelay() {
    fecharTimeout.current = setTimeout(() => setAberto(false), 150);
  }

  function cancelarFechar() {
    if (fecharTimeout.current) clearTimeout(fecharTimeout.current);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => {
          setAberto(true);
          onFocus?.();
        }}
        onBlur={fecharComDelay}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAberto(false);
        }}
      />
      {aberto && filtrados.length > 0 && (
        <div
          onMouseDown={cancelarFechar}
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {filtrados.slice(0, 50).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                onValueChange(item);
                setAberto(false);
              }}
              className={cn(
                "flex w-full cursor-default items-center rounded-md px-2 py-1 text-left outline-hidden hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
