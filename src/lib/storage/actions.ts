"use server";

import { requireAuth } from "@/lib/auth/session";
import { signedUrl } from "./upload";

/**
 * Link assinado gerado na hora, sob demanda — usado pelos previews que só
 * buscam o arquivo quando o usuário clica pra abrir (ver foto-preview.tsx).
 * Evita o bug de abrir um modal com um link assinado gerado no carregamento
 * da página, que já pode ter expirado se a pessoa demorar pra clicar.
 */
export async function obterUrlAssinada(path: string) {
  await requireAuth();
  return signedUrl(path);
}
