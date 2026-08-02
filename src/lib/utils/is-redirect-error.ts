/**
 * Server actions bem-sucedidas terminam com `redirect()`, que funciona
 * lançando uma exceção especial (digest começando com "NEXT_REDIRECT") pro
 * Next.js interceptar. Ao envolver a chamada da action num try/catch pra
 * mostrar erro de validação inline, é preciso deixar essa exceção passar
 * direto — senão o redirecionamento de sucesso vira "erro" na tela.
 */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
