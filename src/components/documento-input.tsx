"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { onlyDigits, formatCpfCnpj, isValidCpf, isValidCnpj } from "@/lib/utils/documento";

type Tipo = "pf" | "pj" | "auto";

export function DocumentoInput({
  id,
  name,
  tipo = "auto",
  value,
  onChange,
  onValidChange,
  required = false,
  className,
}: {
  id: string;
  name: string;
  tipo?: Tipo;
  value: string;
  onChange: (valor: string) => void;
  onValidChange?: (valido: boolean) => void;
  required?: boolean;
  className?: string;
}) {
  const digits = onlyDigits(value);
  const ehCnpj = tipo === "pj" || (tipo === "auto" && digits.length > 11);
  const tamanhoEsperado = ehCnpj ? 14 : 11;
  const completo = digits.length === tamanhoEsperado;
  const documentoValido = completo && (ehCnpj ? isValidCnpj(digits) : isValidCpf(digits));
  const valido = digits.length === 0 ? !required : documentoValido;

  useEffect(() => {
    onValidChange?.(valido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valido]);

  // Só mostra se é válido ou não depois que todos os dígitos foram digitados.
  const mostrarStatus = completo;

  return (
    <div>
      <Input
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(formatCpfCnpj(e.target.value))}
        aria-invalid={mostrarStatus && !documentoValido}
        className={className}
      />
      {mostrarStatus && (
        <p
          className={`mt-1 flex items-center gap-1 text-xs ${documentoValido ? "text-green-600" : "text-red-600"}`}
        >
          {documentoValido ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          {documentoValido ? `${ehCnpj ? "CNPJ" : "CPF"} válido.` : `${ehCnpj ? "CNPJ" : "CPF"} inválido.`}
        </p>
      )}
    </div>
  );
}
