export function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Formata progressivamente: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX (celular). */
export function formatTelefone(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, "($1");
  if (digits.length <= 6) return digits.replace(/(\d{2})(\d{0,4})/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

/** Só telefone fixo: DDD + 8 dígitos, formato (XX) XXXX-XXXX — sem o 9 extra do celular. */
export function formatTelefoneFixo(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, "($1");
  if (digits.length <= 6) return digits.replace(/(\d{2})(\d{0,4})/, "($1) $2");
  return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
}

export function formatCep(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 8);
  if (digits.length <= 5) return digits;
  return digits.replace(/(\d{5})(\d{0,3})/, "$1-$2");
}
